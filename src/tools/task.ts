import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { taskService } from '../services/task.service.js';

export function registerTaskTools(server: McpServer) {
  server.registerTool(
    'init_checklist',
    {
      inputSchema: {
        tasks: z.array(z.string()).describe('List of tasks to perform (e.g., file paths, function names)'),
        goal: z.string().describe('The overall goal of this subconductor run')
      }
    },
    async ({ tasks, goal }) => {
      const count = await taskService.initChecklist(tasks, goal);
      return {
        content: [{ type: 'text', text: `Checklist created with ${count} tasks.` }]
      };
    }
  );

  server.registerTool(
    'get_pending_task',
    {},
    async () => {
      try {
        const task = await taskService.getPendingTask();
        return {
          content: [{ type: 'text', text: task ?? 'DONE' }]
        };
      }
      catch (err: any) {
        return {
          content: [{ type: 'text', text: err.message }]
        };
      }
    }
  );

  server.registerTool(
    'mark_task_done',
    {
      inputSchema: {
        task: z.string().describe('The task name to mark as completed')
      }
    },
    async ({ task }) => {
      const success = await taskService.markTaskDone(task);
      return {
        content: [{
          type: 'text',
          text: success ? `Marked ${task} as completed.` : `Task ${task} not found or already completed.`
        }]
      };
    }
  );
}