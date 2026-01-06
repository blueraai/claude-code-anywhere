/**
 * Cloudflared tunnel integration for exposing the bridge server
 *
 * Supports two modes:
 * 1. Quick tunnel (default): Random URL, no setup required
 * 2. Persistent tunnel: Fixed URL, requires one-time Cloudflare setup
 *
 * Set CLOUDFLARE_TUNNEL_ID and CLOUDFLARE_TUNNEL_URL env vars for persistent URL.
 */
import { spawn } from 'child_process';
import { createWriteStream, existsSync, chmodSync } from 'fs';
import { mkdir } from 'fs/promises';
import { homedir, platform, arch } from 'os';
import { join } from 'path';
/**
 * Get tunnel configuration from environment
 *
 * For persistent tunnel URLs:
 * 1. Create tunnel: cloudflared tunnel create my-tunnel
 * 2. Configure DNS in Cloudflare dashboard
 * 3. Set CLOUDFLARE_TUNNEL_ID=my-tunnel
 * 4. Set CLOUDFLARE_TUNNEL_URL=https://my-tunnel.example.com
 */
export function getTunnelConfig() {
    const tunnelId = process.env['CLOUDFLARE_TUNNEL_ID'];
    const tunnelUrl = process.env['CLOUDFLARE_TUNNEL_URL'];
    if (tunnelId !== undefined && tunnelId !== '') {
        const config = {
            mode: 'named',
            name: tunnelId,
        };
        if (tunnelUrl !== undefined && tunnelUrl !== '') {
            config.url = tunnelUrl;
        }
        return config;
    }
    return { mode: 'quick' };
}
const CLOUDFLARED_VERSION = '2024.12.2';
/**
 * Get the cloudflared binary path
 */
function getCloudflaredPath() {
    const home = homedir();
    const binDir = join(home, '.claude', 'claude-sms', 'bin');
    const ext = platform() === 'win32' ? '.exe' : '';
    return join(binDir, `cloudflared${ext}`);
}
/**
 * Get the download URL for cloudflared
 */
function getDownloadUrl() {
    const os = platform();
    const architecture = arch();
    let osName;
    let archName;
    switch (os) {
        case 'linux':
            osName = 'linux';
            break;
        case 'darwin':
            osName = 'darwin';
            break;
        case 'win32':
            osName = 'windows';
            break;
        default:
            throw new Error(`Unsupported OS: ${os}`);
    }
    switch (architecture) {
        case 'x64':
            archName = 'amd64';
            break;
        case 'arm64':
            archName = 'arm64';
            break;
        case 'arm':
            archName = 'arm';
            break;
        default:
            throw new Error(`Unsupported architecture: ${architecture}`);
    }
    const ext = os === 'win32' ? '.exe' : '';
    return `https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/cloudflared-${osName}-${archName}${ext}`;
}
/**
 * Download cloudflared binary
 */
async function downloadCloudflared() {
    const cloudflaredPath = getCloudflaredPath();
    const binDir = join(cloudflaredPath, '..');
    try {
        // Create bin directory if needed
        if (!existsSync(binDir)) {
            await mkdir(binDir, { recursive: true });
        }
        const url = getDownloadUrl();
        console.log(`[tunnel] Downloading cloudflared from ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
            return {
                success: false,
                error: `Failed to download cloudflared: ${String(response.status)} ${response.statusText}`,
            };
        }
        const buffer = await response.arrayBuffer();
        const writeStream = createWriteStream(cloudflaredPath);
        await new Promise((resolve, reject) => {
            writeStream.write(Buffer.from(buffer), (err) => {
                if (err !== undefined && err !== null) {
                    reject(err);
                }
                else {
                    writeStream.end(() => {
                        resolve();
                    });
                }
            });
        });
        // Make executable on Unix
        if (platform() !== 'win32') {
            chmodSync(cloudflaredPath, 0o755);
        }
        console.log(`[tunnel] Downloaded cloudflared to ${cloudflaredPath}`);
        return { success: true, data: cloudflaredPath };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: `Failed to download cloudflared: ${message}` };
    }
}
/**
 * Ensure cloudflared is available
 */
async function ensureCloudflared() {
    const cloudflaredPath = getCloudflaredPath();
    if (existsSync(cloudflaredPath)) {
        return { success: true, data: cloudflaredPath };
    }
    return downloadCloudflared();
}
/**
 * Cloudflared tunnel manager
 */
export class CloudflaredTunnel {
    process = null;
    tunnelUrl = null;
    port;
    onUrlCallback = null;
    constructor(port) {
        this.port = port;
    }
    /**
     * Set callback for when tunnel URL is available
     */
    onUrl(callback) {
        this.onUrlCallback = callback;
    }
    /**
     * Start the tunnel
     */
    async start() {
        const config = getTunnelConfig();
        // Ensure cloudflared is downloaded
        const ensureResult = await ensureCloudflared();
        if (!ensureResult.success) {
            return ensureResult;
        }
        const cloudflaredPath = ensureResult.data;
        if (config.mode === 'named' && config.name !== undefined) {
            return this.startPersistentTunnel(cloudflaredPath, config.name, config.url);
        }
        else {
            return this.startQuickTunnel(cloudflaredPath);
        }
    }
    /**
     * Start a quick tunnel (random URL)
     */
    startQuickTunnel(cloudflaredPath) {
        return new Promise((resolve) => {
            console.log(`[tunnel] Starting quick tunnel on port ${String(this.port)}`);
            this.process = spawn(cloudflaredPath, ['tunnel', '--url', `http://localhost:${String(this.port)}`], {
                stdio: ['ignore', 'pipe', 'pipe'],
            });
            let resolved = false;
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve({ success: false, error: 'Tunnel startup timeout' });
                }
            }, 30000);
            // Parse tunnel URL from stderr (cloudflared outputs URL there)
            this.process.stderr?.on('data', (data) => {
                const output = data.toString();
                // Look for the tunnel URL
                const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
                if (urlMatch !== null && !resolved) {
                    this.tunnelUrl = urlMatch[0];
                    console.log(`[tunnel] Tunnel URL: ${this.tunnelUrl}`);
                    if (this.onUrlCallback !== null) {
                        this.onUrlCallback(this.tunnelUrl);
                    }
                    resolved = true;
                    clearTimeout(timeout);
                    resolve({ success: true, data: this.tunnelUrl });
                }
                // Log other messages for debugging
                if (!output.includes('INF') || output.includes('error')) {
                    console.log(`[tunnel] ${output.trim()}`);
                }
            });
            this.process.stdout?.on('data', (data) => {
                console.log(`[tunnel] ${data.toString().trim()}`);
            });
            this.process.on('error', (error) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    resolve({ success: false, error: `Failed to start tunnel: ${error.message}` });
                }
            });
            this.process.on('exit', (code) => {
                console.log(`[tunnel] Process exited with code ${code !== null ? String(code) : 'null'}`);
                this.process = null;
                this.tunnelUrl = null;
            });
        });
    }
    /**
     * Start a persistent tunnel (fixed URL)
     */
    startPersistentTunnel(cloudflaredPath, tunnelName, tunnelUrl) {
        return new Promise((resolve) => {
            console.log(`[tunnel] Starting persistent tunnel "${tunnelName}" on port ${String(this.port)}`);
            if (tunnelUrl === undefined) {
                console.warn('[tunnel] Warning: CLOUDFLARE_TUNNEL_URL not set');
                console.warn('[tunnel] The webhook URL will not be displayed');
            }
            // Named tunnels need ingress rules - create a config
            // For simplicity, we use the --url flag with tunnel run which handles ingress
            this.process = spawn(cloudflaredPath, ['tunnel', 'run', '--url', `http://localhost:${String(this.port)}`, tunnelName], {
                stdio: ['ignore', 'pipe', 'pipe'],
            });
            let resolved = false;
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    // For named tunnels, success even without URL detection
                    if (tunnelUrl !== undefined) {
                        this.tunnelUrl = tunnelUrl;
                        if (this.onUrlCallback !== null) {
                            this.onUrlCallback(tunnelUrl);
                        }
                        resolve({ success: true, data: tunnelUrl });
                    }
                    else {
                        resolve({ success: false, error: 'Tunnel startup timeout and no URL configured' });
                    }
                }
            }, 15000);
            // For named tunnels, look for "Connection registered" or similar
            this.process.stderr?.on('data', (data) => {
                const output = data.toString();
                // Tunnel is ready when we see connection registered
                if ((output.includes('Registered tunnel connection') ||
                    output.includes('Connection registered')) &&
                    !resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    if (tunnelUrl !== undefined) {
                        this.tunnelUrl = tunnelUrl;
                        console.log(`[tunnel] Persistent tunnel ready: ${tunnelUrl}`);
                        if (this.onUrlCallback !== null) {
                            this.onUrlCallback(tunnelUrl);
                        }
                        resolve({ success: true, data: tunnelUrl });
                    }
                    else {
                        console.log('[tunnel] Persistent tunnel ready (URL not configured)');
                        resolve({ success: true, data: 'Persistent tunnel connected' });
                    }
                }
                // Log messages
                if (output.includes('ERR') || output.includes('error')) {
                    console.error(`[tunnel] ${output.trim()}`);
                }
                else if (!output.includes('INF')) {
                    console.log(`[tunnel] ${output.trim()}`);
                }
            });
            this.process.stdout?.on('data', (data) => {
                console.log(`[tunnel] ${data.toString().trim()}`);
            });
            this.process.on('error', (error) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    resolve({ success: false, error: `Failed to start tunnel: ${error.message}` });
                }
            });
            this.process.on('exit', (code) => {
                console.log(`[tunnel] Process exited with code ${code !== null ? String(code) : 'null'}`);
                this.process = null;
                this.tunnelUrl = null;
            });
        });
    }
    /**
     * Stop the tunnel
     */
    stop() {
        if (this.process !== null) {
            console.log('[tunnel] Stopping cloudflared tunnel');
            this.process.kill('SIGTERM');
            this.process = null;
            this.tunnelUrl = null;
        }
    }
    /**
     * Get the current tunnel URL
     */
    getUrl() {
        return this.tunnelUrl;
    }
    /**
     * Check if tunnel is running
     */
    isRunning() {
        return this.process !== null;
    }
}
/**
 * Create a new tunnel instance
 */
export function createTunnel(port) {
    return new CloudflaredTunnel(port);
}
//# sourceMappingURL=tunnel.js.map