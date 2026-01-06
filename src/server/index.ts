/**
 * SMS Bridge Server - HTTP server for Claude Code SMS integration
 */

import { createServer } from 'http';
import type { IncomingMessage, ServerResponse, Server } from 'http';
import { loadTelnyxConfig } from '../shared/config.js';
import { sessionManager } from './sessions.js';
import { TelnyxClient } from './telnyx.js';
import {
  handleTelnyxWebhook,
  handleSendSMS,
  handleRegisterSession,
  handleGetResponse,
  handleEnableSession,
  handleDisableSession,
  handleCheckSessionEnabled,
  handleEnableGlobal,
  handleDisableGlobal,
  handleStatus,
  handleRoot,
  type RouteContext,
} from './routes.js';

const DEFAULT_PORT = 3847;

/**
 * Bridge server instance
 */
export class BridgeServer {
  private server: Server | null = null;
  private telnyxClient: TelnyxClient | null = null;
  private tunnelUrl: string | null = null;
  private startTime: number = 0;
  private readonly port: number;
  private webhookPublicKey: string = '';

  constructor(port: number = DEFAULT_PORT) {
    this.port = port;
  }

  /**
   * Set the tunnel URL (called by tunnel module)
   */
  setTunnelUrl(url: string): void {
    this.tunnelUrl = url;
  }

  /**
   * Get the tunnel URL
   */
  getTunnelUrl(): string | null {
    return this.tunnelUrl;
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    // Load Telnyx config
    const configResult = loadTelnyxConfig();
    if (!configResult.success) {
      throw new Error(configResult.error);
    }

    this.telnyxClient = new TelnyxClient(configResult.data);
    this.webhookPublicKey = configResult.data.webhookPublicKey;
    this.startTime = Date.now();

    // Start session cleanup
    sessionManager.start();

    // Create HTTP server
    this.server = createServer((req, res) => {
      void this.handleRequest(req, res);
    });

    // Start listening
    await new Promise<void>((resolve, reject) => {
      this.server?.listen(this.port, () => {
        resolve();
      });
      this.server?.on('error', reject);
    });

    this.printBanner();
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    sessionManager.stop();

    if (this.server !== null) {
      await new Promise<void>((resolve) => {
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
  private getContext(): RouteContext {
    if (this.telnyxClient === null) {
      throw new Error('Server not started');
    }
    return {
      telnyxClient: this.telnyxClient,
      tunnelUrl: this.tunnelUrl,
      startTime: this.startTime,
      webhookPublicKey: this.webhookPublicKey,
    };
  }

  /**
   * Handle incoming HTTP request
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
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

      // POST /webhook/telnyx
      if (path === '/webhook/telnyx' && method === 'POST') {
        await handleTelnyxWebhook(req, res, ctx);
        return;
      }

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
    } catch (error) {
      console.error('[server] Error handling request:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  /**
   * Print server startup banner
   */
  private printBanner(): void {
    const tunnelInfo = this.tunnelUrl !== null ? `Tunnel: ${this.tunnelUrl}` : 'Tunnel: Not active';

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║           Claude Code SMS Bridge Server                        ║
╠════════════════════════════════════════════════════════════════╣
║  Listening on port ${this.port.toString().padEnd(40)}║
║  ${tunnelInfo.padEnd(58)}║
║                                                                ║
║  Endpoints:                                                    ║
║  • POST /webhook/telnyx  - Configure in Telnyx portal          ║
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
export function createBridgeServer(port?: number): BridgeServer {
  return new BridgeServer(port);
}
