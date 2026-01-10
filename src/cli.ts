#!/usr/bin/env node

/**
 * Claude Code Anywhere CLI - Command line interface for the notification bridge
 */

import 'dotenv/config';
import { Command } from 'commander';
import packageJson from '../package.json' with { type: 'json' };
import { EmailClient } from './server/email.js';
import { createBridgeServer } from './server/index.js';
import { enableGlobal, disableGlobal, loadState } from './server/state.js';
import { loadEmailConfig, loadAppConfig } from './shared/config.js';

/**
 * CLI output helpers - single point for console access
 * Easy to swap to another output mechanism if needed
 */
/* eslint-disable no-console -- CLI output helper is the single point for console access */
const output = {
  log: (...args: unknown[]): void => {
    console.log(...args);
  },
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};
/* eslint-enable no-console */

const program = new Command();

/**
 * Type guard for status response
 */
function isStatusResponse(value: unknown): value is {
  status: string;
  activeSessions: number;
  pendingResponses: number;
  uptime: number;
} {
  if (typeof value !== 'object' || value === null) return false;
  if (!('status' in value) || typeof value.status !== 'string') return false;
  if (!('activeSessions' in value) || typeof value.activeSessions !== 'number') return false;
  if (!('pendingResponses' in value) || typeof value.pendingResponses !== 'number') return false;
  if (!('uptime' in value) || typeof value.uptime !== 'number') return false;
  return true;
}

program
  .name('claude-code-anywhere')
  .description('Email notifications and bidirectional communication for Claude Code')
  .version(packageJson.version);

/**
 * Server command - Start the email bridge server
 */
program
  .command('server')
  .description('Start the notification bridge server')
  .option('-p, --port <port>', 'Port to listen on', '3847')
  .action(async (options: { port: string }) => {
    const port = parseInt(options.port, 10);

    if (isNaN(port) || port < 1 || port > 65535) {
      output.error('Error: Invalid port number');
      process.exit(1);
    }

    // Validate config
    const configResult = loadEmailConfig();
    if (!configResult.success) {
      output.error(`Error: ${configResult.error}`);
      output.error('\nCreate ~/.claude/claude-code-anywhere/config.json:');
      output.error('  {');
      output.error('    "email": {');
      output.error('      "user": "claude-cca@gmail.com",');
      output.error('      "pass": "your-app-password",');
      output.error('      "recipient": "you@example.com"');
      output.error('    }');
      output.error('  }');
      process.exit(1);
    }

    try {
      const server = createBridgeServer(port);

      // Handle graceful shutdown
      const shutdown = (): void => {
        output.log('\nShutting down...');
        void server.stop().then(() => {
          process.exit(0);
        });
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

      // Start server
      await server.start();

      output.log('\nServer running. Press Ctrl+C to stop.\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      output.error(`Error: ${message}`);
      process.exit(1);
    }
  });

/**
 * Status command - Check server status
 */
program
  .command('status')
  .description('Check notification bridge server status')
  .option('-u, --url <url>', 'Bridge server URL', 'http://localhost:3847')
  .action(async (options: { url: string }) => {
    try {
      const response = await fetch(`${options.url}/api/status`);
      if (!response.ok) {
        output.error('Error: Server returned', response.status);
        process.exit(1);
      }

      const rawStatus: unknown = await response.json();
      if (!isStatusResponse(rawStatus)) {
        output.error('Error: Invalid response from server');
        process.exit(1);
      }

      output.log('Bridge Server Status:');
      output.log(`  Status: ${rawStatus.status}`);
      output.log(`  Active Sessions: ${String(rawStatus.activeSessions)}`);
      output.log(`  Pending Responses: ${String(rawStatus.pendingResponses)}`);
      output.log(`  Uptime: ${String(rawStatus.uptime)} seconds`);
    } catch {
      output.error('Error: Could not connect to server. Is it running?');
      process.exit(1);
    }
  });

/**
 * Enable command - Enable notifications globally
 */
program
  .command('enable')
  .description('Enable notifications globally')
  .action(() => {
    try {
      enableGlobal();
      output.log('Notifications enabled globally');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      output.error(`Error: ${message}`);
      process.exit(1);
    }
  });

/**
 * Disable command - Disable notifications globally
 */
program
  .command('disable')
  .description('Disable notifications globally')
  .action(() => {
    try {
      disableGlobal();
      output.log('Notifications disabled globally');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      output.error(`Error: ${message}`);
      process.exit(1);
    }
  });

/**
 * Test command - Send a test email
 */
program
  .command('test')
  .description('Send a test email')
  .action(async () => {
    const configResult = loadEmailConfig();
    if (!configResult.success) {
      output.error(`Error: ${configResult.error}`);
      process.exit(1);
    }

    const { recipient } = configResult.data;

    output.log(`Sending test email to ${recipient}...`);

    try {
      const client = new EmailClient(configResult.data);
      await client.initialize();

      const result = await client.sendEmail(
        'Test from Claude Code',
        'Test message from Claude Code Email Bridge. Your setup is working!\n\nYou can reply to this email to test bidirectional communication.'
      );

      if (result.success) {
        output.log('Test email sent successfully!');
        output.log(`  Message ID: ${result.data}`);
      } else {
        output.error(`Error: ${result.error}`);
        process.exit(1);
      }

      client.dispose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      output.error(`Error: ${message}`);
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

    output.log('Claude Code Anywhere Configuration:');
    output.log('');
    output.log('Global State:');
    output.log(`  Enabled: ${state.enabled ? 'Yes' : 'No'}`);
    output.log('');
    output.log('Hook Settings:');
    output.log(`  Notification: ${state.hooks.Notification ? 'On' : 'Off'}`);
    output.log(`  Stop: ${state.hooks.Stop ? 'On' : 'Off'}`);
    output.log(`  PreToolUse: ${state.hooks.PreToolUse ? 'On' : 'Off'}`);
    output.log(`  UserPromptSubmit: ${state.hooks.UserPromptSubmit ? 'On' : 'Off'}`);
    output.log('');

    if (configResult.success) {
      output.log('Email Configuration:');
      output.log(`  From: ${configResult.data.email.user}`);
      output.log(`  To: ${configResult.data.email.recipient}`);
      output.log(`  Bridge URL: ${configResult.data.bridgeUrl}`);
      output.log(`  Port: ${String(configResult.data.port)}`);
    } else {
      output.log('Email Configuration:');
      output.log(`  Error: ${configResult.error}`);
    }
  });

// Parse and execute
program.parse();
