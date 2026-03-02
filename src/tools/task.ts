import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { taskService } from '../services/task.service.js';

export function registerTaskTools(server: McpServer) {
  server.registerTool(
    'init_checklist',
    {
      inputSchema: {
        tasks: z.array(z.string()).describe('List of tasks to perform.'),
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
    'get_pending_tasks',
    {
      inputSchema: {
        count: z.number().optional().default(5).describe('The number of pending tasks to retrieve')
      }
    },
    async ({ count }) => {
      try {
        const tasks = await taskService.getPendingTasks(count);
        return {
          content: [{ type: 'text', text: tasks.length > 0 ? tasks.join('\n') : 'DONE' }]
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
        task: z.string().describe('The task name to mark as completed'),
        note: z.string().optional().describe('An optional note to add or append to the task')
      }
    },
    async ({ task, note }) => {
      const success = await taskService.markTaskDone(task, note);
      return {
        content: [{
          type: 'text',
          text: success ? `Marked ${task} as completed.` : `Task ${task} not found or already completed.`
        }]
      };
    }
  );

  server.registerTool(
    'mark_tasks_done',
    {
      inputSchema: {
        tasks: z.array(z.object({
          name: z.string(),
          note: z.string().optional()
        })).describe('List of tasks to mark as completed')
      }
    },
    async ({ tasks }) => {
      const results = await taskService.markTasksDone(tasks);
      const summary = results.map(r => `${r.name}: ${r.success ? 'Success' : 'Failed'}`).join('\n');
      return {
        content: [{ type: 'text', text: summary }]
      };
    }
  );
}