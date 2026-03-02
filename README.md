# Subconductor

A persistent state machine and notification system for AI agents to manage complex, multi-step workflows via the Model Context Protocol (MCP).

Subconductor prevents "context drift" by maintaining a single source of truth for project progress in a local `.subconductor/tasks.md` file. It keeps the user informed through a robust notification system that triggers during long-running tasks or checklist completion. This allows agents to "remember" their exact state, completed milestones, and remaining blockers across multiple sessions.

## Quick Start

Add Subconductor to your MCP-compatible host (e.g., Claude Desktop or Gemini) using `npx`:

```json
"subconductor": {
  "command": "npx",
  "args": ["-y", "@psno/subconductor"]
}
```
## Tools Included

### `init_checklist`
Initialize a new checklist
- **Arguments**: 
  - `tasks` (string[]): List of tasks to perform (e.g., file paths, function names, or high-level goals).
  - `goal` (string): The high-level objective of the workflow.
- **Effect**: Creates a `.subconductor/tasks.md` file with the goal and a markdown checklist.

### `get_pending_task`
Retrieves the next uncompleted task from the checklist.
- **Effect**: Returns the first task name marked with `- [ ]`. Returns `DONE` if all tasks are completed.

### `get_pending_tasks`
Retrieves a batch of uncompleted tasks.
- **Arguments**:
  - `count` (number): The number of pending tasks to retrieve (default: 5).
- **Effect**: Returns a list of tasks or `DONE`.

### `mark_task_done`
Updates a specific task's status to completed.
- **Arguments**: 
  - `task` (string): The exact task name to mark as completed.
  - `note` (string, optional): An additional note or status message to append to the task.
- **Effect**: Updates the checkbox from `- [ ]` to `- [x]` and appends any provided note in the manifest. Automatically triggers a notification upon completion of the final task.

### `mark_tasks_done`
Marks multiple tasks as completed in a single operation.
- **Arguments**:
  - `tasks` (object[]): List of tasks with `name` and optional `note`.
- **Effect**: Batch-updates task states and records logs in the manifest.

### `alert`
Sends a system-level notification with sound and icon support.
- **Arguments**:
  - `title` (string): The title of the notification.
  - `message` (string): The message body.
  - `status` ('info' | 'warn' | 'error'): The severity level (default: 'info').
- **Effect**: Triggers a desktop notification with status-specific icons and sounds.

## Resources
**[Changelog](./CHANGELOG.md)** - Check out the latest changes.

## License & Attribution

This project is licensed under the **Apache License 2.0**.

**Important Attribution Requirement:**
In accordance with Section 4(d) of the Apache License, if you modify this software or build new features based on this codebase, you **must** retain the attribution to **Paul Benchea** as the original author. Please refer to the [NOTICE](./NOTICE) file for specific details.

---

*Built with the Model Context Protocol.*