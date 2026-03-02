#!/usr/bin/env node
/**
 * Subconductor - Persistent State Machine for AI Agents
 * Copyright 2026 Paul Benchea
 * Licensed under the Apache License, Version 2.0.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/index.js";
import { notificationService } from "./services/notification.service.js";
import { APP_NAME, APP_VERSION } from "./config/constants.js";

const server = new McpServer({
  name: APP_NAME,
  version: APP_VERSION,
});

registerTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(async (err) => {
  console.error('Fatal Server Error:', err);
  await notificationService.alert('Subconductor Crash', err.message, 'error');
  process.exit(1);
});
