import type { AppData } from '../types/app';
import { prepareExportData, validateAppData } from './storage/appStorage';

export function downloadAppData(data: AppData): void {
  const blob = new Blob([prepareExportData(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `mis-procesos-${date}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function readImportFile(file: File): Promise<{ data?: AppData; error?: string }> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    const result = validateAppData(parsed);
    if (!result.ok || !result.data) {
      return { error: result.error ?? 'El archivo no es compatible.' };
    }

    return { data: result.data };
  } catch {
    return { error: 'No se pudo leer el archivo JSON seleccionado.' };
  }
}
