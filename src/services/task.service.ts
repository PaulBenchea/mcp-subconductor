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

  async initChecklist(paths: string[], goal: string): Promise<number> {
    await this.ensureInit();
    const content = `# Goal: ${goal}\n\n${paths.map(p => `- [ ] ${p}`).join('\n')}`;
    await fs.writeFile(TASK_FILE, content);
    return paths.length;
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

  async markTaskDone(filePath: string): Promise<boolean> {
    await this.ensureInit();
    let data = await fs.readFile(TASK_FILE, 'utf-8');
    
    if (!data.includes(`- [ ] ${filePath}`)) {
      return false;
    }

    data = data.replace(`- [ ] ${filePath}`, `- [x] ${filePath}`);
    await fs.writeFile(TASK_FILE, data);

    const lines = data.split('\n');
    const hasPending = lines.some(l => l.startsWith('- [ ] '));
    
    if (!hasPending) {
      await notificationService.alert('Checklist Complete', 'All tasks in your manifest are finished!', AlertType.Info);
    }

    return true;
  }
}

export const taskService = new TaskService();