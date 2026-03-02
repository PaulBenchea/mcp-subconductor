#!/usr/bin/env node
/**
 * Subconductor - Persistent State Machine for AI Agents
 * Copyright 2026 Paul Benchea
 * Licensed under the Apache License, Version 2.0.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { APP_NAME, APP_VERSION } from './models/constants.js';
import { AlertType } from './models/enums.js';
import { notificationService } from './services/notification.service.js';
import { registerAlertTools } from './tools/alert.js';
import { registerTaskTools } from './tools/task.js';

const server = new McpServer({
  name: APP_NAME,
  version: APP_VERSION,
});

registerTaskTools(server);
registerAlertTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(async (err) => {
  await notificationService.alert('Subconductor Crash', err.message, AlertType.Error);
  process.exit(1);
});
