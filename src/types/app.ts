export type ProcessStatus = 'complete' | 'validation_only' | 'pending' | 'unknown';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Process {
  id: string;
  date: string;
  name: string;
  identification?: string;
  phone?: string;
  status: ProcessStatus;
  originalStatusSymbol?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  version: number;
  notes: Note[];
  processes: Process[];
  lastBackupReminderAt?: string;
}

export interface ImportResult {
  ok: boolean;
  data?: AppData;
  error?: string;
}
