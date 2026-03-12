import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { McpSettings } from '../models/interfaces.js';
import { taskService } from '../services/task.service.js';

export function registerTaskTools(server: McpServer, settings: McpSettings) {
  server.registerTool(
    'init_checklist',
    {
      description: 'Initialize a new task checklist for the current subconductor run. This tool creates a task table with Status, ID, Name, and optional custom columns (like Notes).',
      inputSchema: {
        tasks: z.array(
          z.object({
            name: z.string(),
            note: z.string().optional()
          })
        ).describe('List of task objects with "name" and optional "note".').describe('List of tasks to perform. Must be objects with "name" and optional "note".'),
        goal: z.string().describe('The overall goal of this subconductor run'),
        columns: z.array(z.string()).optional().describe('Optional list of custom columns for the task table. "Status", "ID", and "Name" are always included.')
      }
    },
    async ({ tasks, goal, columns }) => {
      const count = await taskService.initChecklist(tasks, goal, columns);
      return {
        content: [{ type: 'text', text: `Checklist created with ${count} tasks.` }]
      };
    }
  );

  server.registerTool(
    'get_pending_task',
    {
      description: 'Retrieve the next single pending task from the active checklist. Returns "DONE" if all tasks are finished. Tasks are returned with an ID (e.g., "(#1) Task Name") which can be used to reference them efficiently.'
    },
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
      description: 'Mark a specific task as completed in the active checklist. You can reference the task by its ID (e.g., "1" or "#1") for efficiency, or by its full name. You can optionally provide a note detailing the progress or result.',
      inputSchema: {
        task: z.string().describe('The task ID (e.g., "1") or task name to mark as completed'),
        note: z.string().optional().describe('An optional note to add or append to the task')
      }
    },
    async ({ task, note }) => {
      try {
        const success = await taskService.markTaskDone(task, note);
        return {
          content: [{
            type: 'text',
            text: success ? `Marked ${task} as completed.` : `Task ${task} not found or already completed.`
          }]
        };
      }
      catch (err: any) {
        return {
          content: [{ type: 'text', text: `Error: ${err.message}` }]
        };
      }
    }
  );

  server.registerTool(
    'unmark_task',
    {
      description: 'Revert a completed task back to pending status in the active checklist. You can reference the task by its ID (e.g., "1" or "#1") or by its full name. Any completion notes will be removed.',
      inputSchema: {
        task: z.string().describe('The task ID (e.g., "1") or task name to unmark')
      }
    },
    async ({ task }) => {
      const success = await taskService.unmarkTask(task);
      return {
        content: [{
          type: 'text',
          text: success ? `Reverted ${task} to pending status.` : `Completed task ${task} not found.`
        }]
      };
    }
  );

  server.registerTool(
    'add_task',
    {
      description: 'Add a new task to the active checklist.',
      inputSchema: {
        name: z.string().describe('The name of the task to add'),
        note: z.string().optional().describe('An optional note for the task')
      }
    },
    async ({ name, note }) => {
      try {
        const result = await taskService.addTask(name, note);
        return {
          content: [{ type: 'text', text: `Added task: ${result}` }]
        };
      }
      catch (err: any) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }] };
      }
    }
  );

  server.registerTool(
    'remove_task',
    {
      description: 'Remove a task from the active checklist.',
      inputSchema: {
        task: z.string().describe('The task ID (e.g., "1") or task name to remove')
      }
    },
    async ({ task }) => {
      try {
        const success = await taskService.removeTask(task);
        return {
          content: [{
            type: 'text',
            text: success ? `Removed task ${task}.` : `Task ${task} not found.`
          }]
        };
      }
      catch (err: any) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }] };
      }
    }
  );

  if (!settings.disableBatch) {
    server.registerTool(
      'get_pending_tasks',
      {
        description: 'Retrieve a batch of multiple pending tasks from the active checklist. Tasks are returned with an ID (e.g., "(#1) Task Name") which can be used to reference them efficiently. This is useful for getting an overview of upcoming work or for efficiently processing multiple simple tasks in a single turn.',
        inputSchema: {
          count: z.number().int().min(1).max(50).optional().default(5).describe('The number of pending tasks to retrieve')
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
      'mark_tasks_done',
      {
        description: 'Mark multiple tasks as completed in a single batch operation. You can reference tasks by their ID (e.g., "1" or "#1") or by their full name. This is efficient when several tasks are finished simultaneously. Like mark_task_done, you can optionally provide a note for each task to document progress or results.',
        inputSchema: {
          tasks: z.array(z.object({
            name: z.string().describe('The task ID (e.g., "1") or task name'),
            note: z.string().optional()
          })).describe('List of tasks to mark as completed')
        }
      },
      async ({ tasks }) => {
        try {
          const results = await taskService.markTasksDone(tasks);
          const summary = results.map(r => `${r.name}: ${r.success ? 'Success' : 'Failed'}`).join('\n');
          return {
            content: [{ type: 'text', text: summary }]
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
      'unmark_tasks',
      {
        description: 'Revert multiple completed tasks back to pending status in a single batch operation. You can reference tasks by their ID (e.g., "1" or "#1") or by their full name.',
        inputSchema: {
          tasks: z.array(z.string().describe('The task ID (e.g., "1") or task name')).describe('List of tasks to unmark')
        }
      },
      async ({ tasks }) => {
        try {
          const results = await taskService.unmarkTasks(tasks);
          const summary = results.map(r => `${r.name}: ${r.success ? 'Success' : 'Failed'}`).join('\n');
          return {
            content: [{ type: 'text', text: summary }]
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
      'add_tasks',
      {
        description: 'Add multiple new tasks to the active checklist.',
        inputSchema: {
          tasks: z.array(z.object({
            name: z.string().describe('The name of the task to add'),
            note: z.string().optional().describe('An optional note for the task')
          })).describe('List of tasks to add')
        }
      },
      async ({ tasks }) => {
        try {
          const results = await taskService.addTasks(tasks);
          const summary = results.map(r => `Added task: (#${r.id}) ${r.name}`).join('\n');
          return { content: [{ type: 'text', text: summary }] };
        }
        catch (err: any) {
          return { content: [{ type: 'text', text: `Error: ${err.message}` }] };
        }
      }
    );

    server.registerTool(
      'remove_tasks',
      {
        description: 'Remove multiple tasks from the active checklist.',
        inputSchema: {
          tasks: z.array(z.string().describe('The task ID (e.g., "1") or task name to remove')).describe('List of tasks to remove')
        }
      },
      async ({ tasks }) => {
        try {
          const results = await taskService.removeTasks(tasks);
          const summary = results.map(r => `${r.name}: ${r.success ? 'Removed' : 'Not found'}`).join('\n');
          return { content: [{ type: 'text', text: summary }] };
        }
        catch (err: any) {
          return { content: [{ type: 'text', text: `Error: ${err.message}` }] };
        }
      }
    );
  }
}