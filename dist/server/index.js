/**
 * Bridge Server - HTTP server for Claude Code multi-channel notifications
 *
 * Supports multiple channels: Email (SMTP/IMAP), Telegram
 */
// Load .env file if present (for development)
import 'dotenv/config';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { createServer } from 'http';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ChannelManager } from './channels.js';
import { EmailClient } from './email.js';
import { handleSendEmail, handleRegisterSession, handleGetResponse, handleEnableSession, handleDisableSession, handleEnableGlobal, handleDisableGlobal, handleCheckActive, handleStatus, handleRoot, } from './routes.js';
import { sessionManager } from './sessions.js';
import { TelegramClient } from './telegram.js';
import { loadEmailConfig, loadTelegramConfig } from '../shared/config.js';
import { ConfigError, ServerError } from '../shared/errors.js';
import { createLogger } from '../shared/logger.js';
const log = createLogger('server');
const DEFAULT_PORT = 3847;
// Port file locations
const __dirname = dirname(fileURLToPath(import.meta.url));
// Plugin-local port file (for internal use)
const PORT_FILE_PATH = join(__dirname, '..', '..', 'port');
// Config port file (canonical location for statusline and external tools)
const CONFIG_DIR = join(homedir(), '.config', 'claude-code-anywhere');
const CONFIG_PORT_FILE_PATH = join(CONFIG_DIR, 'port');
/**
 * Bridge server instance
 */
export class BridgeServer {
    server = null;
    emailClient = null;
    channelManager = null;
    startTime = 0;
    port;
    constructor(port = DEFAULT_PORT) {
        this.port = port;
    }
    /**
     * Start the server
     */
    async start() {
        this.channelManager = new ChannelManager();
        const enabledChannels = [];
        // Load Email config (required)
        const emailConfigResult = loadEmailConfig();
        if (!emailConfigResult.success) {
            throw new ConfigError(emailConfigResult.error, 'email');
        }
        this.emailClient = new EmailClient(emailConfigResult.data);
        this.channelManager.register(this.emailClient);
        enabledChannels.push('email');
        // Load Telegram config (optional - only add if configured)
        const telegramConfigResult = loadTelegramConfig();
        if (telegramConfigResult.success) {
            const telegramClient = new TelegramClient(telegramConfigResult.data);
            this.channelManager.register(telegramClient);
            enabledChannels.push('telegram');
            log.info('Telegram channel configured');
        }
        else {
            log.info('Telegram channel not configured (optional)');
        }
        // Initialize all registered channels
        await this.channelManager.initializeAll();
        this.startTime = Date.now();
        // Start session cleanup
        sessionManager.start();
        // Start polling on all channels
        this.channelManager.startAllPolling(async (response) => {
            await this.handleIncomingResponse(response);
        });
        // Create HTTP server
        this.server = createServer((req, res) => {
            void this.handleRequest(req, res);
        });
        // Start listening
        await new Promise((resolve, reject) => {
            this.server?.listen(this.port, () => {
                resolve();
            });
            this.server?.on('error', reject);
        });
        // Get actual port (handles port 0 for dynamic assignment)
        const address = this.server.address();
        const actualPort = address !== null && typeof address === 'object' ? address.port : this.port;
        // Write port files so hooks and statusline can discover the server
        writeFileSync(PORT_FILE_PATH, String(actualPort), 'utf-8');
        log.info(`Port file written to ${PORT_FILE_PATH}`);
        // Also write to config dir (canonical location for external tools)
        if (!existsSync(CONFIG_DIR)) {
            mkdirSync(CONFIG_DIR, { recursive: true });
        }
        writeFileSync(CONFIG_PORT_FILE_PATH, String(actualPort), 'utf-8');
        log.info(`Config port file written to ${CONFIG_PORT_FILE_PATH}`);
        this.printBanner(enabledChannels, actualPort);
    }
    /**
     * Handle incoming response from any channel
     */
    async handleIncomingResponse(response) {
        if (this.channelManager === null || this.emailClient === null)
            return;
        const { sessionId, response: responseText, channel } = response;
        log.info(`Incoming ${channel} response`, { sessionId, responseText });
        if (!sessionManager.hasSession(sessionId)) {
            const activeIds = sessionManager.getActiveSessionIds();
            if (activeIds.length === 0) {
                await this.emailClient.sendEmail('Session Expired', `Session CC-${sessionId} expired. No active sessions.`);
            }
            else {
                const idList = activeIds.map((id) => `CC-${id}`).join(', ');
                await this.emailClient.sendErrorResponse(`Session CC-${sessionId} expired or not found. Active: ${idList}`);
            }
            return;
        }
        // Store the response
        sessionManager.storeResponse(sessionId, responseText, channel);
        log.info(`Response stored for session ${sessionId} via ${channel}`);
        // Sync response to other channels (so all channels show the conversation)
        // Wrapped in try-catch to prevent sync failures from crashing the response handler
        try {
            await this.channelManager.syncResponseToOtherChannels(sessionId, responseText, channel);
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            log.error(`Failed to sync response to other channels: ${errMsg}`);
        }
    }
    /**
     * Stop the server
     */
    async stop() {
        sessionManager.stop();
        // Clean up port files
        try {
            unlinkSync(PORT_FILE_PATH);
            log.info('Port file removed');
        }
        catch {
            // Ignore if file doesn't exist
        }
        try {
            unlinkSync(CONFIG_PORT_FILE_PATH);
            log.info('Config port file removed');
        }
        catch {
            // Ignore if file doesn't exist
        }
        if (this.channelManager !== null) {
            this.channelManager.disposeAll();
            this.channelManager = null;
            this.emailClient = null;
        }
        if (this.server !== null) {
            await new Promise((resolve) => {
                this.server?.close(() => {
                    resolve();
                });
            });
            this.server = null;
        }
    }
    /**
     * Get the route context for handlers
     */
    getContext() {
        if (this.channelManager === null) {
            throw new ServerError('Server not started');
        }
        return {
            channelManager: this.channelManager,
            startTime: this.startTime,
        };
    }
    /**
     * Handle incoming HTTP request
     */
    async handleRequest(req, res) {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        const method = req.method ?? 'GET';
        if (method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        try {
            const url = new URL(req.url ?? '/', `http://localhost:${String(this.port)}`);
            const path = url.pathname;
            const ctx = this.getContext();
            // POST /api/send
            if (path === '/api/send' && method === 'POST') {
                await handleSendEmail(req, res, ctx);
                return;
            }
            // POST /api/session
            if (path === '/api/session' && method === 'POST') {
                await handleRegisterSession(req, res, ctx);
                return;
            }
            // GET /api/response/:sessionId
            const responseMatch = path.match(/^\/api\/response\/([a-f0-9-]+)$/i);
            if (responseMatch !== null && method === 'GET') {
                const sessionId = responseMatch[1];
                if (sessionId === undefined) {
                    throw new ServerError('Unexpected: sessionId undefined after regex match');
                }
                handleGetResponse(req, res, sessionId);
                return;
            }
            // POST /api/session/:id/enable
            const enableMatch = path.match(/^\/api\/session\/([a-f0-9-]+)\/enable$/i);
            if (enableMatch !== null && method === 'POST') {
                const sessionId = enableMatch[1];
                if (sessionId === undefined) {
                    throw new ServerError('Unexpected: sessionId undefined after regex match');
                }
                handleEnableSession(req, res, sessionId);
                return;
            }
            // POST /api/session/:id/disable
            const disableMatch = path.match(/^\/api\/session\/([a-f0-9-]+)\/disable$/i);
            if (disableMatch !== null && method === 'POST') {
                const sessionId = disableMatch[1];
                if (sessionId === undefined) {
                    throw new ServerError('Unexpected: sessionId undefined after regex match');
                }
                handleDisableSession(req, res, sessionId);
                return;
            }
            // POST /api/enable
            if (path === '/api/enable' && method === 'POST') {
                handleEnableGlobal(req, res);
                return;
            }
            // POST /api/disable
            if (path === '/api/disable' && method === 'POST') {
                handleDisableGlobal(req, res);
                return;
            }
            // GET /api/active?sessionId=xxx
            if (path === '/api/active' && method === 'GET') {
                const sessionId = url.searchParams.get('sessionId') ?? '';
                handleCheckActive(req, res, sessionId);
                return;
            }
            // GET /api/status
            if (path === '/api/status' && method === 'GET') {
                handleStatus(req, res, ctx);
                return;
            }
            // GET /
            if (path === '/' && method === 'GET') {
                handleRoot(req, res);
                return;
            }
            // 404
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
        }
        catch (error) {
            log.error('Error handling request', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    }
    /**
     * Print server startup banner
     */
    printBanner(enabledChannels, actualPort) {
        log.info(`Server started on port ${String(actualPort)}`);
        const channelsStr = enabledChannels.join(', ');
        // eslint-disable-next-line no-console -- Intentional user-facing banner output
        console.log(`
╔════════════════════════════════════════════════════════════════╗
║           Claude Code Anywhere - Bridge Server                 ║
╠════════════════════════════════════════════════════════════════╣
║  Channels: ${channelsStr.padEnd(52)}║
║  Listening on port ${actualPort.toString().padEnd(40)}║
║  Logs: logs/MM-DD-YY.log                                       ║
║                                                                ║
║  Endpoints:                                                    ║
║  • POST /api/send        - Send notification from hooks        ║
║  • POST /api/session     - Register session for response       ║
║  • GET  /api/response/:id - Poll for response                  ║
║  • GET  /api/status      - Server health check                 ║
╚════════════════════════════════════════════════════════════════╝
`);
    }
}
/**
 * Create and export a default server instance
 */
export function createBridgeServer(port) {
    return new BridgeServer(port);
}
//# sourceMappingURL=index.js.map