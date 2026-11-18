import fs from 'fs/promises';
import path from 'path';
import { CHECKLISTS_INDEX_FILE, PROJECT_STATE_FILE, WORKING_DIR } from '../models/constants.js';
import type { ProjectInfo } from '../models/interfaces.js';

export class ProjectService {
  async isInitialized(): Promise<boolean> {
    try {
      await fs.access(PROJECT_STATE_FILE);
      return true;
    } catch {
      return false;
    }
  }

  async getProjectInfo(): Promise<ProjectInfo | null> {
    try {
      const data = await fs.readFile(PROJECT_STATE_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async analyzeProject(): Promise<string> {
    const root = process.cwd();
    
    // 1. Analyze package.json
    let pkg: any = {};
    try {
      const pkgData = await fs.readFile(path.join(root, 'package.json'), 'utf-8');
      pkg = JSON.parse(pkgData);
    } catch {}

    // 2. Scan Directory Structure
    let structure: string[] = [];
    try {
      const entries = await fs.readdir(root, { withFileTypes: true });
      structure = entries
        .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
        .map(e => e.isDirectory() ? `${e.name}/` : e.name);
    } catch {}

    // 3. Read README
    let readme = '';
    try {
      const readmeData = await fs.readFile(path.join(root, 'README.md'), 'utf-8');
      readme = readmeData.split('\n').slice(0, 10).join('\n').trim();
    } catch {}

    // 4. Summarize Checklists
    let checklistsSummary = 'No active checklists.';
    try {
      const indexData = await fs.readFile(CHECKLISTS_INDEX_FILE, 'utf-8');
      const lines = indexData.split('\n');
      const activeTasks = lines.filter(l => l.includes('| Active |')).length;
      const doneTasks = lines.filter(l => l.includes('| Done |')).length;
      const idleTasks = lines.filter(l => l.includes('| Idle |')).length;
      checklistsSummary = `${activeTasks} Active, ${idleTasks} Idle, ${doneTasks} Completed checklists found.`;
    } catch {}

    const info: ProjectInfo = {
      name: pkg.name || path.basename(root),
      version: pkg.version || '0.0.0',
      description: pkg.description,
      techStack: {
        language: pkg.devDependencies?.typescript ? 'TypeScript' : 'JavaScript',
        dependencies: Object.keys(pkg.dependencies || {}).slice(0, 10)
      },
      structure,
      readmeSummary: readme || 'No README found.',
      checklistsSummary,
      initializedAt: new Date().toISOString()
    };

    // Ensure WORKING_DIR exists
    try {
      await fs.mkdir(WORKING_DIR, { recursive: true });
    } catch {}

    await fs.writeFile(PROJECT_STATE_FILE, JSON.stringify(info, null, 2));

    return this.formatAnalysis(info);
  }

  private formatAnalysis(info: ProjectInfo): string {
    return `
# Project Analysis: ${info.name} (v${info.version})
${info.description ? `\n> ${info.description}` : ''}

## 🚀 Tech Stack
- **Language**: ${info.techStack.language}
- **Key Dependencies**: ${info.techStack.dependencies.join(', ') || 'None'}

## 📂 Project Structure
\`\`\`
${info.structure.join('\n')}
\`\`\`

## 📖 README Snippet
${info.readmeSummary}

## 📝 Subconductor Status
${info.checklistsSummary}

---
**Status**: Initialized at ${new Date(info.initializedAt).toLocaleString()}
Subconductor is now ready to track tasks for this project.
`.trim();
  }
}

export const projectService = new ProjectService();