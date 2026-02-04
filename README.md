# Subconductor

A persistent state machine for AI agents to manage complex, multi-step workflows via the Model Context Protocol (MCP).

Subconductor prevents "context drift" by maintaining a single source of truth for project progress in a local `.subconductor/tasks.md` file. This allows agents to "remember" their exact state, completed milestones, and remaining blockers across multiple sessions.

## 🚀 Quick Start

Add Subconductor to your MCP-compatible host (e.g., Claude Desktop or Gemini) using `npx`:

```json
"subconductor": {
  "command": "npx",
  "args": ["-y", "@psno/subconductor"]
}
```
## 🛠 Tools Included

### `init_checklist`
Initializes a new project state and generates the tracking infrastructure.
- **Arguments**: 
  - `paths` (string[]): List of file paths relevant to the task.
  - `goal` (string): The high-level objective of the workflow.
- **Effect**: Creates a `.subconductor/tasks.md` file with the goal and a markdown checklist.

### `get_pending_task`
Retrieves the next uncompleted task from the checklist.
- **Effect**: Reads the `.subconductor/tasks.md` file and returns the first file path marked with `- [ ]`. Returns `DONE` if all tasks are completed.

### `mark_task_done`
Updates a specific task's status to completed.
- **Arguments**: 
  - `path` (string): The exact file path to mark as completed.
- **Effect**: Updates the checkbox for the specified path from `- [ ]` to `- [x]` in the `.subconductor/tasks.md` file.

## ⚖️ License & Attribution

This project is licensed under the **Apache License 2.0**.

**Important Attribution Requirement:**
In accordance with Section 4(d) of the Apache License, if you modify this software or build new features based on this codebase, you **must** retain the attribution to **Paul Benchea** as the original author. Please refer to the [NOTICE](./NOTICE) file for specific details.

---

*Built with the Model Context Protocol.*