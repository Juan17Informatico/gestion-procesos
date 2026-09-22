// features/data-management/DataManagementPage.tsx
import { useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  CalendarRange,
  Database,
  Download,
  FileUp,
  RotateCcw,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Field, TextInput } from '../../components/Field';
import { downloadAppData, readImportFile } from '../../services/importExport';
import type { AppData } from '../../types/app';
import {
  getDateMonthsAgo,
  getMonthSpanRange,
  getProcessesInRange,
  getProcessesOlderThanMonths,
  getWeekSpanRange,
  normalizeDateRange,
  type DateRange,
} from '../../utils/dateRanges';
import { choiceDialog, confirmDialog, contentDialog } from '../../utils/dialogs';

interface DataManagementPageProps {
  data: AppData;
  onImport: (data: AppData) => void;
  onMerge: (data: AppData) => void;
  onDataChange: (data: AppData) => void;
}

type StatusMessage = { text: string; tone: 'success' | 'error' | 'neutral' } | null;

type GranularDeleteTarget = 'all' | 'processes' | 'notes';
type SelectiveDeleteMode = 'months' | 'weeks' | 'range';

interface SelectiveDeleteForm {
  mode: SelectiveDeleteMode;
  monthFrom: string;
  monthTo: string;
  weekFrom: string;
  weekTo: string;
  dateFrom: string;
  dateTo: string;
}

interface DeletePreviewState {
  title: string;
  description: string;
  processIds: string[];
  noteIds: string[];
  closeSelectiveOnConfirm?: boolean;
}

interface DeleteSelection {
  processIds: string[];
  noteIds: string[];
}

function emptySelectiveDeleteForm(): SelectiveDeleteForm {
  return {
    mode: 'months',
    monthFrom: '',
    monthTo: '',
    weekFrom: '',
    weekTo: '',
    dateFrom: '',
    dateTo: '',
  };
}

function getSelectiveDateRange(form: SelectiveDeleteForm): DateRange | null {
  if (form.mode === 'months') {
    return form.monthFrom ? getMonthSpanRange(form.monthFrom, form.monthTo || form.monthFrom) : null;
  }

  if (form.mode === 'weeks') {
    return form.weekFrom ? getWeekSpanRange(form.weekFrom, form.weekTo || form.weekFrom) : null;
  }

  return normalizeDateRange(form.dateFrom, form.dateTo);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`));
}

function formatRange(range: DateRange): string {
  if (range.from === range.to) return formatDate(range.from);
  return `${formatDate(range.from)} - ${formatDate(range.to)}`;
}

function describeDeleteCounts(processCount: number, noteCount: number): string {
  const parts: string[] = [];
  if (processCount > 0) parts.push(`${processCount} ${processCount === 1 ? 'proceso' : 'procesos'}`);
  if (noteCount > 0) parts.push(`${noteCount} ${noteCount === 1 ? 'nota' : 'notas'}`);
  return parts.length > 0 ? parts.join(' y ') : '0 elementos';
}

export function DataManagementPage({ data, onImport, onMerge, onDataChange }: DataManagementPageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<StatusMessage>(null);
  const [showGranularDelete, setShowGranularDelete] = useState(false);
  const [showSelectiveDelete, setShowSelectiveDelete] = useState(false);
  const [deletePreview, setDeletePreview] = useState<DeletePreviewState | null>(null);
  const [selectiveForm, setSelectiveForm] = useState<SelectiveDeleteForm>(emptySelectiveDeleteForm);

  const selectiveRange = useMemo(() => getSelectiveDateRange(selectiveForm), [selectiveForm]);
  const selectiveMatches = useMemo(
    () => (selectiveRange ? getProcessesInRange(data.processes, selectiveRange) : []),
    [data.processes, selectiveRange],
  );
  const retention = useMemo(() => {
    const olderThanThree = getProcessesOlderThanMonths(data.processes, 3);
    if (olderThanThree.length === 0) return null;

    return {
      cutoffThree: getDateMonthsAgo(3),
      olderThanOne: getProcessesOlderThanMonths(data.processes, 1).length,
      olderThanTwo: getProcessesOlderThanMonths(data.processes, 2).length,
      olderThanThree: olderThanThree.length,
    };
  }, [data.processes]);

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

  async function deleteGranular(target: GranularDeleteTarget): Promise<void> {
    const config: Record<
      GranularDeleteTarget,
      { title: string; description: string; processIds: string[]; noteIds: string[] }
    > = {
      all: {
        title: 'Borrar todos los datos',
        description: 'Revisa los procesos y notas que se eliminaran. Puedes quitar elementos de esta lista antes de confirmar.',
        processIds: data.processes.map((process) => process.id),
        noteIds: data.notes.map((note) => note.id),
      },
      processes: {
        title: 'Borrar solo procesos',
        description: 'Revisa los procesos que se eliminaran. Las notas no se modificaran.',
        processIds: data.processes.map((process) => process.id),
        noteIds: [],
      },
      notes: {
        title: 'Borrar solo notas',
        description: 'Revisa las notas que se eliminaran. Los procesos no se modificaran.',
        processIds: [],
        noteIds: data.notes.map((note) => note.id),
      },
    };
    const selected = config[target];
    const total = selected.processIds.length + selected.noteIds.length;

    if (total === 0) {
      await contentDialog({
        title: 'Sin datos para borrar',
        html: '<p>No hay registros en esta seleccion.</p>',
      });
      return;
    }

    setShowGranularDelete(false);
    setDeletePreview({
      title: selected.title,
      description: selected.description,
      processIds: selected.processIds,
      noteIds: selected.noteIds,
    });
  }

  async function deleteProcessesByRange(): Promise<void> {
    if (!selectiveRange) {
      await contentDialog({
        title: 'Seleccion incompleta',
        html: '<p>Elige un mes, una semana o un rango de fechas valido antes de borrar.</p>',
      });
      return;
    }

    if (selectiveMatches.length === 0) {
      await contentDialog({
        title: 'Sin procesos en el rango',
        html: `<p>No hay procesos guardados para ${formatRange(selectiveRange)}.</p>`,
      });
      return;
    }

    setShowSelectiveDelete(false);
    setDeletePreview({
      title: 'Eliminar procesos por fecha',
      description: `Rango: ${formatRange(selectiveRange)}. Puedes quitar procesos de la eliminacion antes de confirmar.`,
      processIds: selectiveMatches.map((process) => process.id),
      noteIds: [],
      closeSelectiveOnConfirm: true,
    });
  }

  async function deleteProcessesOlderThan(months: number, label: string): Promise<void> {
    const matches = getProcessesOlderThanMonths(data.processes, months);
    const cutoff = getDateMonthsAgo(months);

    if (matches.length === 0) {
      await contentDialog({
        title: 'Sin procesos antiguos',
        html: `<p>No hay procesos anteriores a ${formatDate(cutoff)}.</p>`,
      });
      return;
    }

    setDeletePreview({
      title: label,
      description: `Procesos con fecha anterior a ${formatDate(cutoff)}. Puedes quitar registros de la eliminacion antes de confirmar.`,
      processIds: matches.map((process) => process.id),
      noteIds: [],
    });
  }

  async function confirmDeletePreview(selection: DeleteSelection): Promise<void> {
    if (!deletePreview) return;

    const selectedProcessIds = new Set(selection.processIds);
    const selectedNoteIds = new Set(selection.noteIds);
    const processCount = data.processes.filter((process) => selectedProcessIds.has(process.id)).length;
    const noteCount = data.notes.filter((note) => selectedNoteIds.has(note.id)).length;
    const total = processCount + noteCount;

    if (total === 0) {
      await contentDialog({
        title: 'Sin elementos seleccionados',
        html: '<p>Quitaste todos los elementos de la lista de eliminacion.</p>',
      });
      return;
    }

    const confirmed = await confirmDialog({
      title: deletePreview.title,
      html: `
        <div class="app-dialog-summary">
          <div>
            <strong>${describeDeleteCounts(processCount, noteCount)} seleccionados</strong>
            <span>Quitaste ${deletePreview.processIds.length + deletePreview.noteIds.length - total} elementos de la eliminacion.</span>
            <span>Esta accion no se puede deshacer desde la aplicacion.</span>
          </div>
        </div>
      `,
      confirmText: `Eliminar ${total}`,
      danger: true,
    });
    if (!confirmed) return;

    onDataChange({
      ...data,
      processes: data.processes.filter((process) => !selectedProcessIds.has(process.id)),
      notes: data.notes.filter((note) => !selectedNoteIds.has(note.id)),
    });
    setDeletePreview(null);
    if (deletePreview.closeSelectiveOnConfirm) setSelectiveForm(emptySelectiveDeleteForm());
    setMessage({ text: `${describeDeleteCounts(processCount, noteCount)} eliminados.`, tone: 'neutral' });
  }

  const messageStyles: Record<NonNullable<StatusMessage>['tone'], string> = {
    success: 'border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]',
    error: 'border-[var(--color-error-border)] bg-[var(--color-error-bg)] text-[var(--color-error-text)]',
    neutral: 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-muted-strong)]',
  };

  return (
    <section className="grid gap-5">
      {retention ? (
        <div className="grid gap-4 rounded-3xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-4 text-[var(--color-warning-text)] shadow-[var(--shadow-card)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--color-surface-glass)]">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold">Retencion de datos</p>
              <h2 className="text-xl font-bold tracking-tight text-[var(--color-text)]">Hay procesos con mas de 3 meses</h2>
              <p className="mt-1 text-sm font-medium">
                {retention.olderThanThree} procesos tienen fecha anterior a {formatDate(retention.cutoffThree)}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button className="gap-2" type="button" variant="danger" onClick={() => void deleteProcessesOlderThan(1, 'Eliminar registros de mas de 1 mes')}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Mas de 1 mes ({retention.olderThanOne})
            </Button>
            <Button className="gap-2" type="button" variant="danger" onClick={() => void deleteProcessesOlderThan(2, 'Eliminar registros de mas de 2 meses')}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Mas de 2 meses ({retention.olderThanTwo})
            </Button>
            <Button className="gap-2" type="button" variant="danger" onClick={() => void deleteProcessesOlderThan(3, 'Eliminar todos los meses antiguos')}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Meses antiguos ({retention.olderThanThree})
            </Button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className={`rounded-2xl border px-3 py-2 text-sm font-medium ${messageStyles[message.tone]}`}>
          {message.text}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--color-card-border)] bg-[var(--color-surface-panel)] p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm font-semibold text-[var(--color-primary)]">Copia de seguridad</p>
          <h2 className="text-2xl font-bold tracking-tight">Exportar datos</h2>
          <p className="mt-2 text-sm font-medium text-[var(--color-muted)]">
            Descarga un archivo JSON con todas tus notas y procesos para conservar una copia local.
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Recomendado: exporta una copia con frecuencia, sobre todo antes de borrar datos.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button className="gap-2" type="button" variant="primary" onClick={() => downloadAppData(data)}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar datos
            </Button>
            <span className="text-sm text-[var(--color-muted-strong)]">
              {data.notes.length} notas - {data.processes.length} procesos
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--color-card-border)] bg-[var(--color-surface-panel)] p-5 shadow-[var(--shadow-card)]">
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
            <Button className="gap-2" type="button" variant="primary" onClick={() => inputRef.current?.click()}>
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Importar datos
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--color-card-border)] bg-[var(--color-surface-panel)] p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm font-semibold text-[var(--color-primary)]">Limpieza granular</p>
          <h2 className="text-2xl font-bold tracking-tight">Borrar datos locales</h2>
          <p className="mt-2 text-sm font-medium text-[var(--color-muted)]">
            Elige exactamente que quieres borrar: todo, solo procesos o solo notas.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button className="gap-2" type="button" variant="danger" onClick={() => setShowGranularDelete(true)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Abrir opciones de borrado
            </Button>
            <span className="text-sm text-[var(--color-muted-strong)]">
              {data.processes.length} procesos - {data.notes.length} notas
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--color-card-border)] bg-[var(--color-surface-panel)] p-5 shadow-[var(--shadow-card)]">
          <p className="text-sm font-semibold text-[var(--color-primary)]">Procesos por fecha</p>
          <h2 className="text-2xl font-bold tracking-tight">Borrado selectivo</h2>
          <p className="mt-2 text-sm font-medium text-[var(--color-muted)]">
            Borra procesos por meses, semanas o un rango personalizado sin tocar las notas.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button className="gap-2" type="button" variant="danger" onClick={() => setShowSelectiveDelete(true)}>
              <CalendarRange className="h-4 w-4" aria-hidden="true" />
              Configurar borrado
            </Button>
            <span className="text-sm text-[var(--color-muted-strong)]">
              {selectiveRange ? `${selectiveMatches.length} procesos en ${formatRange(selectiveRange)}` : 'Sin rango seleccionado'}
            </span>
          </div>
        </div>
      </div>

      {showGranularDelete ? (
        <GranularDeleteModal data={data} onClose={() => setShowGranularDelete(false)} onDelete={deleteGranular} />
      ) : null}

      {showSelectiveDelete ? (
        <SelectiveDeleteModal
          affectedCount={selectiveMatches.length}
          form={selectiveForm}
          onClose={() => setShowSelectiveDelete(false)}
          onDelete={deleteProcessesByRange}
          range={selectiveRange}
          setForm={setSelectiveForm}
        />
      ) : null}

      {deletePreview ? (
        <DeletePreviewModal
          data={data}
          preview={deletePreview}
          onClose={() => setDeletePreview(null)}
          onConfirm={confirmDeletePreview}
        />
      ) : null}
    </section>
  );
}

function GranularDeleteModal({
  data,
  onClose,
  onDelete,
}: {
  data: AppData;
  onClose: () => void;
  onDelete: (target: GranularDeleteTarget) => Promise<void>;
}) {
  const options: Array<{
    target: GranularDeleteTarget;
    title: string;
    description: string;
    count: string;
    Icon: LucideIcon;
  }> = [
    {
      target: 'all',
      title: 'Todos los datos',
      description: 'Procesos y notas guardadas en este navegador.',
      count: `${data.processes.length} procesos - ${data.notes.length} notas`,
      Icon: Database,
    },
    {
      target: 'processes',
      title: 'Solo procesos',
      description: 'Elimina la tabla de procesos y conserva las notas.',
      count: `${data.processes.length} procesos`,
      Icon: CalendarRange,
    },
    {
      target: 'notes',
      title: 'Solo notas',
      description: 'Elimina notas y conserva los procesos.',
      count: `${data.notes.length} notas`,
      Icon: Trash2,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-20 grid place-items-center bg-[var(--color-overlay)] p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl bg-[var(--color-surface)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight">Borrar datos locales</h3>
            <p className="mt-1 text-sm font-medium text-[var(--color-muted)]">Selecciona una opcion antes de confirmar.</p>
          </div>
          <Button type="button" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {options.map(({ target, title, description, count, Icon }) => (
            <button
              className="grid min-h-44 content-start gap-3 rounded-2xl border border-[var(--color-error-border)] bg-[var(--color-error-bg)] p-4 text-left text-[var(--color-error-text)] transition hover:border-[var(--color-danger)] hover:bg-[var(--color-error-hover)]"
              key={target}
              type="button"
              onClick={() => void onDelete(target)}
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-surface-glass)]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-base font-bold text-[var(--color-text)]">{title}</span>
              <span className="text-sm font-medium text-[var(--color-muted-strong)]">{description}</span>
              <span className="mt-auto text-sm font-bold">{count}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeletePreviewModal({
  data,
  preview,
  onClose,
  onConfirm,
}: {
  data: AppData;
  preview: DeletePreviewState;
  onClose: () => void;
  onConfirm: (selection: DeleteSelection) => Promise<void>;
}) {
  const [selectedProcessIds, setSelectedProcessIds] = useState(() => new Set(preview.processIds));
  const [selectedNoteIds, setSelectedNoteIds] = useState(() => new Set(preview.noteIds));

  const selectedProcesses = useMemo(
    () => data.processes.filter((process) => selectedProcessIds.has(process.id)),
    [data.processes, selectedProcessIds],
  );
  const selectedNotes = useMemo(
    () => data.notes.filter((note) => selectedNoteIds.has(note.id)),
    [data.notes, selectedNoteIds],
  );

  const originalTotal = preview.processIds.length + preview.noteIds.length;
  const selectedTotal = selectedProcesses.length + selectedNotes.length;
  const removedTotal = originalTotal - selectedTotal;

  function removeProcess(id: string): void {
    setSelectedProcessIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function removeNote(id: string): void {
    setSelectedNoteIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function restoreSelection(): void {
    setSelectedProcessIds(new Set(preview.processIds));
    setSelectedNoteIds(new Set(preview.noteIds));
  }

  return (
    <div
      className="fixed inset-0 z-30 grid place-items-center bg-[var(--color-overlay)] p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-3xl bg-[var(--color-surface)] p-5 shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--color-error-text)]">Preview de eliminacion</p>
            <h3 className="text-xl font-bold tracking-tight">{preview.title}</h3>
            <p className="mt-1 max-w-3xl text-sm font-medium text-[var(--color-muted)]">{preview.description}</p>
          </div>
          <Button type="button" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--color-error-border)] bg-[var(--color-error-bg)] px-4 py-3 text-sm font-semibold text-[var(--color-error-text)]">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <span>{describeDeleteCounts(selectedProcesses.length, selectedNotes.length)} se eliminaran.</span>
          {removedTotal > 0 ? <span>{removedTotal} fuera de la eliminacion.</span> : null}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {preview.processIds.length > 0 ? (
            <div className="grid content-start gap-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-bold text-[var(--color-text)]">Procesos</h4>
                <span className="text-sm font-semibold text-[var(--color-muted)]">{selectedProcesses.length} seleccionados</span>
              </div>
              <div className="max-h-96 overflow-auto rounded-2xl border border-[var(--color-border)]">
                {selectedProcesses.length > 0 ? (
                  selectedProcesses.map((process) => (
                    <div className="grid gap-2 border-b border-[var(--color-border-subtle)] p-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start" key={process.id}>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-[var(--color-text)]">{process.name}</p>
                        <p className="mt-1 text-xs font-medium text-[var(--color-muted)]">
                          {formatDate(process.date)} - CC: {process.identification || 'Sin identificacion'} - Tel: {process.phone || 'Sin telefono'}
                        </p>
                        {process.notes?.trim() ? (
                          <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted-strong)]">{process.notes.trim()}</p>
                        ) : null}
                      </div>
                      <button
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
                        type="button"
                        onClick={() => removeProcess(process.id)}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                        Quitar
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-sm font-medium text-[var(--color-muted)]">No quedan procesos en la lista.</p>
                )}
              </div>
            </div>
          ) : null}

          {preview.noteIds.length > 0 ? (
            <div className="grid content-start gap-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-bold text-[var(--color-text)]">Notas</h4>
                <span className="text-sm font-semibold text-[var(--color-muted)]">{selectedNotes.length} seleccionadas</span>
              </div>
              <div className="max-h-96 overflow-auto rounded-2xl border border-[var(--color-border)]">
                {selectedNotes.length > 0 ? (
                  selectedNotes.map((note) => (
                    <div className="grid gap-2 border-b border-[var(--color-border-subtle)] p-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start" key={note.id}>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-[var(--color-text)]">{note.title}</p>
                        <p className="mt-1 text-xs font-medium text-[var(--color-muted)]">Actualizada {formatDate(note.updatedAt.slice(0, 10))}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted-strong)]">{note.content.replace(/<[^>]+>/g, ' ').trim() || 'Sin contenido'}</p>
                      </div>
                      <button
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
                        type="button"
                        onClick={() => removeNote(note.id)}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                        Quitar
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-sm font-medium text-[var(--color-muted)]">No quedan notas en la lista.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button className="gap-2" type="button" onClick={restoreSelection}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Restaurar lista
          </Button>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              className="gap-2"
              disabled={selectedTotal === 0}
              type="button"
              variant="danger"
              onClick={() =>
                void onConfirm({
                  processIds: [...selectedProcessIds],
                  noteIds: [...selectedNoteIds],
                })
              }
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Confirmar eliminacion
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectiveDeleteModal({
  affectedCount,
  form,
  onClose,
  onDelete,
  range,
  setForm,
}: {
  affectedCount: number;
  form: SelectiveDeleteForm;
  onClose: () => void;
  onDelete: () => Promise<void>;
  range: DateRange | null;
  setForm: Dispatch<SetStateAction<SelectiveDeleteForm>>;
}) {
  return (
    <div
      className="fixed inset-0 z-20 grid place-items-center bg-[var(--color-overlay)] p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-[var(--color-surface)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight">Borrado selectivo de procesos</h3>
            <p className="mt-1 text-sm font-medium text-[var(--color-muted)]">Elige meses, semanas o fechas exactas.</p>
          </div>
          <Button type="button" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <DeleteModeButton
            active={form.mode === 'months'}
            Icon={Calendar}
            onClick={() => setForm((current) => ({ ...current, mode: 'months' }))}
          >
            Meses
          </DeleteModeButton>
          <DeleteModeButton
            active={form.mode === 'weeks'}
            Icon={CalendarDays}
            onClick={() => setForm((current) => ({ ...current, mode: 'weeks' }))}
          >
            Semanas
          </DeleteModeButton>
          <DeleteModeButton
            active={form.mode === 'range'}
            Icon={CalendarRange}
            onClick={() => setForm((current) => ({ ...current, mode: 'range' }))}
          >
            Rango
          </DeleteModeButton>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {form.mode === 'months' ? (
            <>
              <Field label="Mes A">
                <TextInput
                  type="month"
                  value={form.monthFrom}
                  onChange={(event) => setForm((current) => ({ ...current, monthFrom: event.target.value }))}
                />
              </Field>
              <Field label="Mes B">
                <TextInput
                  type="month"
                  value={form.monthTo}
                  onChange={(event) => setForm((current) => ({ ...current, monthTo: event.target.value }))}
                />
              </Field>
            </>
          ) : null}

          {form.mode === 'weeks' ? (
            <>
              <Field label="Semana A">
                <TextInput
                  type="week"
                  value={form.weekFrom}
                  onChange={(event) => setForm((current) => ({ ...current, weekFrom: event.target.value }))}
                />
              </Field>
              <Field label="Semana B">
                <TextInput
                  type="week"
                  value={form.weekTo}
                  onChange={(event) => setForm((current) => ({ ...current, weekTo: event.target.value }))}
                />
              </Field>
            </>
          ) : null}

          {form.mode === 'range' ? (
            <>
              <Field label="Fecha inicio">
                <TextInput
                  type="date"
                  value={form.dateFrom}
                  onChange={(event) => setForm((current) => ({ ...current, dateFrom: event.target.value }))}
                />
              </Field>
              <Field label="Fecha fin">
                <TextInput
                  type="date"
                  value={form.dateTo}
                  onChange={(event) => setForm((current) => ({ ...current, dateTo: event.target.value }))}
                />
              </Field>
            </>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm font-medium text-[var(--color-muted-strong)] sm:flex-row sm:items-center sm:justify-between">
          <span>{range ? `${affectedCount} procesos encontrados en ${formatRange(range)}` : 'Selecciona un rango para calcular los registros afectados.'}</span>
          <Button className="gap-2" type="button" variant="danger" onClick={() => void onDelete()}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Eliminar procesos
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeleteModeButton({
  active,
  children,
  Icon,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  Icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[0_8px_18px_rgba(91,124,250,0.18)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-text)]'
      }`}
      type="button"
      onClick={onClick}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </button>
  );
}
