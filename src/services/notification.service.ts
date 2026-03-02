import path from 'path';
import { fileURLToPath } from 'url';
import notifier from 'node-notifier';
import { APP_ID, NOTIFICATION_SOUNDS } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type AlertType = 'info' | 'warn' | 'error';

export class NotificationService {
  private notifier: typeof notifier;

  constructor() {
    this.notifier = notifier;
  }

  async alert(title: string, message: string, type: AlertType = 'info'): Promise<void> {
    const iconPath = path.resolve(__dirname, '..', 'assets', `${type}.png`);

    try {
      this.notifier.notify({
        title: title,
        message,
        icon: iconPath,
        sound: NOTIFICATION_SOUNDS[type],
        wait: true,
        appID: APP_ID
      });
    } catch (err) {
      console.error('Notification failed:', err);
    }
  }
}

export const notificationService = new NotificationService();
