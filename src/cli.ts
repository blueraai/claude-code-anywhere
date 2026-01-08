#!/usr/bin/env node

/**
 * Claude Code Anywhere CLI - Command line interface for the email bridge
 *
 * Uses Gmail SMTP/IMAP for sending/receiving messages.
 */

import 'dotenv/config';
import { Command } from 'commander';
import { createBridgeServer } from './server/index.js';
import { loadEmailConfig, loadAppConfig } from './shared/config.js';
import { enableGlobal, disableGlobal, loadState } from './server/state.js';
import { EmailClient } from './server/email.js';

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
  .version('0.1.0');

/**
 * Server command - Start the email bridge server
 */
program
  .command('server')
  .description('Start the email bridge server')
  .option('-p, --port <port>', 'Port to listen on', '3847')
  .action(async (options: { port: string }) => {
    const port = parseInt(options.port, 10);

    if (isNaN(port) || port < 1 || port > 65535) {
      console.error('Error: Invalid port number');
      process.exit(1);
    }

    // Validate config
    const configResult = loadEmailConfig();
    if (!configResult.success) {
      console.error(`Error: ${configResult.error}`);
      console.error('\nPlease set the following environment variables:');
      console.error('  EMAIL_USER=claude-notify@gmail.com');
      console.error('  EMAIL_PASS=your-app-password');
      console.error('  EMAIL_RECIPIENT=you@example.com');
      process.exit(1);
    }

    try {
      const server = createBridgeServer(port);

      // Handle graceful shutdown
      const shutdown = (): void => {
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
    } catch (error) {
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
  .description('Check email bridge server status')
  .option('-u, --url <url>', 'Bridge server URL', 'http://localhost:3847')
  .action(async (options: { url: string }) => {
    try {
      const response = await fetch(`${options.url}/api/status`);
      if (!response.ok) {
        console.error('Error: Server returned', response.status);
        process.exit(1);
      }

      const rawStatus: unknown = await response.json();
      if (!isStatusResponse(rawStatus)) {
        console.error('Error: Invalid response from server');
        process.exit(1);
      }

      console.log('Email Bridge Server Status:');
      console.log(`  Status: ${rawStatus.status}`);
      console.log(`  Backend: Gmail SMTP/IMAP`);
      console.log(`  Active Sessions: ${String(rawStatus.activeSessions)}`);
      console.log(`  Pending Responses: ${String(rawStatus.pendingResponses)}`);
      console.log(`  Uptime: ${String(rawStatus.uptime)} seconds`);
    } catch {
      console.error('Error: Could not connect to server. Is it running?');
      process.exit(1);
    }
  });

/**
 * Enable command - Enable notifications globally
 */
program
  .command('enable')
  .description('Enable email notifications globally')
  .action(() => {
    try {
      enableGlobal();
      console.log('Email notifications enabled globally');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error: ${message}`);
      process.exit(1);
    }
  });

/**
 * Disable command - Disable notifications globally
 */
program
  .command('disable')
  .description('Disable email notifications globally')
  .action(() => {
    try {
      disableGlobal();
      console.log('Email notifications disabled globally');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error: ${message}`);
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
      console.error(`Error: ${configResult.error}`);
      process.exit(1);
    }

    const { recipient } = configResult.data;

    console.log(`Sending test email to ${recipient}...`);

    try {
      const client = new EmailClient(configResult.data);
      const initResult = client.initialize();

      if (!initResult.success) {
        console.error(`Error initializing: ${initResult.error}`);
        process.exit(1);
      }

      const result = await client.sendEmail(
        'Test from Claude Code',
        'Test message from Claude Code Email Bridge. Your setup is working!\n\nYou can reply to this email to test bidirectional communication.'
      );

      if (result.success) {
        console.log('Test email sent successfully!');
        console.log(`  Message ID: ${result.data}`);
      } else {
        console.error(`Error: ${result.error}`);
        process.exit(1);
      }

      client.dispose();
    } catch (error) {
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

    console.log('Claude Code Email Bridge Configuration:');
    console.log('');
    console.log('Backend: Gmail SMTP/IMAP');
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
      console.log('Email Configuration:');
      console.log(`  From: ${configResult.data.email.user}`);
      console.log(`  To: ${configResult.data.email.recipient}`);
      console.log(`  Bridge URL: ${configResult.data.bridgeUrl}`);
      console.log(`  Port: ${String(configResult.data.port)}`);
    } else {
      console.log('Email Configuration:');
      console.log(`  Error: ${configResult.error}`);
    }
  });

// Parse and execute
program.parse();
