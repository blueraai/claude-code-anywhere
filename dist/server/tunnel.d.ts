/**
 * Cloudflared tunnel integration for exposing the bridge server
 *
 * Supports two modes:
 * 1. Quick tunnel (default): Random URL, no setup required
 * 2. Persistent tunnel: Fixed URL, requires one-time Cloudflare setup
 *
 * Set CLOUDFLARE_TUNNEL_ID and CLOUDFLARE_TUNNEL_URL env vars for persistent URL.
 */
import type { Result } from '../shared/types.js';
/**
 * Tunnel configuration from environment
 */
export interface TunnelConfig {
    mode: 'quick' | 'named';
    name?: string;
    url?: string;
}
/**
 * Get tunnel configuration from environment
 *
 * For persistent tunnel URLs:
 * 1. Create tunnel: cloudflared tunnel create my-tunnel
 * 2. Configure DNS in Cloudflare dashboard
 * 3. Set CLOUDFLARE_TUNNEL_ID=my-tunnel
 * 4. Set CLOUDFLARE_TUNNEL_URL=https://my-tunnel.example.com
 */
export declare function getTunnelConfig(): TunnelConfig;
/**
 * Cloudflared tunnel manager
 */
export declare class CloudflaredTunnel {
    private process;
    private tunnelUrl;
    private readonly port;
    private onUrlCallback;
    constructor(port: number);
    /**
     * Set callback for when tunnel URL is available
     */
    onUrl(callback: (url: string) => void): void;
    /**
     * Start the tunnel
     */
    start(): Promise<Result<string, string>>;
    /**
     * Start a quick tunnel (random URL)
     */
    private startQuickTunnel;
    /**
     * Start a persistent tunnel (fixed URL)
     */
    private startPersistentTunnel;
    /**
     * Stop the tunnel
     */
    stop(): void;
    /**
     * Get the current tunnel URL
     */
    getUrl(): string | null;
    /**
     * Check if tunnel is running
     */
    isRunning(): boolean;
}
/**
 * Create a new tunnel instance
 */
export declare function createTunnel(port: number): CloudflaredTunnel;
//# sourceMappingURL=tunnel.d.ts.map