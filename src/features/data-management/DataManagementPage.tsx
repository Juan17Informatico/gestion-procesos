import { useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { downloadAppData, readImportFile } from '../../services/importExport';
import type { AppData } from '../../types/app';

interface DataManagementPageProps {
  data: AppData;
  onImport: (data: AppData) => void;
  onMerge: (data: AppData) => void;
  onReset: () => void;
}

export function DataManagementPage({ data, onImport, onMerge, onReset }: DataManagementPageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string>('');

  async function handleFile(file: File): Promise<void> {
    const result = await readImportFile(file);
    if (result.error || !result.data) {
      setMessage(result.error ?? 'Archivo invalido.');
      return;
    }

    const replace = confirm(
      `Quieres importar estos datos?\n\nActualmente tienes:\n${data.processes.length} procesos\n${data.notes.length} notas\n\nEl archivo contiene:\n${result.data.processes.length} procesos\n${result.data.notes.length} notas\n\nAceptar: reemplazar datos\nCancelar: elegir combinar o cancelar`,
    );

    if (replace) {
      onImport(result.data);
      setMessage('Datos importados correctamente.');
      return;
    }

    const merge = confirm('Quieres combinar el archivo con tus datos actuales y omitir duplicados por identificacion?');
    if (!merge) {
      setMessage('Importacion cancelada.');
      return;
    }

    onMerge(result.data);
    setMessage('Datos combinados correctamente.');
  }

  function resetAll(): void {
    const confirmed = confirm(
      'Esto eliminara todas las notas y procesos guardados en este navegador. Deseas continuar?',
    );
    if (!confirmed) return;
    onReset();
    setMessage('Datos locales eliminados.');
  }

  return (
    <section className="grid gap-5 md:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Exportar datos</h2>
        <p className="mt-2 text-sm text-slate-600">
          Descarga un archivo JSON con todas tus notas y procesos para conservar una copia local.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" variant="primary" onClick={() => downloadAppData(data)}>
            Exportar datos
          </Button>
          <span className="text-sm text-slate-600">
            {data.notes.length} notas · {data.processes.length} procesos
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Importar datos</h2>
        <p className="mt-2 text-sm text-slate-600">
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
          <Button type="button" variant="danger" onClick={resetAll}>
            Borrar datos locales
          </Button>
        </div>
        {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      </div>
    </section>
  );
}
