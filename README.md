# Subconductor

A persistent state machine and notification system for AI agents to manage complex, multi-step workflows via the Model Context Protocol (MCP).

Subconductor prevents "context drift" by maintaining a single source of truth for project progress in a structured `.subconductor/tasks.md` Markdown table. It keeps the user informed through a robust notification system that triggers during long-running tasks or checklist completion. This allows agents to "remember" their exact state, completed milestones, and remaining blockers across multiple sessions.

## Quick Start

Add Subconductor to your MCP-compatible host (e.g., Claude Desktop or Gemini) using `npx`:

```json
"subconductor": {
  "command": "npx",
  "args": ["-y", "@psno/subconductor"]
}
```

### Configuration Flags
You can customize the server behavior using the following flags:
- `--disable-batch` (or `-b`): Disable batch operation tools (`get_pending_tasks`, `mark_tasks_done`, `unmark_tasks`).
- `--disable-alerts` (or `-a`): Disable all desktop notifications and the `alert` tool.

## Tools Included

### `init_checklist`
Initialize a new task checklist stored as a Markdown table.
- **Arguments**: 
  - `tasks` (string[]): List of tasks to perform (e.g., file paths, function names, or high-level goals).
  - `goal` (string): The high-level objective of the workflow.
  - `columns` (string[], optional): Custom columns for the task table. `Status`, `ID`, and `Name` are always included.
- **Effect**: Creates a `.subconductor/tasks.md` file with the goal and a structured task table.

### `get_pending_task`
Retrieves the next uncompleted task from the checklist.
- **Effect**: Returns the first task with an ID prefix (e.g., `(#1) Task Name`). Returns `DONE` if all tasks are completed.

### `get_pending_tasks`
Retrieves a batch of uncompleted tasks (requires batch tools enabled).
- **Arguments**:
  - `count` (number): The number of pending tasks to retrieve (default: 5).
- **Effect**: Returns a list of tasks with ID prefixes or `DONE`.

### `mark_task_done`
Updates a specific task's status to completed.
- **Arguments**: 
  - `task` (string): The task ID (e.g., "1") or the full task name.
  - `note` (string, optional): An additional note or status message.
- **Effect**: Updates the status to `[x]` and records the note in the `Notes` column (created dynamically if missing). Automatically triggers a notification upon completion of the final task.

### `mark_tasks_done`
Marks multiple tasks as completed in a single operation (requires batch tools enabled).
- **Arguments**:
  - `tasks` (object[]): List of tasks with `name` (ID or full name) and optional `note`.
- **Effect**: Batch-updates task states and records notes in the manifest.

### `unmark_task`
Reverts a completed task back to pending status.
- **Arguments**:
  - `task` (string): The task ID (e.g., "1") or the full task name.
- **Effect**: Reverts status to `[ ]` and clears any associated completion notes.

### `unmark_tasks`
Reverts multiple tasks to pending status in a single operation (requires batch tools enabled).
- **Arguments**:
  - `tasks` (string[]): List of task IDs or full names to unmark.
- **Effect**: Batch-reverts task states and clears notes.

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