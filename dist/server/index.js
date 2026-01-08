/**
 * Email Bridge Server - HTTP server for Claude Code email integration
 *
 * Uses Gmail SMTP/IMAP for sending and receiving messages.
 */
import { createServer } from 'http';
import { loadEmailConfig } from '../shared/config.js';
import { sessionManager } from './sessions.js';
import { EmailClient } from './email.js';
import { handleSendEmail, handleRegisterSession, handleGetResponse, handleEnableSession, handleDisableSession, handleCheckSessionEnabled, handleEnableGlobal, handleDisableGlobal, handleStatus, handleRoot, } from './routes.js';
import { createLogger } from '../shared/logger.js';
const log = createLogger('server');
const DEFAULT_PORT = 3847;
/**
 * Bridge server instance
 */
export class BridgeServer {
    server = null;
    emailClient = null;
    startTime = 0;
    port;
    constructor(port = DEFAULT_PORT) {
        this.port = port;
    }
    /**
     * Start the server
     */
    async start() {
        // Load Email config
        const configResult = loadEmailConfig();
        if (!configResult.success) {
            throw new Error(configResult.error);
        }
        this.emailClient = new EmailClient(configResult.data);
        // Initialize the Email client
        const initResult = this.emailClient.initialize();
        if (!initResult.success) {
            throw new Error(initResult.error);
        }
        this.startTime = Date.now();
        // Start session cleanup
        sessionManager.start();
        // Start polling for incoming emails
        this.emailClient.startPolling((message) => {
            void this.handleIncomingMessage(message);
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
        this.printBanner();
    }
    /**
     * Handle incoming message from email
     */
    async handleIncomingMessage(message) {
        if (this.emailClient === null)
            return;
        const { sessionId, response } = message;
        log.info('Incoming email', { sessionId: sessionId ?? 'none', response });
        if (sessionId === null) {
            // Can't determine which session
            const activeIds = sessionManager.getActiveSessionIds();
            if (activeIds.length === 0) {
                log.info('No active sessions, sending notification');
                await this.emailClient.sendEmail('No Active Sessions', 'No active Claude Code sessions.');
            }
            else if (activeIds.length === 1) {
                // Single session - auto-route the message
                const singleSessionId = activeIds[0];
                if (singleSessionId !== undefined) {
                    sessionManager.storeResponse(singleSessionId, response, 'email');
                    log.info(`Response stored for session ${singleSessionId} (auto-routed)`);
                    await this.emailClient.sendConfirmation(singleSessionId);
                }
            }
            else {
                const idList = activeIds.map((id) => `CC-${id}`).join(', ');
                await this.emailClient.sendEmail('Multiple Sessions Active', `Multiple sessions active. Reply with [CC-ID] in subject. Active: ${idList}`);
            }
            return;
        }
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
        sessionManager.storeResponse(sessionId, response, 'email');
        log.info(`Response stored for session ${sessionId}`);
        await this.emailClient.sendConfirmation(sessionId);
    }
    /**
     * Stop the server
     */
    async stop() {
        sessionManager.stop();
        if (this.emailClient !== null) {
            this.emailClient.dispose();
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
        if (this.emailClient === null) {
            throw new Error('Server not started');
        }
        return {
            emailClient: this.emailClient,
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
            const responseMatch = path.match(/^\/api\/response\/([a-f0-9]+)$/i);
            if (responseMatch !== null && method === 'GET') {
                const sessionId = responseMatch[1];
                if (sessionId !== undefined) {
                    handleGetResponse(req, res, sessionId);
                }
                return;
            }
            // POST /api/session/:id/enable
            const enableMatch = path.match(/^\/api\/session\/([a-f0-9]+)\/enable$/i);
            if (enableMatch !== null && method === 'POST') {
                const sessionId = enableMatch[1];
                if (sessionId !== undefined) {
                    handleEnableSession(req, res, sessionId);
                }
                return;
            }
            // POST /api/session/:id/disable
            const disableMatch = path.match(/^\/api\/session\/([a-f0-9]+)\/disable$/i);
            if (disableMatch !== null && method === 'POST') {
                const sessionId = disableMatch[1];
                if (sessionId !== undefined) {
                    handleDisableSession(req, res, sessionId);
                }
                return;
            }
            // GET /api/session/:id/enabled
            const enabledMatch = path.match(/^\/api\/session\/([a-f0-9]+)\/enabled$/i);
            if (enabledMatch !== null && method === 'GET') {
                const sessionId = enabledMatch[1];
                if (sessionId !== undefined) {
                    handleCheckSessionEnabled(req, res, sessionId);
                }
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
    printBanner() {
        log.info(`Server started on port ${String(this.port)}`);
        console.log(`
╔════════════════════════════════════════════════════════════════╗
║           Claude Code Email Bridge Server                      ║
╠════════════════════════════════════════════════════════════════╣
║  Using Gmail SMTP/IMAP                                         ║
║  Listening on port ${this.port.toString().padEnd(40)}║
║  Logs: logs/MM-DD-YY.log                                       ║
║                                                                ║
║  Endpoints:                                                    ║
║  • POST /api/send        - Send email from hooks               ║
║  • POST /api/session     - Register session for response       ║
║  • GET  /api/response/:id - Poll for email response            ║
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