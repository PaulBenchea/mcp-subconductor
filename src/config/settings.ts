import { parseArgs } from 'node:util';
import type { McpSettings } from '../models/interfaces.js';

export function getSettings(): McpSettings {
  const { values } = parseArgs({
    options: {
      'disable-batch': { type: 'boolean', short: 'b' },
      'disable-alerts': { type: 'boolean', short: 'a' },
    }
  });

  return {
    disableBatch: Boolean(values['disable-batch']),
    disableAlerts: Boolean(values['disable-alerts']),
  };
}