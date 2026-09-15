import type { AppData, ImportResult, Note, Process, ProcessStatus } from '../../types/app';

const STORAGE_KEY = 'procesos-notas-app-data';
const CURRENT_VERSION = 1;

export const emptyAppData: AppData = {
  version: CURRENT_VERSION,
  notes: [],
  processes: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNote(value: unknown): value is Note {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.content === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isProcess(value: unknown): value is Process {
  if (!isRecord(value)) return false;
  const statuses: ProcessStatus[] = ['complete', 'validation_only', 'pending', 'unknown'];
  return (
    typeof value.id === 'string' &&
    typeof value.date === 'string' &&
    typeof value.name === 'string' &&
    statuses.includes(value.status as ProcessStatus) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function migrateLegacyProcess(value: unknown): Process | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null;
  if (isProcess(value)) return value;
  if (typeof value.title !== 'string' || !Array.isArray(value.fields)) return null;

  const fields = value.fields.filter(isRecord);
  const findField = (name: string): string | undefined => {
    const field = fields.find((item) =>
      typeof item.name === 'string' ? item.name.toLowerCase().includes(name) : false,
    );
    return field && 'value' in field ? String(field.value ?? '') : undefined;
  };

  return {
    id: value.id,
    date: new Date().toISOString().slice(0, 10),
    name: value.title,
    identification: findField('identificacion') ?? findField('identificación'),
    phone: findField('telefono') ?? findField('teléfono'),
    status: 'pending',
    notes: fields.map((field) => `${String(field.name ?? 'Campo')}: ${String(field.value ?? '')}`).join('\n'),
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
  };
}

export function validateAppData(value: unknown): ImportResult {
  if (!isRecord(value)) {
    return { ok: false, error: 'El archivo no contiene un objeto JSON valido.' };
  }

  if (value.version !== CURRENT_VERSION) {
    return { ok: false, error: 'La version del archivo no es compatible.' };
  }

  if (!Array.isArray(value.notes) || !Array.isArray(value.processes)) {
    return { ok: false, error: 'El archivo no tiene la estructura esperada.' };
  }

  if (!value.notes.every(isNote)) {
    return { ok: false, error: 'La lista de notas contiene datos invalidos.' };
  }

  const processes = value.processes.map(migrateLegacyProcess);
  if (processes.some((process) => process === null)) {
    return { ok: false, error: 'La lista de procesos contiene datos invalidos.' };
  }

  return {
    ok: true,
    data: {
      version: CURRENT_VERSION,
      notes: value.notes,
      processes: processes as Process[],
      lastBackupReminderAt:
        typeof value.lastBackupReminderAt === 'string' ? value.lastBackupReminderAt : undefined,
    },
  };
}

export function loadAppData(): { data: AppData; error?: string } {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return { data: emptyAppData };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = validateAppData(parsed);
    if (!result.ok || !result.data) {
      return { data: emptyAppData, error: result.error };
    }

    return { data: result.data };
  } catch {
    return { data: emptyAppData, error: 'Los datos guardados localmente estan corruptos.' };
  }
}

export function saveAppData(data: AppData): { ok: boolean; error?: string } {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'No se pudo guardar. Es posible que el almacenamiento del navegador este lleno.',
    };
  }
}

export function prepareExportData(data: AppData): string {
  return JSON.stringify({ ...data, version: CURRENT_VERSION, exportedAt: new Date().toISOString() }, null, 2);
}
