# Subconductor

A persistent state machine and notification system for AI agents to manage complex, multi-step workflows via the Model Context Protocol (MCP).

Subconductor prevents "context drift" by maintaining a single source of truth for project progress across multiple independent checklists. It stores these in a structured `.subconductor/checklists/` directory along with a global `.subconductor/checklists.md` index file. It keeps the user informed through a robust notification system that triggers during long-running tasks or checklist completion. This allows agents to "remember" their exact state, completed milestones, and remaining blockers across multiple sessions and parallel workflows.

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
- `--disable-batch` (or `-b`): Disable batch operation tools (`get_pending_tasks`, `mark_tasks_done`, `unmark_tasks`, `add_tasks`, `remove_tasks`).
- `--disable-alerts` (or `-a`): Disable all desktop notifications and the `alert` tool.

## Tools Included

### `init_checklist`
Initialize a new task checklist. This automatically creates a dedicated folder and registers the checklist in the central index.
- **Arguments**: 
  - `tasks` (array): List of tasks to perform. Can be strings or objects with `name` and an optional `note`.
  - `goal` (string): The high-level objective of the workflow.
  - `columns` (string[], optional): Custom columns for the task table. `Status`, `ID`, and `Name` are always included.
- **Effect**: Creates a nested `.subconductor/checklists/<goal-slug>/checklist.md` file and updates the active pointer in `.subconductor/checklists.md`.

### `activate_checklist`
Switch the active context to a different, previously initialized checklist.
- **Arguments**: 
  - `checklistName` (string): The numeric ID from the index, or a partial string match of the checklist's goal name.
- **Effect**: Updates `.subconductor/checklists.md` to mark the targeted checklist as `Active` and all others as `Idle`.

### `get_pending_task`
Retrieves the next uncompleted task from the active checklist.
- **Effect**: Returns the first task with an ID prefix (e.g., `(#1) Task Name`). Returns `DONE` if all tasks are completed.

### `get_pending_tasks`
Retrieves a batch of uncompleted tasks from the active checklist (requires batch tools enabled).
- **Arguments**:
  - `count` (number): The number of pending tasks to retrieve (default: 5).
- **Effect**: Returns a list of tasks with ID prefixes or `DONE`.

### `add_task`
Appends a new task to the active checklist dynamically.
- **Arguments**: 
  - `name` (string): The name of the task.
  - `note` (string, optional): An optional note.
- **Effect**: Appends the task, automatically assigns a monotonic immutable ID, and updates the completion header.

### `remove_task`
Deletes a task from the active checklist.
- **Arguments**: 
  - `task` (string): The task ID (e.g., "1") or the full task name.
- **Effect**: Removes the task row and updates the completion header. Note: Existing task IDs remain immutable and are not shifted.

### `mark_task_done`
Updates a specific task's status to completed in the active checklist.
- **Arguments**: 
  - `task` (string): The task ID (e.g., "1") or the full task name.
  - `note` (string, optional): An additional note or status message.
- **Effect**: Updates the status to `Done` and records the note in the `Notes` column. Automatically triggers a notification upon completion of the final task in the active checklist.

### `unmark_task`
Reverts a completed task back to pending status.
- **Arguments**:
  - `task` (string): The task ID (e.g., "1") or the full task name.
- **Effect**: Reverts status to `Idle`, clears associated notes, and rolls back the completion goal header.

### Batch Operations
If batch operations are enabled, the following multi-task variants of the above tools are also available:
- `add_tasks`: Adds an array of tasks.
- `remove_tasks`: Safely deletes an array of task IDs.
- `mark_tasks_done`: Marks an array of tasks complete.
- `unmark_tasks`: Reverts an array of tasks to idle.

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