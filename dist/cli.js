#!/usr/bin/env node
/**
 * Claude SMS CLI - Command line interface for the SMS bridge
 *
 * Uses macOS Messages.app via imsg CLI for sending/receiving messages.
 */
import { Command } from 'commander';
import { createBridgeServer } from './server/index.js';
import { loadMessagesConfig, loadAppConfig } from './shared/config.js';
import { enableGlobal, disableGlobal, loadState } from './server/state.js';
import { MessagesClient, checkImsgInstalled } from './server/messages.js';
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
program
    .name('claude-sms')
    .description('SMS notifications and bidirectional communication for Claude Code via macOS Messages')
    .version('0.1.0');
/**
 * Server command - Start the SMS bridge server
 */
program
    .command('server')
    .description('Start the SMS bridge server using macOS Messages')
    .option('-p, --port <port>', 'Port to listen on', '3847')
    .action(async (options) => {
    const port = parseInt(options.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
        console.error('Error: Invalid port number');
        process.exit(1);
    }
    // Check imsg is installed
    if (!checkImsgInstalled()) {
        console.error('Error: imsg is not installed');
        console.error('\nInstall it with:');
        console.error('  brew install steipete/tap/imsg');
        process.exit(1);
    }
    // Validate config
    const configResult = loadMessagesConfig();
    if (!configResult.success) {
        console.error(`Error: ${configResult.error}`);
        console.error('\nPlease set the following environment variable:');
        console.error('  SMS_USER_PHONE=+1987654321');
        process.exit(1);
    }
    try {
        const server = createBridgeServer(port);
        // Handle graceful shutdown
        const shutdown = () => {
            console.log('\nShutting down...');
            void server.stop().then(() => {
                process.exit(0);
            });
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
        // Start server
        await server.start();
        console.log('\nServer running. Press Ctrl+C to stop.\n');
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
        console.log(`  Backend: macOS Messages (imsg)`);
        console.log(`  Active Sessions: ${String(rawStatus.activeSessions)}`);
        console.log(`  Pending Responses: ${String(rawStatus.pendingResponses)}`);
        console.log(`  Uptime: ${String(rawStatus.uptime)} seconds`);
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
        console.log('SMS notifications enabled globally');
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
        console.log('SMS notifications disabled globally');
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
    .description('Send a test SMS message via macOS Messages')
    .action(() => {
    // Check imsg is installed
    if (!checkImsgInstalled()) {
        console.error('Error: imsg is not installed');
        console.error('\nInstall it with:');
        console.error('  brew install steipete/tap/imsg');
        process.exit(1);
    }
    const configResult = loadMessagesConfig();
    if (!configResult.success) {
        console.error(`Error: ${configResult.error}`);
        process.exit(1);
    }
    const { userPhone } = configResult.data;
    console.log(`Sending test SMS to ${userPhone} via Messages.app...`);
    try {
        const client = new MessagesClient(configResult.data);
        const initResult = client.initialize();
        if (!initResult.success) {
            console.error(`Error initializing: ${initResult.error}`);
            process.exit(1);
        }
        const result = client.sendMessage('Test message from Claude SMS Bridge. Your setup is working!');
        if (result.success) {
            console.log('Test SMS sent successfully via Messages.app');
        }
        else {
            console.error(`Error: ${result.error}`);
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
 * Config command - Show current configuration
 */
program
    .command('config')
    .description('Show current configuration')
    .action(() => {
    const state = loadState();
    const configResult = loadAppConfig();
    const imsgInstalled = checkImsgInstalled();
    console.log('Claude SMS Configuration:');
    console.log('');
    console.log('Backend: macOS Messages (imsg)');
    console.log(`  imsg installed: ${imsgInstalled ? 'Yes' : 'No'}`);
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
        console.log('Messages Configuration:');
        console.log(`  User Phone: ${configResult.data.messages.userPhone}`);
        console.log(`  Bridge URL: ${configResult.data.bridgeUrl}`);
        console.log(`  Port: ${String(configResult.data.port)}`);
    }
    else {
        console.log('Messages Configuration:');
        console.log(`  Error: ${configResult.error}`);
    }
});
// Parse and execute
program.parse();
//# sourceMappingURL=cli.js.map