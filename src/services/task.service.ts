import fs from 'fs/promises';
import { TASK_FILE, WORKING_DIR } from '../models/constants.js';
import { AlertType } from '../models/enums.js';
import { notificationService } from './notification.service.js';

export class TaskService {
  async ensureInit(): Promise<void> {
    try {
      await fs.mkdir(WORKING_DIR, { recursive: true });
    } catch (e) {}
  }

  async initChecklist(tasks: string[], goal: string): Promise<number> {
    await this.ensureInit();
    const sanitizedGoal = goal.replace(/[\r\n]+/g, ' ').trim();
    const sanitizedTasks = tasks.map(original => {
      let t = original.replace(/[\r\n]+/g, ' ').trim();
      if (t.startsWith('- [ ] ')) {
        t = t.replace(/^-\s*\[\s*\]\s*/, '').trim();
      }
      return t;
    });
    const content = `# Goal: ${sanitizedGoal}\n\n${sanitizedTasks.map(t => `- [ ] ${t}`).join('\n')}`;
    await fs.writeFile(TASK_FILE, content);
    return tasks.length;
  }

  async getPendingTask(): Promise<string | null> {
    await this.ensureInit();
    try {
      const data = await fs.readFile(TASK_FILE, 'utf-8');
      const lines = data.split('\n');
      const nextLine = lines.find(l => l.startsWith('- [ ] '));

      if (!nextLine) {
        return null;
      }

      return nextLine.replace('- [ ] ', '').trim();
    } catch (err) {
      throw new Error('No active checklist found. Run init_checklist first.');
    }
  }

  async getPendingTasks(count: number = 5): Promise<string[]> {
    await this.ensureInit();
    try {
      const data = await fs.readFile(TASK_FILE, 'utf-8');
      const lines = data.split('\n');
      return lines
        .filter(l => l.startsWith('- [ ] '))
        .slice(0, count)
        .map(l => l.replace('- [ ] ', '').trim());
    } catch (err) {
      throw new Error('No active checklist found. Run init_checklist first.');
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

  async markTaskDone(taskName: string, note?: string): Promise<boolean> {
    await this.ensureInit();
    let data = await fs.readFile(TASK_FILE, 'utf-8');
    const lines = data.split('\n');
    
    const taskIndex = lines.findIndex(l =>
      l.startsWith(`- [ ] ${taskName}`) && (l.length === (`- [ ] ${taskName}`).length
        || l.startsWith(`- [ ] ${taskName}:`)));
    
    if (taskIndex === -1) {
      return false;
    }

    const currentLine = lines[taskIndex];
    let newLine = currentLine.replace('- [ ] ', '- [x] ');
    
    if (note) {
      if (newLine.includes(': ')) {
        newLine += ` | ${note}`;
      } else {
        newLine += `: ${note}`;
      }
    }

    lines[taskIndex] = newLine;
    await fs.writeFile(TASK_FILE, lines.join('\n'));

    const hasPending = lines.some(l => l.startsWith('- [ ] '));
    
    if (!hasPending) {
      await notificationService.alert('Checklist Complete', 'All tasks in your manifest are finished!', AlertType.Info);
    }

    return true;
  }
}

export const taskService = new TaskService();