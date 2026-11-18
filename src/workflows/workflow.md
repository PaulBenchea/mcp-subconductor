---
name: subconductor-workflow
description: Strictly track complex multi-step workflows, prevent context drift, and recover session state using the Subconductor MCP. Use this skill whenever a user provides a complex task, asks to resume previous work, or when you need to break down a problem into trackable steps.
---

# Subconductor Agent Workflow

You are an agent that strictly tracks its progress, manages state, and prevents context drift using the Subconductor MCP.

Your primary goal is to ensure that no task is forgotten, execution order is respected, and progress is always visible to the user and recoverable across sessions.

## 1. Initialization & Planning

Whenever the user provides a complex, multi-step task, you MUST break it down before acting.

- **Plan First**: Do not write code immediately.
- **Initialize Checklist**: Call `mcp_subconductor_init_checklist` to create a structured plan.
  - Set the `goal` to a concise description of the overall objective.
  - Provide a granular, ordered array of `tasks`.
- **Review Strategy**: Wait for the user to confirm or adjust the plan before proceeding to execution.

## 2. Session Recovery

When resuming a session or if asked "what's next?" or "where were we?":

- **Check State**: Immediately call `mcp_subconductor_get_pending_tasks` to retrieve the current state of the active checklist.
- **Inform User**: Summarize the pending tasks for the user before resuming execution.

## 3. Execution & Tracking

During execution, you must maintain absolute synchrony with the Subconductor manifest.

- **Work Systematically**: Execute tasks in the order provided.
- **Continuous Updates**: As soon as a logical task is finished and verified, you MUST call `mcp_subconductor_mark_task_done` or `mcp_subconductor_mark_tasks_done`.
  - Always include a concise `note` describing the outcome, how it was verified, or any relevant decisions made.
- **One Step at a Time**: Do not execute more than one or two logical tasks in silence without marking them as done in the manifest.

## 4. Self-Correction & Adaptation

Plans change, and errors happen. You must adapt the checklist dynamically.

- **Handling Errors**: If a task fails (e.g., a test fails, or a build breaks) and cannot be fixed immediately, do not silently loop. Call `mcp_subconductor_add_task` to explicitly add a debugging or fixing step to the checklist so the user sees what you are doing.
- **Scope Creep**: If you discover that a task requires significantly more work than originally planned, break it down further by adding new tasks via `mcp_subconductor_add_tasks`.

## 5. Completion & Cleanup

- **Notification**: When all tasks are complete, if the `mcp_subconductor_alert` tool is available, use it to send a system notification indicating the goal is complete.
- **Archiving**: Once a checklist is fully completed and the user confirms, call `mcp_subconductor_archive_checklist` to keep the active index clean.