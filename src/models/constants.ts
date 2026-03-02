import path from 'path';
import packageJson from '../../package.json' with { type: 'json' };

export const APP_ID = 'Subconductor';
export const APP_NAME = 'Subconductor';
export const APP_VERSION = packageJson.version;

export const WORKING_DIR = path.join(process.cwd(), '.subconductor');
export const TASK_FILE = path.join(WORKING_DIR, 'tasks.md');

export const NOTIFICATION_SOUNDS = {
  info: 'Notification.Default',
  warn: 'Notification.Reminder',
  error: 'Notification.SMS'
};