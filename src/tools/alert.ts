import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AlertType } from '../models/enums.js';
import type { McpSettings } from '../models/interfaces.js';
import { notificationService } from '../services/notification.service.js';
import { projectService } from '../services/project.service.js';

const INIT_ERROR = 'Subconductor is NOT initialized for this project. To use Subconductor\'s tracking and alerting capabilities, you MUST first run the "analyze_project" prompt to establish context.';

export function registerAlertTools(server: McpServer, settings: McpSettings) {
  if (settings.disableAlerts) {
    return;
  }

  server.registerTool(
    'alert',
    {
      description: 'Trigger a desktop notification with a custom title, message, and severity level (info, warn, error). This is useful for providing immediate feedback on background task completion or issues.',
      inputSchema: {
        title: z.string().describe('The title of the notification'),
        message: z.string().describe('The message body'),
        status: z.enum([AlertType.Info, AlertType.Warn, AlertType.Error])
          .optional().default(AlertType.Info).describe('The severity level')
      }
    },
    async ({ title, message, status }) => {
      if (!(await projectService.isInitialized())) {
        return { content: [{ type: 'text', text: INIT_ERROR }] };
      }

      await notificationService.alert(title, message, status as AlertType);
      return {
        content: [{ type: 'text', text: `Notification sent: ${title}` }]
      };
    }
  );
}