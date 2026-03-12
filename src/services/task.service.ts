import fs from 'fs/promises';
import path from 'path';
import { TASK_FILE, WORKING_DIR, CHECKLISTS_DIR, CHECKLISTS_INDEX_FILE } from '../models/constants.js';
import { AlertType, TaskColumn, ChecklistStatus } from '../models/enums.js';
import { notificationService } from './notification.service.js';
import type { TaskInput } from '../models/interfaces.js';

export class TaskService {
  private readonly DEFAULT_COLUMNS = [TaskColumn.Status, TaskColumn.ID, TaskColumn.Name];

  async ensureInit(): Promise<void> {
    try { await fs.mkdir(WORKING_DIR, { recursive: true }); } catch (error) {}
    try { await fs.mkdir(CHECKLISTS_DIR, { recursive: true }); } catch (error) {}
    try {
      await fs.access(CHECKLISTS_INDEX_FILE);
    } catch (error) {
      await fs.writeFile(CHECKLISTS_INDEX_FILE, '# Subconductor Checklists\n\n| Status | Progress | Goal | Path |\n| :--- | :--- | :--- | :--- |');
    }

    try {
      await fs.access(TASK_FILE);
      const data = await fs.readFile(TASK_FILE, 'utf-8');
      const sections = data.split('\n\n');
      const goalSection = sections[0] || '';
      const goalMatch = goalSection.match(/# Goal:\s*(?:\[\d+\/\d+\]\s*)?(.*)/);
      const goal = goalMatch && goalMatch[1] ? goalMatch[1].trim() : 'Legacy Checklist';
      
      const shortName = goal.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20).replace(/^-|-$/g, '') || 'legacy';
      
      const checklistDir = path.join(CHECKLISTS_DIR, shortName);
      await fs.mkdir(checklistDir, { recursive: true });
      const checklistPath = path.join(checklistDir, 'checklist.md');
      
      await fs.rename(TASK_FILE, checklistPath);
      
      await this.updateChecklistsIndex(shortName, goal, 0, 0, ChecklistStatus.Active);
      await this.syncProgress(checklistPath);
    } catch (error) {}
  }

  private async getActiveChecklistPath(): Promise<string> {
    await this.ensureInit();
    try {
      const indexData = await fs.readFile(CHECKLISTS_INDEX_FILE, 'utf-8');
      const lines = indexData.split('\n');
      for (const line of lines) {
        if (line.includes(ChecklistStatus.Active)) {
          const match = line.match(/\((.*?)\)/);
          if (match) {
            return path.join(WORKING_DIR, match[1]);
          }
        }
      }
    } catch (error) {}
    
    throw new Error('No active checklist found or invalid format. Run init_checklist first.');
  }

  private async updateChecklistsIndex(shortName: string, goal: string, resolved: number, total: number, status: ChecklistStatus): Promise<void> {
    let indexData = '';
    try {
      indexData = await fs.readFile(CHECKLISTS_INDEX_FILE, 'utf-8');
    } catch (error) {
      indexData = '';
    }

    const lines = indexData.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const relativePath = `./checklists/${shortName}/checklist.md`;
    const progress = `[${resolved}/${total}]`;
    const statusText = status === ChecklistStatus.Done ? '[x] Done' : `[ ] ${status}`;
    const newEntry = `| ${statusText} | ${progress} | ${goal} | [Link](${relativePath}) |`;

    const existingRows: string[] = [];
    for (const line of lines) {
      if (line.startsWith('|') && !line.includes('Status | Progress') && !line.includes(':---')) {
        existingRows.push(line);
      }
    }

    let updatedRows: string[] = [];
    let found = false;
    for (const row of existingRows) {
      if (row.includes(`(${relativePath})`)) {
        updatedRows.push(newEntry);
        found = true;
      } else {
        let processedRow = row;
        if (status === ChecklistStatus.Active) {
          processedRow = row.replace(ChecklistStatus.Active, ChecklistStatus.Idle);
        }
        updatedRows.push(processedRow);
      }
    }

    if (!found) {
      updatedRows.push(newEntry);
    }

    const finalContent = [
      '# Subconductor Checklists',
      '',
      '| Status | Progress | Goal | Path |',
      '| :--- | :--- | :--- | :--- |',
      ...updatedRows
    ].join('\n');

    await fs.writeFile(CHECKLISTS_INDEX_FILE, finalContent);
  }

  async initChecklist(tasks: TaskInput[], goal: string, columns?: string[]): Promise<number> {
    await this.ensureInit();
    const sanitizedGoal = goal.replace(/[\r\n]+/g, ' ').trim();
    const shortName = sanitizedGoal.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20).replace(/^-|-$/g, '') || 'default';
    const checklistDir = path.join(CHECKLISTS_DIR, shortName);
    await fs.mkdir(checklistDir, { recursive: true });
    const checklistPath = path.join(checklistDir, 'checklist.md');

    const headers = columns && columns.length > 0 ? [...columns] : [...this.DEFAULT_COLUMNS];
    
    if (!headers.some(column => column.toLowerCase() === TaskColumn.Status.toLowerCase())) {
      headers.unshift(TaskColumn.Status);
    }
    if (!headers.some(column => column.toLowerCase() === TaskColumn.ID.toLowerCase())) {
      headers.splice(headers.findIndex(column => column.toLowerCase() === TaskColumn.Status.toLowerCase()) + 1, 0, TaskColumn.ID);
    }
    if (!headers.some(column => column.toLowerCase() === TaskColumn.Name.toLowerCase())) {
      headers.splice(headers.findIndex(column => column.toLowerCase() === TaskColumn.ID.toLowerCase()) + 1, 0, TaskColumn.Name);
    }

    const hasNotes = tasks.some(task => task.note);
    if (hasNotes && !headers.some(column => column.toLowerCase() === TaskColumn.Notes.toLowerCase() || column.toLowerCase() === 'notes')) {
      headers.push(TaskColumn.Notes);
    }

    const markdownHeader = `| ${headers.join(' | ')} |`;
    const separator = `| ${headers.map(() => ':---').join(' | ')} |`;
    
    const rows = tasks.map((taskInput, index) => {
      let taskName = taskInput.name;
      let note = taskInput.note || '';
      
      taskName = taskName.replace(/[\r\n]+/g, ' ').trim();
      if (taskName.startsWith('- [ ] ')) {
        taskName = taskName.replace(/^-\s*\[\s*]\s*/, '').trim();
      }
      
      const rowData: string[] = headers.map(column => {
        const columnLower = column.toLowerCase();
        if (columnLower === TaskColumn.Status.toLowerCase()) return '[ ]';
        if (columnLower === TaskColumn.ID.toLowerCase()) return `${index + 1}`;
        if (columnLower === TaskColumn.Name.toLowerCase()) return taskName;
        if (columnLower === TaskColumn.Notes.toLowerCase() || columnLower === 'notes') return note;
        return '';
      });
      
      return `| ${rowData.join(' | ')} |`;
    });

    const content = `# Goal: [0/${tasks.length}] ${sanitizedGoal}\n\n${markdownHeader}\n${separator}\n${rows.join('\n')}`;
    await fs.writeFile(checklistPath, content);
    
    await this.updateChecklistsIndex(shortName, sanitizedGoal, 0, tasks.length, ChecklistStatus.Active);

    return tasks.length;
  }

  private parseTable(data: string): { columns: string[], rows: string[][] } {
    const lines = data.split('\n').map(line => line.trim()).filter(line => line.startsWith('|'));
    if (lines.length < 2) throw new Error('Invalid task table format.');

    const columns = lines[0].split('|').map(column => column.trim()).filter(column => column !== '');
    const rows = lines.slice(2).map(line => {
      const cells = line.split('|').map(cell => cell.trim());
      return cells.slice(1, -1);
    });

    return { columns, rows };
  }

  private stringifyTable(columns: string[], rows: string[][]): string {
    const header = `| ${columns.join(' | ')} |`;
    const separator = `| ${columns.map(() => ':---').join(' | ')} |`;
    const rowLines = rows.map(row => `| ${row.join(' | ')} |`);
    return `${header}\n${separator}\n${rowLines.join('\n')}`;
  }

  private updateGoalHeader(goalSection: string, resolved: number, total: number): string {
    return goalSection.replace(/# Goal: (\[\d+\/\d+\] )?/, `# Goal: [${resolved}/${total}] `);
  }

  private async syncProgress(filePath: string): Promise<boolean> {
    const data = await fs.readFile(filePath, 'utf-8');
    const sections = data.split('\n\n');
    let goalSection = sections[0];
    const tableData = sections.slice(1).join('\n\n');
    const { columns, rows } = this.parseTable(tableData);
    
    const statusIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.Status.toLowerCase());
    const total = rows.length;
    const resolved = rows.filter(row => row[statusIndex] === '[x]').length;
    const isDone = total > 0 && resolved === total;
    
    goalSection = this.updateGoalHeader(goalSection, resolved, total);
    const newTable = this.stringifyTable(columns, rows);
    await fs.writeFile(filePath, `${goalSection}\n\n${newTable}`);

    const goalMatch = goalSection.match(/# Goal: \[\d+\/\d+\] (.*)/);
    const goal = goalMatch ? goalMatch[1].trim() : 'Unknown Goal';
    
    const normalizedPath = filePath.replace(/\\/g, '/');
    const match = normalizedPath.match(/checklists\/([^\/]+)\/checklist\.md/);
    if (match) {
      await this.updateChecklistsIndex(match[1], goal, resolved, total, isDone ? ChecklistStatus.Done : ChecklistStatus.Active);
    }
    
    return isDone;
  }

  async getPendingTask(): Promise<string | null> {
    const activePath = await this.getActiveChecklistPath();
    try {
      const data = await fs.readFile(activePath, 'utf-8');
      const { columns, rows } = this.parseTable(data);
      
      const statusIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.Status.toLowerCase());
      const idIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.ID.toLowerCase());
      const nameIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.Name.toLowerCase());

      const pendingRow = rows.find(row => row[statusIndex] === '[ ]');
      if (!pendingRow) return null;

      return `(#${pendingRow[idIndex]}) ${pendingRow[nameIndex]}`;
    } catch (error) {
      throw new Error('No active checklist found or invalid format. Run init_checklist first.');
    }
  }

  async getPendingTasks(count: number = 5): Promise<string[]> {
    const activePath = await this.getActiveChecklistPath();
    try {
      const data = await fs.readFile(activePath, 'utf-8');
      const { columns, rows } = this.parseTable(data);
      
      const statusIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.Status.toLowerCase());
      const idIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.ID.toLowerCase());
      const nameIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.Name.toLowerCase());

      return rows
        .filter(row => row[statusIndex] === '[ ]')
        .slice(0, count)
        .map(row => `(#${row[idIndex]}) ${row[nameIndex]}`);
    } catch (error) {
      throw new Error('No active checklist found or invalid format. Run init_checklist first.');
    }
  }

  async markTasksDone(tasks: { name: string, note?: string }[]): Promise<{ name: string, success: boolean }[]> {
    const results = [];
    for (const task of tasks) {
      const success = await this.markTaskDone(task.name, task.note);
      results.push({ name: task.name, success });
    }
    return results;
  }

  async unmarkTasks(tasks: string[]): Promise<{ name: string, success: boolean }[]> {
    const results = [];
    for (const task of tasks) {
      const success = await this.unmarkTask(task);
      results.push({ name: task, success });
    }
    return results;
  }

  async markTaskDone(taskIdentifier: string, note?: string): Promise<boolean> {
    const activePath = await this.getActiveChecklistPath();
    let data = await fs.readFile(activePath, 'utf-8');
    const sections = data.split('\n\n');
    let goalSection = sections[0];
    const tableData = sections.slice(1).join('\n\n');
    
    const { columns, rows } = this.parseTable(tableData);
    
    const statusIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.Status.toLowerCase());
    const idIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.ID.toLowerCase());
    const nameIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.Name.toLowerCase());

    const cleanId = taskIdentifier.replace(/[()#]/g, '').trim();
    const isNumericId = /^\d+$/.test(cleanId);

    const taskRowIndex = rows.findIndex(row => {
      if (row[statusIndex] !== '[ ]') return false;
      if (isNumericId && row[idIndex] === cleanId) return true;
      if (row[nameIndex] === taskIdentifier) return true;
      return false;
    });

    if (taskRowIndex === -1) return false;

    rows[taskRowIndex][statusIndex] = '[x]';
    
    if (note) {
      let notesIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.Notes.toLowerCase() || column.toLowerCase() === 'notes');
      if (notesIndex === -1) {
        columns.push(TaskColumn.Notes);
        notesIndex = columns.length - 1;
        rows.forEach(row => row.push(''));
      }
      const currentNote = rows[taskRowIndex][notesIndex];
      rows[taskRowIndex][notesIndex] = currentNote ? `${currentNote} | ${note}` : note;
    }

    const newTable = this.stringifyTable(columns, rows);
    await fs.writeFile(activePath, `${goalSection}\n\n${newTable}`);

    const isDone = await this.syncProgress(activePath);
    if (isDone) {
      await notificationService.alert('Checklist Complete', 'All tasks in your manifest are finished!', AlertType.Info);
    }

    return true;
  }

  async unmarkTask(taskIdentifier: string): Promise<boolean> {
    const activePath = await this.getActiveChecklistPath();
    let data = await fs.readFile(activePath, 'utf-8');
    const sections = data.split('\n\n');
    let goalSection = sections[0];
    const tableData = sections.slice(1).join('\n\n');
    
    const { columns, rows } = this.parseTable(tableData);
    
    const statusIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.Status.toLowerCase());
    const idIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.ID.toLowerCase());
    const nameIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.Name.toLowerCase());
    const notesIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.Notes.toLowerCase() || column.toLowerCase() === 'notes');

    const cleanId = taskIdentifier.replace(/[()#]/g, '').trim();
    const isNumericId = /^\d+$/.test(cleanId);

    const taskRowIndex = rows.findIndex(row => {
      if (row[statusIndex] !== '[x]') return false;
      if (isNumericId && row[idIndex] === cleanId) return true;
      if (row[nameIndex] === taskIdentifier) return true;
      return false;
    });

    if (taskRowIndex === -1) return false;

    rows[taskRowIndex][statusIndex] = '[ ]';
    if (notesIndex !== -1) {
      rows[taskRowIndex][notesIndex] = '';
    }

    const newTable = this.stringifyTable(columns, rows);
    await fs.writeFile(activePath, `${goalSection}\n\n${newTable}`);
    
    await this.syncProgress(activePath);

    return true;
  }

  async addTask(taskName: string, note?: string): Promise<string> {
    const activePath = await this.getActiveChecklistPath();
    let data = await fs.readFile(activePath, 'utf-8');
    const sections = data.split('\n\n');
    let goalSection = sections[0];
    const tableData = sections.slice(1).join('\n\n');
    
    const { columns, rows } = this.parseTable(tableData);
    
    const newId = (rows.length + 1).toString();
    const rowData: string[] = columns.map(column => {
      const columnLower = column.toLowerCase();
      if (columnLower === TaskColumn.Status.toLowerCase()) return '[ ]';
      if (columnLower === TaskColumn.ID.toLowerCase()) return newId;
      if (columnLower === TaskColumn.Name.toLowerCase()) return taskName;
      if (columnLower === TaskColumn.Notes.toLowerCase() || columnLower === 'notes') return note || '';
      return '';
    });
    
    rows.push(rowData);

    const newTable = this.stringifyTable(columns, rows);
    await fs.writeFile(activePath, `${goalSection}\n\n${newTable}`);
    
    await this.syncProgress(activePath);
    
    return `(#${newId}) ${taskName}`;
  }

  async removeTask(taskIdentifier: string): Promise<boolean> {
    const activePath = await this.getActiveChecklistPath();
    let data = await fs.readFile(activePath, 'utf-8');
    const sections = data.split('\n\n');
    let goalSection = sections[0];
    const tableData = sections.slice(1).join('\n\n');
    
    const { columns, rows } = this.parseTable(tableData);
    
    const statusIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.Status.toLowerCase());
    const idIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.ID.toLowerCase());
    const nameIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.Name.toLowerCase());

    const cleanId = taskIdentifier.replace(/[()#]/g, '').trim();
    const isNumericId = /^\d+$/.test(cleanId);

    const taskRowIndex = rows.findIndex(row => {
      if (isNumericId && row[idIndex] === cleanId) return true;
      if (row[nameIndex] === taskIdentifier) return true;
      return false;
    });

    if (taskRowIndex === -1) return false;

    rows.splice(taskRowIndex, 1);
    
    rows.forEach((row, index) => {
      row[idIndex] = (index + 1).toString();
    });

    const newTable = this.stringifyTable(columns, rows);
    await fs.writeFile(activePath, `${goalSection}\n\n${newTable}`);
    
    await this.syncProgress(activePath);
    
    return true;
  }

  async addTasks(tasks: { name: string, note?: string }[]): Promise<{ name: string, id: string }[]> {
    const activePath = await this.getActiveChecklistPath();
    let data = await fs.readFile(activePath, 'utf-8');
    const sections = data.split('\n\n');
    let goalSection = sections[0];
    const tableData = sections.slice(1).join('\n\n');
    
    const { columns, rows } = this.parseTable(tableData);
    const results: { name: string, id: string }[] = [];
    
    for (const task of tasks) {
      const newId = (rows.length + 1).toString();
      const rowData: string[] = columns.map(column => {
        const columnLower = column.toLowerCase();
        if (columnLower === TaskColumn.Status.toLowerCase()) return '[ ]';
        if (columnLower === TaskColumn.ID.toLowerCase()) return newId;
        if (columnLower === TaskColumn.Name.toLowerCase()) return task.name;
        if (columnLower === TaskColumn.Notes.toLowerCase() || columnLower === 'notes') return task.note || '';
        return '';
      });
      rows.push(rowData);
      results.push({ name: task.name, id: newId });
    }

    const newTable = this.stringifyTable(columns, rows);
    await fs.writeFile(activePath, `${goalSection}\n\n${newTable}`);
    
    await this.syncProgress(activePath);
    
    return results;
  }

  async removeTasks(tasks: string[]): Promise<{ name: string, success: boolean }[]> {
    const activePath = await this.getActiveChecklistPath();
    let data = await fs.readFile(activePath, 'utf-8');
    const sections = data.split('\n\n');
    let goalSection = sections[0];
    const tableData = sections.slice(1).join('\n\n');
    
    const { columns, rows } = this.parseTable(tableData);
    
    const idIndex = columns.findIndex(column => column.toLowerCase() === TaskColumn.ID.toLowerCase());
    
    const results: { name: string, success: boolean }[] = [];

    for (const taskIdentifier of tasks) {
      const cleanId = taskIdentifier.replace(/[()#]/g, '').trim();
      const isNumericId = /^\d+$/.test(cleanId);

      const taskRowIndex = rows.findIndex(row => {
        if (isNumericId && row[idIndex] === cleanId) return true;
        if (row[idIndex] === taskIdentifier) return true;
        return false;
      });

      if (taskRowIndex === -1) {
        results.push({ name: taskIdentifier, success: false });
        continue;
      }

      rows.splice(taskRowIndex, 1);
      results.push({ name: taskIdentifier, success: true });
    }

    rows.forEach((row, index) => {
      row[idIndex] = (index + 1).toString();
    });

    const newTable = this.stringifyTable(columns, rows);
    await fs.writeFile(activePath, `${goalSection}\n\n${newTable}`);
    
    await this.syncProgress(activePath);
    
    return results;
  }
}

export const taskService = new TaskService();