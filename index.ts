#!/usr/bin/env node
/**
 * Subconductor - Persistent State Machine for AI Agents
 * Copyright 2026 Paul Benchea
 * * Licensed under the Apache License, Version 2.0.
 * See LICENSE and NOTICE files in the project root for full license information.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

const server = new McpServer({
  name: "subconductor",
  version: "1.0.0",
});

const WORKING_DIR = path.join(process.cwd(), ".subconductor");
const TASK_FILE = path.join(WORKING_DIR, "tasks.md");

async function ensureInit() {
  try {
    await fs.mkdir(WORKING_DIR, { recursive: true });
  } catch (e) {}
}

server.tool(
  "init_checklist",
  {
    paths: z.array(z.string()).describe("List of file paths to refactor"),
    goal: z.string().describe("The overall goal of this subconductor run")
  },
  async ({ paths, goal }) => {
    await ensureInit();
    const content = `# Goal: ${goal}\n\n${paths.map(p => `- [ ] ${p}`).join("\n")}`;
    await fs.writeFile(TASK_FILE, content);
    return {
      content: [{ type: "text", text: `Checklist created with ${paths.length} files.` }]
    };
  }
);

server.tool(
  "get_pending_task",
  {},
  async () => {
    await ensureInit();
    const data = await fs.readFile(TASK_FILE, "utf-8");
    const lines = data.split("\n");
    const nextLine = lines.find(l => l.startsWith("- [ ] "));
    
    if (!nextLine) {
      return { content: [{ type: "text", text: "DONE" }] };
    }
    
    const taskPath = nextLine.replace("- [ ] ", "").trim();
    return { content: [{ type: "text", text: taskPath }] };
  }
);

server.tool(
  "mark_task_done",
  {
    path: z.string().describe("The file path to mark as completed")
  },
  async ({ path: filePath }) => {
    await ensureInit();
    let data = await fs.readFile(TASK_FILE, "utf-8");
    // Replace the specific line's checkbox
    data = data.replace(`- [ ] ${filePath}`, `- [x] ${filePath}`);
    await fs.writeFile(TASK_FILE, data);
    return {
      content: [{ type: "text", text: `Marked ${filePath} as completed.` }]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);