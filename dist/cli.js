#!/usr/bin/env node
/**
 * Claude SMS CLI - Command line interface for the SMS bridge
 */
import { Command } from 'commander';
import { createBridgeServer } from './server/index.js';
import { createTunnel } from './server/tunnel.js';
import { loadTelnyxConfig, loadAppConfig } from './shared/config.js';
import { enableGlobal, disableGlobal, loadState } from './server/state.js';
const program = new Command();
/**
 * Type guard for status response
 */
function isStatusResponse(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    if (!('status' in value) || typeof value.status !== 'string')
        return false;
    if (!('activeSessions' in value) || typeof value.activeSessions !== 'number')
        return false;
    if (!('pendingResponses' in value) || typeof value.pendingResponses !== 'number')
        return false;
    if (!('uptime' in value) || typeof value.uptime !== 'number')
        return false;
    if (!('tunnelUrl' in value))
        return false;
    return true;
}
/**
 * Type guard for Telnyx send SMS result
 */
function isSendResult(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'data' in value &&
        typeof value.data === 'object' &&
        value.data !== null &&
        'id' in value.data &&
        typeof value.data.id === 'string');
}
program
    .name('claude-sms')
    .description('SMS notifications and bidirectional communication for Claude Code')
    .version('0.1.0');
/**
 * Server command - Start the SMS bridge server
 */
program
    .command('server')
    .description('Start the SMS bridge server with cloudflared tunnel')
    .option('-p, --port <port>', 'Port to listen on', '3847')
    .action(async (options) => {
    const port = parseInt(options.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
        console.error('Error: Invalid port number');
        process.exit(1);
    }
    // Validate config
    const configResult = loadTelnyxConfig();
    if (!configResult.success) {
        console.error(`Error: ${configResult.error}`);
        console.error('\nPlease set the following environment variables:');
        console.error('  TELNYX_API_KEY=your-api-key');
        console.error('  TELNYX_FROM_NUMBER=+1234567890');
        console.error('  SMS_USER_PHONE=+1987654321');
        process.exit(1);
    }
    try {
        const server = createBridgeServer(port);
        const tunnel = createTunnel(port);
        // Pass tunnel URL to server when available
        tunnel.onUrl((url) => {
            server.setTunnelUrl(url);
            console.log(`\n🔗 Webhook URL for Telnyx: ${url}/webhook/telnyx\n`);
        });
        // Handle graceful shutdown
        const shutdown = () => {
            console.log('\nShutting down...');
            tunnel.stop();
            void server.stop().then(() => {
                process.exit(0);
            });
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
        // Start server first
        await server.start();
        // Then start tunnel
        console.log('\nStarting cloudflared tunnel...');
        const tunnelResult = await tunnel.start();
        if (!tunnelResult.success) {
            console.error(`Error starting tunnel: ${tunnelResult.error}`);
            await server.stop();
            process.exit(1);
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error: ${message}`);
        process.exit(1);
    }
});
/**
 * Status command - Check server status
 */
program
    .command('status')
    .description('Check SMS bridge server status')
    .option('-u, --url <url>', 'Bridge server URL', 'http://localhost:3847')
    .action(async (options) => {
    try {
        const response = await fetch(`${options.url}/api/status`);
        if (!response.ok) {
            console.error('Error: Server returned', response.status);
            process.exit(1);
        }
        const rawStatus = await response.json();
        if (!isStatusResponse(rawStatus)) {
            console.error('Error: Invalid response from server');
            process.exit(1);
        }
        console.log('SMS Bridge Server Status:');
        console.log(`  Status: ${rawStatus.status}`);
        console.log(`  Active Sessions: ${String(rawStatus.activeSessions)}`);
        console.log(`  Pending Responses: ${String(rawStatus.pendingResponses)}`);
        console.log(`  Uptime: ${String(rawStatus.uptime)} seconds`);
        console.log(`  Tunnel URL: ${rawStatus.tunnelUrl ?? 'Not active'}`);
    }
    catch {
        console.error('Error: Could not connect to server. Is it running?');
        process.exit(1);
    }
});
/**
 * Enable command - Enable SMS globally
 */
program
    .command('enable')
    .description('Enable SMS notifications globally')
    .action(() => {
    try {
        enableGlobal();
        console.log('✓ SMS notifications enabled globally');
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error: ${message}`);
        process.exit(1);
    }
});
/**
 * Disable command - Disable SMS globally
 */
program
    .command('disable')
    .description('Disable SMS notifications globally')
    .action(() => {
    try {
        disableGlobal();
        console.log('✓ SMS notifications disabled globally');
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error: ${message}`);
        process.exit(1);
    }
});
/**
 * Test command - Send a test SMS
 */
program
    .command('test')
    .description('Send a test SMS message')
    .action(async () => {
    const configResult = loadTelnyxConfig();
    if (!configResult.success) {
        console.error(`Error: ${configResult.error}`);
        process.exit(1);
    }
    const { apiKey, fromNumber, userPhone } = configResult.data;
    console.log(`Sending test SMS to ${userPhone}...`);
    try {
        const url = 'https://api.telnyx.com/v2/messages';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: fromNumber,
                to: userPhone,
                text: '🧪 Test message from Claude SMS Bridge. Your setup is working!',
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error: Telnyx API returned ${String(response.status)}`);
            console.error(errorText);
            process.exit(1);
        }
        const rawResult = await response.json();
        if (!isSendResult(rawResult)) {
            console.error('Error: Invalid response from Telnyx');
            process.exit(1);
        }
        console.log(`✓ Test SMS sent successfully (ID: ${rawResult.data.id})`);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error: ${message}`);
        process.exit(1);
    }
});
/**
 * Config command - Show current configuration
 */
program
    .command('config')
    .description('Show current configuration')
    .action(() => {
    const state = loadState();
    const configResult = loadAppConfig();
    console.log('Claude SMS Configuration:');
    console.log('');
    console.log('Global State:');
    console.log(`  Enabled: ${state.enabled ? 'Yes' : 'No'}`);
    console.log('');
    console.log('Hook Settings:');
    console.log(`  Notification: ${state.hooks.Notification ? 'On' : 'Off'}`);
    console.log(`  Stop: ${state.hooks.Stop ? 'On' : 'Off'}`);
    console.log(`  PreToolUse: ${state.hooks.PreToolUse ? 'On' : 'Off'}`);
    console.log(`  UserPromptSubmit: ${state.hooks.UserPromptSubmit ? 'On' : 'Off'}`);
    console.log('');
    if (configResult.success) {
        console.log('Telnyx Configuration:');
        console.log(`  API Key: ${configResult.data.telnyx.apiKey.substring(0, 12)}...`);
        console.log(`  From Number: ${configResult.data.telnyx.fromNumber}`);
        console.log(`  User Phone: ${configResult.data.telnyx.userPhone}`);
        console.log(`  Bridge URL: ${configResult.data.bridgeUrl}`);
        console.log(`  Port: ${String(configResult.data.port)}`);
    }
    else {
        console.log('Telnyx Configuration:');
        console.log(`  Error: ${configResult.error}`);
    }
});
// Parse and execute
program.parse();
//# sourceMappingURL=cli.js.map