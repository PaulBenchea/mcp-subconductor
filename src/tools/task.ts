import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs/promises';
import { WORKFLOW_FILE } from '../models/constants.js';
import type { McpSettings } from '../models/interfaces.js';
import { taskService } from '../services/task.service.js';
import { projectService } from '../services/project.service.js';

const INIT_ERROR = 'Subconductor is NOT initialized for this project. To use Subconductor\'s tracking and alerting capabilities, you MUST first run the "analyze_project" prompt to establish context.';

export function registerTaskTools(server: McpServer, settings: McpSettings) {
  server.registerPrompt(
    "analyze_project",
    {
      description: "Scan the project and analyze critical project information for better context."
    },
    async () => {
      const analysis = await projectService.analyzeProject();
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: analysis
            }
          }
        ]
      };
    }
  );

  server.registerPrompt(
    "activate_workflow",
    {
      description: "Strictly track complex multi-step workflows, prevent context drift, and recover session state using the Subconductor mechanism."
    },
    async () => {
      if (!(await projectService.isInitialized())) {
         return {
           messages: [{ role: "user", content: { type: "text", text: INIT_ERROR } }]
         };
      }

      let workflowContent = '';
      try {
        workflowContent = await fs.readFile(WORKFLOW_FILE, 'utf-8');
      } catch (error) {
        workflowContent = `Error reading workflow file: ${error instanceof Error ? error.message : String(error)}`;
      }

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: workflowContent
            }
          }
        ]
      };
    }
  );

  server.registerTool(
    'init_checklist',
    {
      description: 'Initialize a new task checklist for the current subconductor run. This tool creates a task table with Status, ID, Name, and optional custom columns. It also natively sets up goal tracking to monitor completion progress.',
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
      if (!(await projectService.isInitialized())) {
        return { content: [{ type: 'text', text: INIT_ERROR }] };
      }

      const count = await taskService.initChecklist(tasks, goal, columns);
      return {
        content: [{ type: 'text', text: `Checklist created with ${count} tasks.` }]
      };
    }
  );

  server.registerTool(
    'activate_checklist',
    {
      description: 'Activate a previously initialized checklist by its goal name or a substring of it. The activated checklist will receive all subsequent task operations.',
      inputSchema: {
        checklistName: z.string().describe('The goal name of the checklist to activate, or a distinctive part of it.')
      }
    },
    async ({ checklistName }) => {
      if (!(await projectService.isInitialized())) {
        return { content: [{ type: 'text', text: INIT_ERROR }] };
      }

      try {
        const success = await taskService.activateChecklist(checklistName);
        return {
          content: [{
            type: 'text',
            text: success ? `Activated checklist matching "${checklistName}".` : `No checklist found matching "${checklistName}".`
          }]
        };
      }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error: ${message}` }]
        };
      }
    }
  );

  server.registerTool(
    'archive_checklist',
    {
      description: 'Archive a checklist by its goal name, a substring of it, or its numeric ID. The checklist will be moved to the archive directory and marked as Archived in the global index.',
      inputSchema: {
        checklistIdentifier: z.string().describe('The goal name, a distinctive part of it, or the numeric ID of the checklist to archive.')
      }
    },
    async ({ checklistIdentifier }) => {
      if (!(await projectService.isInitialized())) {
        return { content: [{ type: 'text', text: INIT_ERROR }] };
      }

      try {
        const success = await taskService.archiveChecklist(checklistIdentifier);
        return {
          content: [{
            type: 'text',
            text: success ? `Archived checklist matching "${checklistIdentifier}".` : `No checklist found matching "${checklistIdentifier}".`
          }]
        };
      }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error: ${message}` }]
        };
      }
    }
  );

  server.registerTool(
    'get_pending_task',
    {
      description: 'Retrieve the next single pending task from the active checklist. Returns "DONE" if all tasks are finished. Tasks are returned with an ID (e.g., "(#1) Task Name") which can be used to reference them efficiently.'
    },
    async () => {
      if (!(await projectService.isInitialized())) {
        return { content: [{ type: 'text', text: INIT_ERROR }] };
      }

      try {
        const task = await taskService.getPendingTask();
        return {
          content: [{ type: 'text', text: task ?? 'DONE' }]
        };
      }
      catch (error: any) {
        return {
          content: [{ type: 'text', text: error.message }]
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
      if (!(await projectService.isInitialized())) {
        return { content: [{ type: 'text', text: INIT_ERROR }] };
      }

      try {
        const success = await taskService.markTaskDone(task, note);
        return {
          content: [{
            type: 'text',
            text: success ? `Marked ${task} as completed.` : `Task ${task} not found or already completed.`
          }]
        };
      }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error: ${message}` }]
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
      if (!(await projectService.isInitialized())) {
        return { content: [{ type: 'text', text: INIT_ERROR }] };
      }

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
      description: 'Add a new task to the active checklist. The task is appended to the end of the list and automatically assigned a new ID.',
      inputSchema: {
        name: z.string().describe('The name of the task to add'),
        note: z.string().optional().describe('An optional note for the task')
      }
    },
    async ({ name, note }) => {
      if (!(await projectService.isInitialized())) {
        return { content: [{ type: 'text', text: INIT_ERROR }] };
      }

      try {
        const result = await taskService.addTask(name, note);
        return {
          content: [{ type: 'text', text: `Added task: ${result}` }]
        };
      }
      catch (error: any) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  );

  server.registerTool(
    'remove_task',
    {
      description: 'Remove a task from the active checklist. Warning: Removing a task will automatically re-index the IDs of all subsequent tasks in the checklist.',
      inputSchema: {
        task: z.string().describe('The task ID (e.g., "1") or task name to remove')
      }
    },
    async ({ task }) => {
      if (!(await projectService.isInitialized())) {
        return { content: [{ type: 'text', text: INIT_ERROR }] };
      }

      try {
        const success = await taskService.removeTask(task);
        return {
          content: [{
            type: 'text',
            text: success ? `Removed task ${task}.` : `Task ${task} not found.`
          }]
        };
      }
      catch (error: any) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
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
        if (!(await projectService.isInitialized())) {
          return { content: [{ type: 'text', text: INIT_ERROR }] };
        }

        try {
          const tasks = await taskService.getPendingTasks(count);
          return {
            content: [{ type: 'text', text: tasks.length > 0 ? tasks.join('\n') : 'DONE' }]
          };
        }
        catch (error: any) {
          return {
            content: [{ type: 'text', text: error.message }]
          };
        }
      }
    );

    server.registerTool(
      'mark_tasks_done',
      {
        description: 'Mark multiple tasks as completed in a single batch operation. You can reference tasks by their ID (e.g., "1" or "#1") for efficiency, or by its full name. This is efficient when several tasks are finished simultaneously. Like mark_task_done, you can optionally provide a note for each task to document progress or results.',
        inputSchema: {
          tasks: z.array(z.object({
            name: z.string().describe('The task ID (e.g., "1") or task name'),
            note: z.string().optional()
          })).describe('List of tasks to mark as completed')
        }
      },
      async ({ tasks }) => {
        if (!(await projectService.isInitialized())) {
          return { content: [{ type: 'text', text: INIT_ERROR }] };
        }

        try {
          const results = await taskService.markTasksDone(tasks);
          const summary = results.map(result => `${result.name}: ${result.success ? 'Success' : 'Failed'}`).join('\n');
          return {
            content: [{ type: 'text', text: summary }]
          };
        }
        catch (error: any) {
          return {
            content: [{ type: 'text', text: error.message }]
          };
        }
      }
    );

    server.registerTool(
      'unmark_tasks',
      {
        description: 'Revert multiple completed tasks back to pending status in a single batch operation. You can reference tasks by their ID (e.g., "1" or "#1") or by its full name.',
        inputSchema: {
          tasks: z.array(z.string().describe('The task ID (e.g., "1") or task name')).describe('List of tasks to unmark')
        }
      },
      async ({ tasks }) => {
        if (!(await projectService.isInitialized())) {
          return { content: [{ type: 'text', text: INIT_ERROR }] };
        }

        try {
          const results = await taskService.unmarkTasks(tasks);
          const summary = results.map(result => `${result.name}: ${result.success ? 'Success' : 'Failed'}`).join('\n');
          return {
            content: [{ type: 'text', text: summary }]
          };
        }
        catch (error: any) {
          return {
            content: [{ type: 'text', text: error.message }]
          };
        }
      }
    );

    server.registerTool(
      'add_tasks',
      {
        description: 'Add multiple new tasks to the active checklist. Tasks are appended to the end of the list and automatically assigned new IDs.',
        inputSchema: {          tasks: z.array(z.object({
            name: z.string().describe('The name of the task to add'),
            note: z.string().optional().describe('An optional note for the task')
          })).describe('List of tasks to add')
        }
      },
      async ({ tasks }) => {
        if (!(await projectService.isInitialized())) {
          return { content: [{ type: 'text', text: INIT_ERROR }] };
        }

        try {
          const results = await taskService.addTasks(tasks);
          const summary = results.map(result => `Added task: (#${result.id}) ${result.name}`).join('\n');
          return { content: [{ type: 'text', text: summary }] };
        }
        catch (error: any) {
          return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
        }
      }
    );

    server.registerTool(
      'remove_tasks',
      {
        description: 'Remove multiple tasks from the active checklist. Safe for batch deletion, as remaining tasks are dynamically re-indexed only after all specified removals are processed.',
        inputSchema: {          tasks: z.array(z.string().describe('The task ID (e.g., "1") or task name to remove')).describe('List of tasks to remove')
        }
      },
      async ({ tasks }) => {
        if (!(await projectService.isInitialized())) {
          return { content: [{ type: 'text', text: INIT_ERROR }] };
        }

        try {
          const results = await taskService.removeTasks(tasks);
          const summary = results.map(result => `${result.name}: ${result.success ? 'Removed' : 'Not found'}`).join('\n');
          return { content: [{ type: 'text', text: summary }] };
        }
        catch (error: any) {
          return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
        }
      }
    );
  }
}