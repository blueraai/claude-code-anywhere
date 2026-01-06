/**
 * SMS Bridge Server - HTTP server for Claude Code SMS integration
 */
/**
 * Bridge server instance
 */
export declare class BridgeServer {
    private server;
    private telnyxClient;
    private tunnelUrl;
    private startTime;
    private readonly port;
    private webhookPublicKey;
    constructor(port?: number);
    /**
     * Set the tunnel URL (called by tunnel module)
     */
    setTunnelUrl(url: string): void;
    /**
     * Get the tunnel URL
     */
    getTunnelUrl(): string | null;
    /**
     * Start the server
     */
    start(): Promise<void>;
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