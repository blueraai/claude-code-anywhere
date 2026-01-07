/**
 * SMS Bridge Server - HTTP server for Claude Code SMS integration
 *
 * Uses macOS Messages.app via imsg CLI for sending and receiving messages.
 */
import { createServer } from 'http';
import { loadMessagesConfig } from '../shared/config.js';
import { sessionManager } from './sessions.js';
import { MessagesClient } from './messages.js';
import { handleSendSMS, handleRegisterSession, handleGetResponse, handleEnableSession, handleDisableSession, handleCheckSessionEnabled, handleEnableGlobal, handleDisableGlobal, handleStatus, handleRoot, } from './routes.js';
const DEFAULT_PORT = 3847;
/**
 * Bridge server instance
 */
export class BridgeServer {
    server = null;
    messagesClient = null;
    startTime = 0;
    port;
    constructor(port = DEFAULT_PORT) {
        this.port = port;
    }
    /**
     * Start the server
     */
    async start() {
        // Load Messages config
        const configResult = loadMessagesConfig();
        if (!configResult.success) {
            throw new Error(configResult.error);
        }
        this.messagesClient = new MessagesClient(configResult.data);
        // Initialize the Messages client
        const initResult = this.messagesClient.initialize();
        if (!initResult.success) {
            throw new Error(initResult.error);
        }
        this.startTime = Date.now();
        // Start session cleanup
        sessionManager.start();
        // Start polling for incoming messages
        this.messagesClient.startPolling((message) => {
            this.handleIncomingMessage(message);
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
     * Handle incoming message from Messages.app
     */
    handleIncomingMessage(message) {
        if (this.messagesClient === null)
            return;
        const { sessionId, response } = message;
        console.log(`[server] Incoming message: sessionId=${sessionId ?? 'none'}, response="${response}"`);
        if (sessionId === null) {
            // Can't determine which session
            const activeIds = sessionManager.getActiveSessionIds();
            if (activeIds.length === 0) {
                this.messagesClient.sendMessage('No active Claude Code sessions.');
            }
            else if (activeIds.length === 1) {
                // Single session - auto-route the message
                const singleSessionId = activeIds[0];
                if (singleSessionId !== undefined) {
                    sessionManager.storeResponse(singleSessionId, response, 'messages');
                    console.log(`[server] Response stored for session ${singleSessionId} (auto-routed)`);
                    this.messagesClient.sendConfirmation(singleSessionId);
                }
            }
            else {
                const idList = activeIds.map((id) => `CC-${id}`).join(', ');
                this.messagesClient.sendMessage(`Multiple sessions active. Reply with [CC-ID] prefix. Active: ${idList}`);
            }
            return;
        }
        if (!sessionManager.hasSession(sessionId)) {
            const activeIds = sessionManager.getActiveSessionIds();
            if (activeIds.length === 0) {
                this.messagesClient.sendMessage(`Session CC-${sessionId} expired. No active sessions.`);
            }
            else {
                const idList = activeIds.map((id) => `CC-${id}`).join(', ');
                this.messagesClient.sendErrorResponse(`Session CC-${sessionId} expired or not found. Active: ${idList}`);
            }
            return;
        }
        // Store the response
        sessionManager.storeResponse(sessionId, response, 'messages');
        console.log(`[server] Response stored for session ${sessionId}`);
        this.messagesClient.sendConfirmation(sessionId);
    }
    /**
     * Stop the server
     */
    async stop() {
        sessionManager.stop();
        if (this.messagesClient !== null) {
            this.messagesClient.dispose();
            this.messagesClient = null;
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
        if (this.messagesClient === null) {
            throw new Error('Server not started');
        }
        return {
            messagesClient: this.messagesClient,
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
                await handleSendSMS(req, res, ctx);
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
            console.error('[server] Error handling request:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    }
    /**
     * Print server startup banner
     */
    printBanner() {
        console.log(`
╔════════════════════════════════════════════════════════════════╗
║           Claude Code SMS Bridge Server                        ║
╠════════════════════════════════════════════════════════════════╣
║  Using macOS Messages.app (via imsg)                           ║
║  Listening on port ${this.port.toString().padEnd(40)}║
║                                                                ║
║  Endpoints:                                                    ║
║  • POST /api/send        - Send SMS from hooks                 ║
║  • POST /api/session     - Register session for response       ║
║  • GET  /api/response/:id - Poll for SMS response              ║
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