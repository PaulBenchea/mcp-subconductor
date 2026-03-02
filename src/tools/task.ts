import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AlertType } from '../models/enums.js';
import { taskService } from "../services/task.service.js";
import { notificationService } from "../services/notification.service.js";

export function registerTools(server: McpServer) {
  server.registerTool(
    "init_checklist",
    {
      inputSchema: {
        paths: z.array(z.string()).describe("List of file paths to refactor"),
        goal: z.string().describe("The overall goal of this subconductor run")
      }
    },
    async ({ paths, goal }) => {
      const count = await taskService.initChecklist(paths, goal);
      return {
        content: [{ type: "text", text: `Checklist created with ${count} files.` }]
      };
    }
  );

  server.registerTool(
    "get_pending_task",
    {},
    async () => {
      try {
        const task = await taskService.getPendingTask();
        return { 
          content: [{ type: "text", text: task ?? "DONE" }] 
        };
      } catch (err: any) {
        return { 
          content: [{ type: "text", text: err.message }] 
        };
      }
    }
  );

  server.registerTool(
    "mark_task_done",
    {
      inputSchema: {
        path: z.string().describe("The file path to mark as completed")
      }
    },
    async ({ path: filePath }) => {
      const success = await taskService.markTaskDone(filePath);
      return {
        content: [{ type: "text", text: success ? `Marked ${filePath} as completed.` : `Task ${filePath} not found or already completed.` }]
      };
    }
  );
}