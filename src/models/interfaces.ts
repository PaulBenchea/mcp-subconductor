export interface McpSettings {
  disableBatch: boolean;
  disableAlerts: boolean;
}

export interface TaskInput {
  name: string;
  note?: string;
}

export interface ProjectInfo {
  name: string;
  version: string;
  description?: string;
  techStack: {
    language: string;
    framework?: string;
    dependencies: string[];
  };
  structure: string[];
  readmeSummary?: string;
  checklistsSummary?: string;
  initializedAt: string;
}