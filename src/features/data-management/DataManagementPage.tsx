// features/data-management/DataManagementPage.tsx
import { useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { downloadAppData, readImportFile } from '../../services/importExport';
import type { AppData } from '../../types/app';
import { choiceDialog, confirmDialog } from '../../utils/dialogs';

interface DataManagementPageProps {
  data: AppData;
  onImport: (data: AppData) => void;
  onMerge: (data: AppData) => void;
  onReset: () => void;
}

type StatusMessage = { text: string; tone: 'success' | 'error' | 'neutral' } | null;

export function DataManagementPage({ data, onImport, onMerge, onReset }: DataManagementPageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<StatusMessage>(null);

  async function handleFile(file: File): Promise<void> {
    const result = await readImportFile(file);
    if (result.error || !result.data) {
      setMessage({ text: result.error ?? 'Archivo invalido.', tone: 'error' });
      return;
    }

    const choice = await choiceDialog({
      title: 'Importar copia de seguridad',
      html: `
        <div class="app-dialog-summary">
          <div>
            <strong>Datos actuales</strong>
            <span>${data.processes.length} procesos</span>
            <span>${data.notes.length} notas</span>
          </div>
          <div>
            <strong>Archivo seleccionado</strong>
            <span>${result.data.processes.length} procesos</span>
            <span>${result.data.notes.length} notas</span>
          </div>
        </div>
      `,
      confirmText: 'Reemplazar',
      denyText: 'Combinar',
      cancelText: 'Cancelar',
    });

    if (choice === 'confirm') {
      onImport(result.data);
      setMessage({ text: 'Datos importados correctamente.', tone: 'success' });
      return;
    }

    if (choice === 'cancel') {
      setMessage({ text: 'Importacion cancelada.', tone: 'neutral' });
      return;
    }

    onMerge(result.data);
    setMessage({ text: 'Datos combinados correctamente.', tone: 'success' });
  }

  async function resetAll(): Promise<void> {
    const confirmed = await confirmDialog({
      title: 'Borrar datos locales',
      text: 'Esto eliminara todas las notas y procesos guardados en este navegador.',
      confirmText: 'Borrar datos',
      danger: true,
    });
    if (!confirmed) return;
    onReset();
    setMessage({ text: 'Datos locales eliminados.', tone: 'neutral' });
  }

  const messageStyles: Record<NonNullable<StatusMessage>['tone'], string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-red-200 bg-red-50 text-red-800',
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  };

  return (
    <section className="grid gap-5 md:grid-cols-2">
      <div className="rounded-3xl border border-white/80 bg-white/95 p-5 shadow-[var(--shadow-card)]">
        <p className="text-sm font-semibold text-[var(--color-primary)]">Copia de seguridad</p>
        <h2 className="text-2xl font-bold tracking-tight">Exportar datos</h2>
        <p className="mt-2 text-sm font-medium text-[var(--color-muted)]">
          Descarga un archivo JSON con todas tus notas y procesos para conservar una copia local.
        </p>
        <p className="mt-1 text-sm text-slate-500">Recomendado: exporta una copia con frecuencia, sobre todo antes de borrar datos.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" variant="primary" onClick={() => downloadAppData(data)}>
            Exportar datos
          </Button>
          <span className="text-sm text-slate-600">
            {data.notes.length} notas · {data.processes.length} procesos
          </span>
        </div>
      </div>

      <div className="rounded-3xl border border-white/80 bg-white/95 p-5 shadow-[var(--shadow-card)]">
        <p className="text-sm font-semibold text-[var(--color-primary)]">Restauracion</p>
        <h2 className="text-2xl font-bold tracking-tight">Importar datos</h2>
        <p className="mt-2 text-sm font-medium text-[var(--color-muted)]">
          Selecciona un JSON exportado por esta aplicacion. Antes de reemplazar datos se pedira
          confirmacion.
        </p>
        <input
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = '';
          }}
          ref={inputRef}
          type="file"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="primary" onClick={() => inputRef.current?.click()}>
            Importar datos
          </Button>
          <Button type="button" variant="danger" onClick={() => void resetAll()}>
            Borrar datos locales
          </Button>
        </div>
        {message ? (
          <p className={`mt-3 rounded-2xl border px-3 py-2 text-sm font-medium ${messageStyles[message.tone]}`}>
            {message.text}
          </p>
        ) : null}
      </div>
    </section>
  );
}
