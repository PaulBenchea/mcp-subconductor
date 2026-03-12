import fs from 'fs/promises';
import { TASK_FILE, WORKING_DIR } from '../models/constants.js';
import { AlertType, TaskColumn } from '../models/enums.js';
import { notificationService } from './notification.service.js';
import type { TaskInput } from '../models/interfaces.js';

export class TaskService {
  private readonly DEFAULT_COLUMNS = [TaskColumn.Status, TaskColumn.ID, TaskColumn.Name];

  async ensureInit(): Promise<void> {
    try {
      await fs.mkdir(WORKING_DIR, { recursive: true });
    } catch (e) {}
  }

  async initChecklist(tasks: TaskInput[], goal: string, columns?: string[]): Promise<number> {
    await this.ensureInit();
    const sanitizedGoal = goal.replace(/[\r\n]+/g, ' ').trim();
    const cols = columns && columns.length > 0 ? [...columns] : [...this.DEFAULT_COLUMNS];
    
    if (!cols.some(c => c.toLowerCase() === TaskColumn.Status.toLowerCase())) cols.unshift(TaskColumn.Status);
    if (!cols.some(c => c.toLowerCase() === TaskColumn.ID.toLowerCase())) cols.splice(cols.findIndex(c => c.toLowerCase() === TaskColumn.Status.toLowerCase()) + 1, 0, TaskColumn.ID);
    if (!cols.some(c => c.toLowerCase() === TaskColumn.Name.toLowerCase())) cols.splice(cols.findIndex(c => c.toLowerCase() === TaskColumn.ID.toLowerCase()) + 1, 0, TaskColumn.Name);

    const hasNotes = tasks.some(t => t.note);
    if (hasNotes && !cols.some(c => c.toLowerCase() === TaskColumn.Notes.toLowerCase() || c.toLowerCase() === 'note')) {
      cols.push(TaskColumn.Notes);
    }

    const header = `| ${cols.join(' | ')} |`;
    const separator = `| ${cols.map(() => ':---').join(' | ')} |`;
    
    const rows = tasks.map((original, index) => {
      let t = original.name;
      let note = original.note || '';
      
      t = t.replace(/[\r\n]+/g, ' ').trim();
      if (t.startsWith('- [ ] ')) {
        t = t.replace(/^-\s*\[\s*]\s*/, '').trim();
      }
      
      const rowData: string[] = cols.map(col => {
        const c = col.toLowerCase();
        if (c === TaskColumn.Status.toLowerCase()) return '[ ]';
        if (c === TaskColumn.ID.toLowerCase()) return `${index + 1}`;
        if (c === TaskColumn.Name.toLowerCase()) return t;
        if (c === TaskColumn.Notes.toLowerCase() || c === 'note') return note;
        return '';
      });
      
      return `| ${rowData.join(' | ')} |`;
    });

    const content = `# Goal: [0/${tasks.length}] ${sanitizedGoal}\n\n${header}\n${separator}\n${rows.join('\n')}`;
    await fs.writeFile(TASK_FILE, content);
    return tasks.length;
  }

  private parseTable(data: string): { columns: string[], rows: string[][] } {
    const lines = data.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
    if (lines.length < 2) throw new Error('Invalid task table format.');

    const columns = lines[0].split('|').map(c => c.trim()).filter(c => c !== '');
    const rows = lines.slice(2).map(line => {
      const cells = line.split('|').map(c => c.trim());
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

  async getPendingTask(): Promise<string | null> {
    await this.ensureInit();
    try {
      const data = await fs.readFile(TASK_FILE, 'utf-8');
      const { columns, rows } = this.parseTable(data);
      
      const statusIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.Status.toLowerCase());
      const idIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.ID.toLowerCase());
      const nameIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.Name.toLowerCase());

      const pendingRow = rows.find(row => row[statusIdx] === '[ ]');
      if (!pendingRow) return null;

      return `(#${pendingRow[idIdx]}) ${pendingRow[nameIdx]}`;
    } catch (err) {
      throw new Error('No active checklist found or invalid format. Run init_checklist first.');
    }
  }

  async getPendingTasks(count: number = 5): Promise<string[]> {
    await this.ensureInit();
    try {
      const data = await fs.readFile(TASK_FILE, 'utf-8');
      const { columns, rows } = this.parseTable(data);
      
      const statusIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.Status.toLowerCase());
      const idIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.ID.toLowerCase());
      const nameIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.Name.toLowerCase());

      return rows
        .filter(row => row[statusIdx] === '[ ]')
        .slice(0, count)
        .map(row => `(#${row[idIdx]}) ${row[nameIdx]}`);
    } catch (err) {
      throw new Error('No active checklist found or invalid format. Run init_checklist first.');
    }
  }

  async markTasksDone(tasks: { name: string, note?: string }[]): Promise<{ name: string, success: boolean }[]> {
    await this.ensureInit();
    const results = [];
    for (const t of tasks) {
      const success = await this.markTaskDone(t.name, t.note);
      results.push({ name: t.name, success });
    }
    return results;
  }

  async unmarkTasks(tasks: string[]): Promise<{ name: string, success: boolean }[]> {
    await this.ensureInit();
    const results = [];
    for (const t of tasks) {
      const success = await this.unmarkTask(t);
      results.push({ name: t, success });
    }
    return results;
  }

  async markTaskDone(taskIdentifier: string, note?: string): Promise<boolean> {
    await this.ensureInit();
    let data = await fs.readFile(TASK_FILE, 'utf-8');
    const sections = data.split('\n\n');
    let goalSection = sections[0];
    const tableData = sections.slice(1).join('\n\n');
    
    const { columns, rows } = this.parseTable(tableData);
    
    const statusIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.Status.toLowerCase());
    const idIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.ID.toLowerCase());
    const nameIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.Name.toLowerCase());

    const cleanId = taskIdentifier.replace(/[()#]/g, '').trim();
    const isNumericId = /^\d+$/.test(cleanId);

    const taskRowIdx = rows.findIndex(row => {
      if (row[statusIdx] !== '[ ]') return false;
      if (isNumericId && row[idIdx] === cleanId) return true;
      if (row[nameIdx] === taskIdentifier) return true;
      return false;
    });

    if (taskRowIdx === -1) return false;

    rows[taskRowIdx][statusIdx] = '[x]';
    
    if (note) {
      let notesIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.Notes.toLowerCase() || c.toLowerCase() === 'note');
      if (notesIdx === -1) {
        columns.push(TaskColumn.Notes);
        notesIdx = columns.length - 1;
        rows.forEach(row => row.push(''));
      }
      const currentNote = rows[taskRowIdx][notesIdx];
      rows[taskRowIdx][notesIdx] = currentNote ? `${currentNote} | ${note}` : note;
    }

    const resolved = rows.filter(r => r[statusIdx] === '[x]').length;
    goalSection = this.updateGoalHeader(goalSection, resolved, rows.length);

    const newTable = this.stringifyTable(columns, rows);
    await fs.writeFile(TASK_FILE, `${goalSection}\n\n${newTable}`);

    if (!rows.some(row => row[statusIdx] === '[ ]')) {
      await notificationService.alert('Checklist Complete', 'All tasks in your manifest are finished!', AlertType.Info);
    }

    return true;
  }

  async unmarkTask(taskIdentifier: string): Promise<boolean> {
    await this.ensureInit();
    let data = await fs.readFile(TASK_FILE, 'utf-8');
    const sections = data.split('\n\n');
    let goalSection = sections[0];
    const tableData = sections.slice(1).join('\n\n');
    
    const { columns, rows } = this.parseTable(tableData);
    
    const statusIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.Status.toLowerCase());
    const idIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.ID.toLowerCase());
    const nameIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.Name.toLowerCase());
    const notesIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.Notes.toLowerCase() || c.toLowerCase() === 'note');

    const cleanId = taskIdentifier.replace(/[()#]/g, '').trim();
    const isNumericId = /^\d+$/.test(cleanId);

    const taskRowIdx = rows.findIndex(row => {
      if (row[statusIdx] !== '[x]') return false;
      if (isNumericId && row[idIdx] === cleanId) return true;
      if (row[nameIdx] === taskIdentifier) return true;
      return false;
    });

    if (taskRowIdx === -1) return false;

    rows[taskRowIdx][statusIdx] = '[ ]';
    if (notesIdx !== -1) {
      rows[taskRowIdx][notesIdx] = '';
    }

    const resolved = rows.filter(r => r[statusIdx] === '[x]').length;
    goalSection = this.updateGoalHeader(goalSection, resolved, rows.length);

    const newTable = this.stringifyTable(columns, rows);
    await fs.writeFile(TASK_FILE, `${goalSection}\n\n${newTable}`);

    return true;
  }

  async addTask(taskName: string, note?: string): Promise<string> {
    await this.ensureInit();
    let data = await fs.readFile(TASK_FILE, 'utf-8');
    const sections = data.split('\n\n');
    let goalSection = sections[0];
    const tableData = sections.slice(1).join('\n\n');
    
    const { columns, rows } = this.parseTable(tableData);
    
    const newId = (rows.length + 1).toString();
    const rowData: string[] = columns.map(col => {
      const c = col.toLowerCase();
      if (c === TaskColumn.Status.toLowerCase()) return '[ ]';
      if (c === TaskColumn.ID.toLowerCase()) return newId;
      if (c === TaskColumn.Name.toLowerCase()) return taskName;
      if (c === TaskColumn.Notes.toLowerCase() || c === 'note') return note || '';
      return '';
    });
    
    rows.push(rowData);

    const statusIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.Status.toLowerCase());
    const resolved = rows.filter(r => r[statusIdx] === '[x]').length;
    goalSection = this.updateGoalHeader(goalSection, resolved, rows.length);

    const newTable = this.stringifyTable(columns, rows);
    await fs.writeFile(TASK_FILE, `${goalSection}\n\n${newTable}`);
    
    return `(#${newId}) ${taskName}`;
  }

  async removeTask(taskIdentifier: string): Promise<boolean> {
    await this.ensureInit();
    let data = await fs.readFile(TASK_FILE, 'utf-8');
    const sections = data.split('\n\n');
    let goalSection = sections[0];
    const tableData = sections.slice(1).join('\n\n');
    
    const { columns, rows } = this.parseTable(tableData);
    
    const statusIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.Status.toLowerCase());
    const idIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.ID.toLowerCase());
    const nameIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.Name.toLowerCase());

    const cleanId = taskIdentifier.replace(/[()#]/g, '').trim();
    const isNumericId = /^\d+$/.test(cleanId);

    const taskRowIdx = rows.findIndex(row => {
      if (isNumericId && row[idIdx] === cleanId) return true;
      if (row[nameIdx] === taskIdentifier) return true;
      return false;
    });

    if (taskRowIdx === -1) return false;

    rows.splice(taskRowIdx, 1);
    
    rows.forEach((row, idx) => {
      row[idIdx] = (idx + 1).toString();
    });

    const resolved = rows.filter(r => r[statusIdx] === '[x]').length;
    goalSection = this.updateGoalHeader(goalSection, resolved, rows.length);

    const newTable = this.stringifyTable(columns, rows);
    await fs.writeFile(TASK_FILE, `${goalSection}\n\n${newTable}`);
    
    return true;
  }

  async addTasks(tasks: { name: string, note?: string }[]): Promise<{ name: string, id: string }[]> {
    await this.ensureInit();
    let data = await fs.readFile(TASK_FILE, 'utf-8');
    const sections = data.split('\n\n');
    let goalSection = sections[0];
    const tableData = sections.slice(1).join('\n\n');
    
    const { columns, rows } = this.parseTable(tableData);
    const results: { name: string, id: string }[] = [];
    
    for (const task of tasks) {
      const newId = (rows.length + 1).toString();
      const rowData: string[] = columns.map(col => {
        const c = col.toLowerCase();
        if (c === TaskColumn.Status.toLowerCase()) return '[ ]';
        if (c === TaskColumn.ID.toLowerCase()) return newId;
        if (c === TaskColumn.Name.toLowerCase()) return task.name;
        if (c === TaskColumn.Notes.toLowerCase() || c === 'note') return task.note || '';
        return '';
      });
      rows.push(rowData);
      results.push({ name: task.name, id: newId });
    }

    const statusIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.Status.toLowerCase());
    const resolved = rows.filter(r => r[statusIdx] === '[x]').length;
    goalSection = this.updateGoalHeader(goalSection, resolved, rows.length);

    const newTable = this.stringifyTable(columns, rows);
    await fs.writeFile(TASK_FILE, `${goalSection}\n\n${newTable}`);
    
    return results;
  }

  async removeTasks(tasks: string[]): Promise<{ name: string, success: boolean }[]> {
    await this.ensureInit();
    let data = await fs.readFile(TASK_FILE, 'utf-8');
    const sections = data.split('\n\n');
    let goalSection = sections[0];
    const tableData = sections.slice(1).join('\n\n');
    
    const { columns, rows } = this.parseTable(tableData);
    
    const statusIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.Status.toLowerCase());
    const idIdx = columns.findIndex(c => c.toLowerCase() === TaskColumn.ID.toLowerCase());
    
    const results: { name: string, success: boolean }[] = [];

    for (const taskIdentifier of tasks) {
      const cleanId = taskIdentifier.replace(/[()#]/g, '').trim();
      const isNumericId = /^\d+$/.test(cleanId);

      const taskRowIdx = rows.findIndex(row => {
        if (isNumericId && row[idIdx] === cleanId) return true;
        if (row[idIdx] === taskIdentifier) return true; // Fallback for name if needed
        return false;
      });

      if (taskRowIdx === -1) {
        results.push({ name: taskIdentifier, success: false });
        continue;
      }

      rows.splice(taskRowIdx, 1);
      results.push({ name: taskIdentifier, success: true });
    }

    rows.forEach((row, idx) => {
      row[idIdx] = (idx + 1).toString();
    });

    const resolved = rows.filter(r => r[statusIdx] === '[x]').length;
    goalSection = this.updateGoalHeader(goalSection, resolved, rows.length);

    const newTable = this.stringifyTable(columns, rows);
    await fs.writeFile(TASK_FILE, `${goalSection}\n\n${newTable}`);
    
    return results;
  }
}

export const taskService = new TaskService();