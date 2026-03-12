# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-03-12

### Added
- **Multiple Checklists**: Transitioned storage mechanism to support multiple independent checklists organized within a `.subconductor/checklists` directory.
- **Checklists Index**: Introduced a central `.subconductor/checklists.md` index file tracking active, idle, and completed checklists.
- **Checklist Activation**: Introduced the `activate_checklist` tool allowing explicit switching between tracked checklists using their numeric index ID or goal name.
- **Dynamic Task Management**: Introduced `add_task`, `add_tasks`, `remove_task`, and `remove_tasks` tools for runtime modifications of active checklists.
- **Initial Notes Support**: Task initialization natively supports inputting tasks as objects with pre-populated `note` values.
- **Goal Progress Tracking**: Integrated visual progress tracking (`[resolved/total]`) directly in the header of the active checklist file and the central index.
- **Immutable Monotonic IDs**: Task and checklist IDs now monotonically increment and remain strictly immutable after deletions, drastically reducing context-drift during batch operations.
- **Auto-Migration**: Built-in backward compatibility transparently parses, auto-migrates, and structurally aligns any legacy `tasks.md` format directly into the modern `1.2.0` multi-checklist directory upon its first access.

### Changed
- **Enum-based Status Tracking**: Deprecated textual bracket strings (`[ ]`, `[x]`) in favor of strongly-typed `Idle` and `Done` text tracking inside Markdown tables.
- **Codebase Standardization**: Systematically refactored the core library to remove all ambiguous variable abbreviations, improving strict typing, enum-based configuration, and maintainability.

## [1.1.0] - 2026-03-05

### Added
- **Table-Based Manifest**: Transitioned task storage from a simple list to a structured Markdown table, providing a more professional and readable audit trail.
- **Custom Columns**: Added support for defining arbitrary custom columns during checklist initialization via the `init_checklist` tool.
- **Dynamic Note Management**: Implemented dynamic addition of the `Notes` column only when a note is actually provided, keeping the initial manifest compact.
- **Reversion Support**: Introduced `unmark_task` and `unmark_tasks` tools to allow reverting completed tasks back to a pending state with automatic note stripping.
- **Task IDs**: Implemented a numeric task ID system for highly token-efficient task selection and completion.
- **CLI Configuration**: Added command-line flags (`--disable-batch`, `--disable-alerts`) to customize server behavior at startup.
- **Batch Operations**: Introduced `get_pending_tasks` and `mark_tasks_done` tools to handle multiple tasks in a single call, significantly improving workflow efficiency.
- **Task Notes**: Added support for optional notes when marking tasks as complete. Notes are persisted in the manifest and can be appended (using `|` separator) if a task is updated multiple times.
- **Notifications**: Integrated `node-notifier` to provide system-level alerts for checklist completion and custom user alerts.
- **Alert Tool**: New `alert` MCP tool to trigger notifications with custom title, message, and severity (`info`, `warn`, `error`).
- **Assets**: Added status-specific icons (`info.png`, `warn.png`, `error.png`) and sounds for notifications.
- **Build System**: Added `copy-assets` script to ensure notification assets are correctly bundled in the `dist` directory.

### Changed
- **Tool Descriptions**: Enhanced descriptions for all MCP tools to provide better guidance for LLM agents during tool analysis.
- **Robust Matching**: Refactored task identification logic to be case-insensitive and resilient to dynamic structural changes in the manifest table.
- **Modular Architecture**: Refactored the monolithic `index.ts` into a modular structure:
  - `src/models`: Centralized constants and enums.
  - `src/services`: Decoupled logic for tasks and notifications.
  - `src/tools`: Specialized registration for task and alert tools.
- **Task Generalization**: Refactored `init_checklist` and `mark_task_done` to support any string-based task (e.g., function names, architectural goals) instead of being restricted to file paths.

### Fixed
- Improved task matching logic in `mark_task_done` to ensure precise identification even when complex notes are present in the manifest.
- Improved error handling in `get_pending_task` when no checklist is initialized.
- Standardized checkbox handling for reliable task state transitions.

## [1.0.2] - 2026-02-04

### Changed
- Enhanced `package.json` with repository details, bugs, homepage, and search keywords.
- Optimized documentation and build configuration.

## [1.0.1] - 2026-02-04

### Added
- Initial release of Subconductor MCP server.
- Basic task tracking with `init_checklist`, `get_pending_task`, and `mark_task_done`.
- Persistent state management using `.subconductor/tasks.md`.
