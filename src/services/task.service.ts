import fs from 'fs/promises';
import { TASK_FILE, WORKING_DIR } from '../models/constants.js';
import { AlertType } from '../models/enums.js';
import { notificationService } from './notification.service.js';

export class TaskService {
  private readonly DEFAULT_COLUMNS = ['Status', 'ID', 'Name'];

  async ensureInit(): Promise<void> {
    try {
      await fs.mkdir(WORKING_DIR, { recursive: true });
    } catch (e) {}
  }

  async initChecklist(tasks: string[], goal: string, columns?: string[]): Promise<number> {
    await this.ensureInit();
    const sanitizedGoal = goal.replace(/[\r\n]+/g, ' ').trim();
    const cols = columns && columns.length > 0 ? [...columns] : [...this.DEFAULT_COLUMNS];
    
    if (!cols.some(c => c.toLowerCase() === 'status')) cols.unshift('Status');
    if (!cols.some(c => c.toLowerCase() === 'id')) cols.splice(cols.findIndex(c => c.toLowerCase() === 'status') + 1, 0, 'ID');
    if (!cols.some(c => c.toLowerCase() === 'name')) cols.splice(cols.findIndex(c => c.toLowerCase() === 'id') + 1, 0, 'Name');

    const header = `| ${cols.join(' | ')} |`;
    const separator = `| ${cols.map(() => ':---').join(' | ')} |`;
    
    const rows = tasks.map((original, index) => {
      let t = original.replace(/[\r\n]+/g, ' ').trim();
      if (t.startsWith('- [ ] ')) {
        t = t.replace(/^-\s*\[\s*]\s*/, '').trim();
      }
      
      const rowData: string[] = cols.map(col => {
        const c = col.toLowerCase();
        if (c === 'status') return '[ ]';
        if (c === 'id') return `${index + 1}`;
        if (c === 'name') return t;
        return ''; // Custom columns are empty initially
      });
      
      return `| ${rowData.join(' | ')} |`;
    });

    const content = `# Goal: ${sanitizedGoal}\n\n${header}\n${separator}\n${rows.join('\n')}`;
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

  async getPendingTask(): Promise<string | null> {
    await this.ensureInit();
    try {
      const data = await fs.readFile(TASK_FILE, 'utf-8');
      const { columns, rows } = this.parseTable(data);
      
      const statusIdx = columns.findIndex(c => c.toLowerCase() === 'status');
      const idIdx = columns.findIndex(c => c.toLowerCase() === 'id');
      const nameIdx = columns.findIndex(c => c.toLowerCase() === 'name');

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
      
      const statusIdx = columns.findIndex(c => c.toLowerCase() === 'status');
      const idIdx = columns.findIndex(c => c.toLowerCase() === 'id');
      const nameIdx = columns.findIndex(c => c.toLowerCase() === 'name');

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
    const goalSection = sections[0];
    const tableData = sections.slice(1).join('\n\n');
    
    const { columns, rows } = this.parseTable(tableData);
    
    const statusIdx = columns.findIndex(c => c.toLowerCase() === 'status');
    const idIdx = columns.findIndex(c => c.toLowerCase() === 'id');
    const nameIdx = columns.findIndex(c => c.toLowerCase() === 'name');

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
      let notesIdx = columns.findIndex(c => ['notes', 'details', 'note', 'detail'].includes(c.toLowerCase()));
      if (notesIdx === -1) {
        columns.push('Notes');
        notesIdx = columns.length - 1;
        rows.forEach(row => row.push(''));
      }
      const currentNote = rows[taskRowIdx][notesIdx];
      rows[taskRowIdx][notesIdx] = currentNote ? `${currentNote} | ${note}` : note;
    }

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
    const goalSection = sections[0];
    const tableData = sections.slice(1).join('\n\n');
    
    const { columns, rows } = this.parseTable(tableData);
    
    const statusIdx = columns.findIndex(c => c.toLowerCase() === 'status');
    const idIdx = columns.findIndex(c => c.toLowerCase() === 'id');
    const nameIdx = columns.findIndex(c => c.toLowerCase() === 'name');
    const notesIdx = columns.findIndex(c => ['notes', 'details', 'note', 'detail'].includes(c.toLowerCase()));

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

    const newTable = this.stringifyTable(columns, rows);
    await fs.writeFile(TASK_FILE, `${goalSection}\n\n${newTable}`);

    return true;
  }
}

export const taskService = new TaskService();