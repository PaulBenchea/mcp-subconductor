import path from 'path';

export const APP_ID = 'Subconductor';
export const APP_NAME = 'Subconductor';
export const APP_VERSION = '1.0.2';

export const WORKING_DIR = path.join(process.cwd(), '.subconductor');
export const TASK_FILE = path.join(WORKING_DIR, 'tasks.md');

export const NOTIFICATION_SOUNDS = {
  info: 'Notification.Default',
  warn: 'Notification.Reminder',
  error: 'Notification.SMS'
};