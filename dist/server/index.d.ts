/**
 * SMS Bridge Server - HTTP server for Claude Code SMS integration
 *
 * Uses macOS Messages.app via imsg CLI for sending and receiving messages.
 */
/**
 * Bridge server instance
 */
export declare class BridgeServer {
    private server;
    private messagesClient;
    private startTime;
    private readonly port;
    constructor(port?: number);
    /**
     * Start the server
     */
    start(): Promise<void>;
    /**
     * Handle incoming message from Messages.app
     */
    private handleIncomingMessage;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
    /**
     * Get the route context for handlers
     */
    private getContext;
    /**
     * Handle incoming HTTP request
     */
    private handleRequest;
    /**
     * Print server startup banner
     */
    private printBanner;
}
/**
 * Create and export a default server instance
 */
export declare function createBridgeServer(port?: number): BridgeServer;
//# sourceMappingURL=index.d.ts.map