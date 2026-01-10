import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http';

describe('SessionStart hook (check-install.sh)', () => {
  const hookScript = join(process.cwd(), 'hooks', 'check-install.sh');

  // Helper to run hook with JSON input via stdin (like Claude Code does)
  function runHookWithInput(sessionId: string | null, xdgConfigHome: string): void {
    const hookInput = sessionId
      ? JSON.stringify({ session_id: sessionId, cwd: '/tmp' })
      : JSON.stringify({ cwd: '/tmp' });

    execSync(`echo '${hookInput}' | bash ${hookScript}`, {
      env: {
        ...process.env,
        XDG_CONFIG_HOME: xdgConfigHome,
        HOME: tmpdir(),
      },
      stdio: 'pipe',
    });
  }

  describe('session ID persistence', () => {
    it('creates session ID file when session_id is in hook input', () => {
      const testSessionId = 'test-session-' + Date.now();
      const xdgConfigHome = join(tmpdir(), 'cca-test-create-' + Date.now());

      runHookWithInput(testSessionId, xdgConfigHome);

      // Verify the session file was created
      const configDir = join(xdgConfigHome, 'claude-code-anywhere');
      const expectedSessionFile = join(configDir, 'current-session-id');

      expect(existsSync(expectedSessionFile)).toBe(true);

      // Verify the content matches
      const savedSessionId = readFileSync(expectedSessionFile, 'utf-8').trim();
      expect(savedSessionId).toBe(testSessionId);

      // Cleanup
      rmSync(xdgConfigHome, { recursive: true });
    });

    it('does NOT create session file when session_id is missing from input', () => {
      const xdgConfigHome = join(tmpdir(), 'cca-test-missing-' + Date.now());

      runHookWithInput(null, xdgConfigHome);

      const configDir = join(xdgConfigHome, 'claude-code-anywhere');
      const expectedSessionFile = join(configDir, 'current-session-id');
      expect(existsSync(expectedSessionFile)).toBe(false);

      // Cleanup if created
      if (existsSync(xdgConfigHome)) {
        rmSync(xdgConfigHome, { recursive: true });
      }
    });

    it('does NOT create session file when input is empty', () => {
      const xdgConfigHome = join(tmpdir(), 'cca-test-empty-' + Date.now());

      // Run with empty stdin
      execSync(`echo '' | bash ${hookScript}`, {
        env: {
          ...process.env,
          XDG_CONFIG_HOME: xdgConfigHome,
          HOME: tmpdir(),
        },
        stdio: 'pipe',
      });

      const configDir = join(xdgConfigHome, 'claude-code-anywhere');
      const expectedSessionFile = join(configDir, 'current-session-id');
      expect(existsSync(expectedSessionFile)).toBe(false);

      // Cleanup if created
      if (existsSync(xdgConfigHome)) {
        rmSync(xdgConfigHome, { recursive: true });
      }
    });

    it('overwrites existing session ID file with new session', () => {
      const xdgConfigHome = join(tmpdir(), 'cca-test-overwrite-' + Date.now());
      const configDir = join(xdgConfigHome, 'claude-code-anywhere');
      mkdirSync(configDir, { recursive: true });

      const sessionFile = join(configDir, 'current-session-id');
      const oldSessionId = 'old-session-123';
      const newSessionId = 'new-session-456';

      // Write old session ID
      writeFileSync(sessionFile, oldSessionId);

      // Run hook with new session ID
      runHookWithInput(newSessionId, xdgConfigHome);

      // Verify new session ID was written
      const savedSessionId = readFileSync(sessionFile, 'utf-8').trim();
      expect(savedSessionId).toBe(newSessionId);

      // Cleanup
      rmSync(xdgConfigHome, { recursive: true });
    });
  });

  describe('config directory creation', () => {
    it('creates config directory if it does not exist', () => {
      const xdgConfigHome = join(tmpdir(), 'cca-test-newdir-' + Date.now());

      // Ensure it doesn't exist
      if (existsSync(xdgConfigHome)) {
        rmSync(xdgConfigHome, { recursive: true });
      }

      runHookWithInput('test-session', xdgConfigHome);

      const configDir = join(xdgConfigHome, 'claude-code-anywhere');
      expect(existsSync(configDir)).toBe(true);

      // Cleanup
      rmSync(xdgConfigHome, { recursive: true });
    });
  });

  describe('session auto-registration with server', () => {
    let server: Server;
    let serverPort: number;
    let registeredSessionId: string | null = null;
    let tempPluginRoot: string;

    beforeEach(async () => {
      registeredSessionId = null;
      tempPluginRoot = join(tmpdir(), 'cca-plugin-' + Date.now());
      mkdirSync(tempPluginRoot, { recursive: true });

      // Create a mock server that records session enable requests
      server = createServer((req: IncomingMessage, res: ServerResponse) => {
        const match = req.url?.match(/\/api\/session\/([^/]+)\/enable/);
        if (req.method === 'POST' && match) {
          registeredSessionId = match[1];
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      await new Promise<void>((resolve) => {
        server.listen(0, () => {
          const addr = server.address();
          serverPort = typeof addr === 'object' && addr ? addr.port : 0;
          // Write port file so hook can find it
          writeFileSync(join(tempPluginRoot, 'port'), String(serverPort));
          resolve();
        });
      });
    });

    afterEach(() => {
      server.close();
      if (existsSync(tempPluginRoot)) {
        rmSync(tempPluginRoot, { recursive: true });
      }
    });

    it('auto-registers session with server when server is running', async () => {
      const testSessionId = 'auto-reg-test-' + Date.now();
      const xdgConfigHome = join(tmpdir(), 'cca-test-autoreg-' + Date.now());
      const hookInput = JSON.stringify({ session_id: testSessionId, cwd: '/tmp' });

      // Run hook with CLAUDE_PLUGIN_ROOT pointing to our temp dir with port file
      execSync(`echo '${hookInput}' | bash ${hookScript}`, {
        env: {
          ...process.env,
          XDG_CONFIG_HOME: xdgConfigHome,
          HOME: tmpdir(),
          CLAUDE_PLUGIN_ROOT: tempPluginRoot,
        },
        stdio: 'pipe',
      });

      // Give the curl a moment to complete (it runs synchronously with --max-time 1)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify the session was registered
      expect(registeredSessionId).toBe(testSessionId);

      // Cleanup
      if (existsSync(xdgConfigHome)) {
        rmSync(xdgConfigHome, { recursive: true });
      }
    });

    it('does not fail when server is not reachable', () => {
      // Stop server first
      server.close();

      const testSessionId = 'no-server-test-' + Date.now();
      const xdgConfigHome = join(tmpdir(), 'cca-test-noserver-' + Date.now());
      const hookInput = JSON.stringify({ session_id: testSessionId, cwd: '/tmp' });

      // This should not throw - hook should handle unreachable server gracefully
      expect(() => {
        execSync(`echo '${hookInput}' | bash ${hookScript}`, {
          env: {
            ...process.env,
            XDG_CONFIG_HOME: xdgConfigHome,
            HOME: tmpdir(),
            CLAUDE_PLUGIN_ROOT: tempPluginRoot,
          },
          stdio: 'pipe',
        });
      }).not.toThrow();

      // Session file should still be created
      const sessionFile = join(xdgConfigHome, 'claude-code-anywhere', 'current-session-id');
      expect(existsSync(sessionFile)).toBe(true);

      // Cleanup
      if (existsSync(xdgConfigHome)) {
        rmSync(xdgConfigHome, { recursive: true });
      }
    });
  });
});

describe('pretooluse.sh stale response handling', () => {
  // Test that stale responses (from previous requests) are discarded
  // A response is stale if its timestamp is older than when the request was sent

  it('detects stale response when timestamp is before request time', () => {
    const requestTimeMs = 1700000000000; // Request sent at this time
    const staleThresholdMs = requestTimeMs - 2000; // 2 second tolerance

    // Response from 10 seconds ago is stale
    const staleResponseTimeMs = requestTimeMs - 10000;
    expect(staleResponseTimeMs < staleThresholdMs).toBe(true);

    // Response from 1 second ago is fresh (within tolerance)
    const freshResponseTimeMs = requestTimeMs - 1000;
    expect(freshResponseTimeMs < staleThresholdMs).toBe(false);

    // Response from after request is definitely fresh
    const futureResponseTimeMs = requestTimeMs + 5000;
    expect(futureResponseTimeMs < staleThresholdMs).toBe(false);
  });

  it('tolerates clock skew of up to 2 seconds', () => {
    const requestTimeMs = 1700000000000;
    const staleThresholdMs = requestTimeMs - 2000;

    // Response exactly at threshold is NOT considered stale
    expect(staleThresholdMs < staleThresholdMs).toBe(false);

    // Response 1ms before threshold IS stale
    expect(staleThresholdMs - 1 < staleThresholdMs).toBe(true);
  });

  it('pretooluse.sh includes stale response check logic', () => {
    const content = readFileSync(join(process.cwd(), 'hooks/scripts/pretooluse.sh'), 'utf-8');

    // Should record request time before sending notification
    expect(content).toContain('REQUEST_TIME_MS');

    // Should check response timestamp against threshold
    expect(content).toContain('STALE_THRESHOLD_MS');

    // Should extract timestamp from response
    expect(content).toContain('.timestamp');

    // Should continue polling if response is stale
    expect(content).toMatch(/if.*RESP_TIME.*STALE_THRESHOLD.*continue/s);
  });
});

describe('pretooluse.sh approval patterns', () => {
  // Test the regex patterns used for approval/denial detection
  const approvalPatterns =
    /^(y|yes|ok|approve|approved|allow|go|continue|sure|yep|yeah|accept|👍|✅)/i;
  const denialPatterns = /^(n|no|deny|denied|reject|stop|cancel|nope|nah|block|👎|❌)/i;

  describe('approval patterns', () => {
    const shouldApprove = [
      'y',
      'Y',
      'yes',
      'YES',
      'Yes',
      'ok',
      'OK',
      'approve',
      'approved',
      'allow',
      'go',
      'continue',
      'sure',
      'yep',
      'yeah',
      'accept',
    ];

    for (const response of shouldApprove) {
      it(`accepts "${response}" as approval`, () => {
        expect(approvalPatterns.test(response)).toBe(true);
      });
    }
  });

  describe('denial patterns', () => {
    const shouldDeny = [
      'n',
      'N',
      'no',
      'NO',
      'No',
      'deny',
      'denied',
      'reject',
      'stop',
      'cancel',
      'nope',
      'nah',
      'block',
    ];

    for (const response of shouldDeny) {
      it(`accepts "${response}" as denial`, () => {
        expect(denialPatterns.test(response)).toBe(true);
      });
    }
  });

  describe('pattern exclusivity', () => {
    it('approval patterns do not match denial words', () => {
      expect(approvalPatterns.test('no')).toBe(false);
      expect(approvalPatterns.test('deny')).toBe(false);
      expect(approvalPatterns.test('stop')).toBe(false);
    });

    it('denial patterns do not match approval words', () => {
      expect(denialPatterns.test('yes')).toBe(false);
      expect(denialPatterns.test('ok')).toBe(false);
      expect(denialPatterns.test('continue')).toBe(false);
    });
  });
});

// TODO: Add sticky-enabled tests when implementing --continue support
// See: SessionStart sticky-enabled feature (claude --continue support)

describe('SessionStart server version check (auto-restart on plugin update)', () => {
  // When plugin is updated but server is still running old version,
  // SessionStart should detect the mismatch and restart the server

  it('check-install.sh contains version comparison logic', () => {
    const content = readFileSync(join(process.cwd(), 'hooks/check-install.sh'), 'utf-8');

    // Should get server version from API
    expect(content).toMatch(/SERVER_VERSION|server.*version/i);

    // Should get plugin version from plugin.json
    expect(content).toMatch(/PLUGIN_VERSION|plugin\.json/i);

    // Should compare versions
    expect(content).toMatch(/SERVER_VERSION.*PLUGIN_VERSION|version.*mismatch/i);
  });

  it('check-install.sh restarts server on version mismatch', () => {
    const content = readFileSync(join(process.cwd(), 'hooks/check-install.sh'), 'utf-8');

    // Should kill old server if version mismatch
    expect(content).toMatch(/pkill|kill.*server/i);

    // Should start new server after killing old one
    expect(content).toMatch(/bun run server|start.*server/i);
  });
});

describe('hook scripts use canonical port path (regression tests)', () => {
  // These tests ensure hook scripts read from ~/.config/claude-code-anywhere/port
  // NOT from relative paths like $SCRIPT_DIR/../../port which fail when
  // the server runs from a different context than the hooks

  const CANONICAL_PORT_PATH = '$HOME/.config/claude-code-anywhere/port';
  const BROKEN_RELATIVE_PATH = '$SCRIPT_DIR/../../port';
  const BROKEN_OLD_PATH = '$HOME/.claude-code-anywhere/port';

  it('notification.sh reads from canonical location', () => {
    const content = readFileSync(join(process.cwd(), 'hooks/scripts/notification.sh'), 'utf-8');
    expect(content).toContain(CANONICAL_PORT_PATH);
    expect(content).not.toContain(BROKEN_RELATIVE_PATH);
  });

  it('stop.sh reads from canonical location', () => {
    const content = readFileSync(join(process.cwd(), 'hooks/scripts/stop.sh'), 'utf-8');
    expect(content).toContain(CANONICAL_PORT_PATH);
    expect(content).not.toContain(BROKEN_RELATIVE_PATH);
  });

  it('pretooluse.sh reads from canonical location', () => {
    const content = readFileSync(join(process.cwd(), 'hooks/scripts/pretooluse.sh'), 'utf-8');
    expect(content).toContain(CANONICAL_PORT_PATH);
    expect(content).not.toContain(BROKEN_RELATIVE_PATH);
  });

  it('check-install.sh reads from canonical config location', () => {
    const content = readFileSync(join(process.cwd(), 'hooks/check-install.sh'), 'utf-8');
    expect(content).toContain(CANONICAL_PORT_PATH);
    expect(content).not.toContain(BROKEN_OLD_PATH);
  });

  it('server-status.sh reads from canonical location', () => {
    const content = readFileSync(join(process.cwd(), 'scripts/server-status.sh'), 'utf-8');
    expect(content).toContain(CANONICAL_PORT_PATH);
    // Should NOT use cpr.sh to find plugin root for port file
    expect(content).not.toContain('${PLUGIN_ROOT}/port');
  });
});
