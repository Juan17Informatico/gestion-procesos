export const NO_APTO_PROCESS_STATUS = 'COMPLETO - NO APTO' as const;

export type ProcessStatus = 'complete' | 'validation_only' | 'pending' | typeof NO_APTO_PROCESS_STATUS | 'unknown';

export function isCompleteProcessStatus(status: ProcessStatus): boolean {
  return status === 'complete' || status === NO_APTO_PROCESS_STATUS;
}

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
