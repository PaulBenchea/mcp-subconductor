# Contributing to Subconductor

First off, thank you for considering contributing to Subconductor! It's people like you that make open-source tools better for everyone.

The following is a set of guidelines for contributing to this project. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Table of Contents
1. [Reporting Bugs](#reporting-bugs)
2. [Suggesting Enhancements](#suggesting-enhancements)
3. [Local Development](#local-development)
4. [Coding Standards](#coding-standards)
5. [Commit Message Convention](#commit-message-convention)
6. [Pull Requests](#pull-requests)

## Reporting Bugs
Bugs are tracked as GitHub issues. When creating an issue, please provide:
* A quick summary and/or background.
* Steps to reproduce the bug. Be as specific as possible.
* What you expected would happen, and what actually happened.
* Your operating system, Node.js version, and the MCP client you are using (e.g., Claude Desktop, Gemini CLI).

## Suggesting Enhancements
Enhancement suggestions are tracked as GitHub issues. When creating an enhancement issue, please:
* Use a clear and descriptive title for the issue to identify the suggestion.
* Provide a step-by-step description of the suggested enhancement in as many details as possible.
* Describe the current behavior and explain which behavior you expected to see instead and why.

## Local Development

To set up the project locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/psno/subconductor.git
   cd subconductor
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```
   *Note: This runs TypeScript compilation and copies necessary assets to the `dist` folder.*

4. **Testing locally with `npm link`:**
   To easily test your local changes across your system (such as inside Claude Desktop or Gemini CLI), you can create a global symlink:
   ```bash
   npm link
   ```
   Once linked, you can update your MCP client's configuration file to call your local build directly, instead of using `npx`:
   ```json
   "subconductor": {
     "command": "subconductor",
     "args": []
   }
   ```
   *Remember to run `npm run build` each time you make a change so your linked version reflects the latest code.*

## Coding Standards
To maintain a high-quality codebase, we enforce strict naming and typing conventions:
* **No Abbreviations**: Variables must be fully spelled out. Do not use abbreviations like `c`, `idx`, `err`, `req`, etc. Use `column`, `index`, `error`, `request`, respectively.
* **Strict Typing**: Avoid the `any` type in TypeScript wherever possible.
* **Clear Logic**: Write code that is self-documenting. If it requires a comment to explain *what* it is doing, the code should be refactored to be clearer.

## Commit Message Convention
We use a strict commit message format to keep the Git history clean and readable. Please format your commit messages as follows:

`[scope][subscope] Description` or `[scope] Description`

* **Scope**: Represents the area of the codebase being modified (e.g., `app`, `services`, `tools`, `models`, `docs`).
* **Subscope** *(optional)*: Provides more context (e.g., `[tools][task]`).
* **Description**: A short, capitalized, imperative sentence explaining the change (no trailing period).

**Examples:**
* `[services] Implement monotonic task IDs`
* `[docs] Add CONTRIBUTING.md file`
* `[models][enums] Add ChecklistStatus enum`

## Pull Requests
1. Fork the repo and create your branch from `main`.
2. Ensure your code follows the [Coding Standards](#coding-standards).
3. Ensure the project builds successfully (`npm run build`).
4. Commit your changes using the [Commit Message Convention](#commit-message-convention).
5. Open a Pull Request detailing what you changed and why.