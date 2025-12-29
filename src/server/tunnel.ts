/**
 * Cloudflared tunnel integration for exposing the bridge server
 */

import { spawn, type ChildProcess } from 'child_process';
import { createWriteStream, existsSync, chmodSync } from 'fs';
import { mkdir } from 'fs/promises';
import { homedir, platform, arch } from 'os';
import { join } from 'path';
import type { Result } from '../shared/types.js';

const CLOUDFLARED_VERSION = '2024.12.2';

/**
 * Get the cloudflared binary path
 */
function getCloudflaredPath(): string {
  const home = homedir();
  const binDir = join(home, '.claude', 'claude-sms', 'bin');
  const ext = platform() === 'win32' ? '.exe' : '';
  return join(binDir, `cloudflared${ext}`);
}

/**
 * Get the download URL for cloudflared
 */
function getDownloadUrl(): string {
  const os = platform();
  const architecture = arch();

  let osName: string;
  let archName: string;

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
async function downloadCloudflared(): Promise<Result<string, string>> {
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
        error: `Failed to download cloudflared: ${response.status} ${response.statusText}`,
      };
    }

    const buffer = await response.arrayBuffer();
    const writeStream = createWriteStream(cloudflaredPath);

    await new Promise<void>((resolve, reject) => {
      writeStream.write(Buffer.from(buffer), (err) => {
        if (err !== undefined && err !== null) {
          reject(err);
        } else {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Failed to download cloudflared: ${message}` };
  }
}

/**
 * Ensure cloudflared is available
 */
async function ensureCloudflared(): Promise<Result<string, string>> {
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
  private process: ChildProcess | null = null;
  private tunnelUrl: string | null = null;
  private port: number;
  private onUrlCallback: ((url: string) => void) | null = null;

  constructor(port: number) {
    this.port = port;
  }

  /**
   * Set callback for when tunnel URL is available
   */
  onUrl(callback: (url: string) => void): void {
    this.onUrlCallback = callback;
  }

  /**
   * Start the tunnel
   */
  async start(): Promise<Result<string, string>> {
    // Ensure cloudflared is downloaded
    const ensureResult = await ensureCloudflared();
    if (!ensureResult.success) {
      return ensureResult;
    }

    const cloudflaredPath = ensureResult.data;

    return new Promise((resolve) => {
      console.log(`[tunnel] Starting cloudflared tunnel on port ${this.port}`);

      this.process = spawn(cloudflaredPath, ['tunnel', '--url', `http://localhost:${this.port}`], {
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
      this.process.stderr?.on('data', (data: Buffer) => {
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

      this.process.stdout?.on('data', (data: Buffer) => {
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
        console.log(`[tunnel] Process exited with code ${code ?? 'null'}`);
        this.process = null;
        this.tunnelUrl = null;
      });
    });
  }

  /**
   * Stop the tunnel
   */
  stop(): void {
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
  getUrl(): string | null {
    return this.tunnelUrl;
  }

  /**
   * Check if tunnel is running
   */
  isRunning(): boolean {
    return this.process !== null;
  }
}

/**
 * Create a new tunnel instance
 */
export function createTunnel(port: number): CloudflaredTunnel {
  return new CloudflaredTunnel(port);
}
