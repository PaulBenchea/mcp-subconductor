# Changelog

All notable changes to this project will be documented in this file.

## [1.0.2] - 2026-03-02

### Added
- **Desktop Notifications**: Integrated `node-notifier` to provide system-level alerts for checklist completion and custom user alerts.
- **Alert Tool**: New `alert` MCP tool to trigger notifications with custom title, message, and severity (`info`, `warn`, `error`).
- **Assets**: Added status-specific icons (`info.png`, `warn.png`, `error.png`) and sounds for notifications.
- **Build System**: Added `copy-assets` script to ensure notification assets are correctly bundled in the `dist` directory.

### Changed
- **Modular Architecture**: Refactored the monolithic `index.ts` into a modular structure:
  - `src/models`: Centralized constants and enums.
  - `src/services`: Decoupled logic for tasks and notifications.
  - `src/tools`: Specialized registration for task and alert tools.
- **Improved Windows Support**: Set `appID` to "Subconductor" for cleaner Windows Toast notifications (no more "Snore").
- **Configuration**: Enhanced `package.json` with repository details and search keywords.

### Fixed
- Improved error handling in `get_pending_task` when no checklist is initialized.
- Standardized checkbox handling for reliable task state transitions.

## [1.0.1] - 2026-02-04

### Added
- Initial release of Subconductor MCP server.
- Basic task tracking with `init_checklist`, `get_pending_task`, and `mark_task_done`.
- Persistent state management using `.subconductor/tasks.md`.
