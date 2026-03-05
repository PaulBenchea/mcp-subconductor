import notifier from 'node-notifier';
import path from 'path';
import { fileURLToPath } from 'url';
import { APP_ID, NOTIFICATION_SOUNDS } from '../models/constants.js';
import { AlertType } from '../models/enums.js';
import type { McpSettings } from '../models/interfaces.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class NotificationService {
  private notifier: typeof notifier;
  private disabled = false;

  constructor() {
    this.notifier = notifier;
  }

  configure(settings: McpSettings) {
    this.disabled = settings.disableAlerts;
  }

  async alert(title: string, message: string, type: AlertType = AlertType.Info): Promise<void> {
    if (this.disabled) {
      return;
    }

    const iconPath = path.resolve(__dirname, '..', 'assets', `${type}.png`);

    this.notifier.notify({
      title: title,
      message,
      icon: iconPath,
      sound: NOTIFICATION_SOUNDS[type],
      wait: true,
      appID: APP_ID
    });

  }
}

export const notificationService = new NotificationService();
