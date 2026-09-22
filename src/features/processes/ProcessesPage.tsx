import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Calendar, CalendarDays, CalendarRange, ClipboardPaste, FilterX, Trash2, type LucideIcon } from 'lucide-react';
import { Button } from '../../components/Button';
import { Field, TextArea, TextInput } from '../../components/Field';
import { Pagination } from '../../components/Pagination';
import { NO_APTO_PROCESS_STATUS, isCompleteProcessStatus, type Process, type ProcessStatus } from '../../types/app';
import { getIsoWeekRange, getMonthRange, isDateInRange, normalizeDateRange, type DateRange } from '../../utils/dateRanges';
import { formatDateTime, nowIso } from '../../utils/dates';
import { confirmDialog, contentDialog } from '../../utils/dialogs';
import { escapeHtml } from '../../utils/html';
import { createId } from '../../utils/id';
import { parseProcessesText, type ParsedProcess } from './services/processParser';

interface ProcessesPageProps {
  processes: Process[];
  onChange: (processes: Process[]) => void;
}

const statusOptions: Array<{ value: ProcessStatus; label: string; icon: string; classes: string }> = [
  {
    value: 'pending',
    label: 'Pendiente',
    icon: 'P',
    classes: 'border-[var(--color-status-pending-border)] bg-[var(--color-status-pending-bg)] text-[var(--color-status-pending-text)]',
  },
  {
    value: 'validation_only',
    label: 'Convalidaciones',
    icon: 'CV',
    classes: 'border-[var(--color-status-validation-border)] bg-[var(--color-status-validation-bg)] text-[var(--color-status-validation-text)]',
  },
  {
    value: 'complete',
    label: 'Completo',
    icon: 'OK',
    classes: 'border-[var(--color-status-complete-border)] bg-[var(--color-status-complete-bg)] text-[var(--color-status-complete-text)]',
  },
  {
    value: NO_APTO_PROCESS_STATUS,
    label: NO_APTO_PROCESS_STATUS,
    icon: '',
    classes: 'border-[var(--color-status-no-apto-border)] bg-[var(--color-status-no-apto-bg)] text-[var(--color-status-no-apto-text)]',
  },
  {
    value: 'unknown',
    label: 'Sin estado',
    icon: '-',
    classes: 'border-[var(--color-status-unknown-border)] bg-[var(--color-status-unknown-bg)] text-[var(--color-status-unknown-text)]',
  },
];

const PROCESSES_PER_PAGE = 10;
const visibleStatusOptions = statusOptions.filter((option) => option.value !== 'unknown');

type DateFilterMode = 'all' | 'month' | 'week' | 'range';

interface ProcessDateFilters {
  mode: DateFilterMode;
  month: string;
  week: string;
  from: string;
  to: string;
}

function getStatusInfo(status: ProcessStatus) {
  return statusOptions.find((option) => option.value === status) ?? statusOptions[statusOptions.length - 1];
}

function formatStatusLabel(option: { icon: string; label: string }): string {
  return option.icon ? `${option.icon} ${option.label}` : option.label;
}

function emptyDateFilters(): ProcessDateFilters {
  return {
    mode: 'all',
    month: '',
    week: '',
    from: '',
    to: '',
  };
}

function getDateFilterRange(filters: ProcessDateFilters): DateRange | null {
  if (filters.mode === 'month') return getMonthRange(filters.month);
  if (filters.mode === 'week') return getIsoWeekRange(filters.week);
  if (filters.mode === 'range') return normalizeDateRange(filters.from, filters.to);
  return null;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function relativeDateLabel(date: string): string | null {
  if (date === today()) return 'Hoy';
  if (date === yesterday()) return 'Ayer';
  return null;
}

function formatProcessDate(date: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'full' }).format(new Date(`${date}T12:00:00`));
}

function whatsappHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) return null;
  return `https://wa.me/57${digits}`;
}

function emptyDraft(): Process {
  const now = nowIso();
  return {
    id: createId('process'),
    date: today(),
    name: '',
    identification: '',
    phone: '',
    status: 'pending',
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function ProcessesPage({ processes, onChange }: ProcessesPageProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProcessStatus | 'all'>('all');
  const [dateFilters, setDateFilters] = useState<ProcessDateFilters>(emptyDateFilters);
  const [draft, setDraft] = useState<Process>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [preview, setPreview] = useState<ParsedProcess[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      total: processes.length,
      complete: processes.filter((process) => isCompleteProcessStatus(process.status)).length,
      noApto: processes.filter((process) => process.status === NO_APTO_PROCESS_STATUS).length,
      validation: processes.filter((process) => process.status === 'validation_only').length,
      pending: processes.filter((process) => process.status === 'pending').length,
    }),
    [processes],
  );

  const activeDateRange = useMemo(() => getDateFilterRange(dateFilters), [dateFilters]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return processes
      .filter((process) => {
        const matchesQuery =
          !term ||
          [process.name, process.identification, process.phone]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(term);
        const matchesStatus =
          statusFilter === 'all' ||
          process.status === statusFilter ||
          (statusFilter === 'complete' && process.status === NO_APTO_PROCESS_STATUS);
        const matchesDate = !activeDateRange || isDateInRange(process.date, activeDateRange);
        return matchesQuery && matchesStatus && matchesDate;
      })
      .sort((a, b) => `${b.date}-${b.updatedAt}`.localeCompare(`${a.date}-${a.updatedAt}`));
  }, [activeDateRange, processes, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PROCESSES_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * PROCESSES_PER_PAGE;
    return filtered.slice(start, start + PROCESSES_PER_PAGE);
  }, [filtered, safePage]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Process[]>();
    for (const process of paginated) {
      groups.set(process.date, [...(groups.get(process.date) ?? []), process]);
    }
    return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [paginated]);

  const hasActiveFilters = Boolean(query.trim() || activeDateRange || statusFilter !== 'all');

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilters, query, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!showPaste) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setShowPaste(false);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showPaste]);

  function clearFilters(): void {
    setQuery('');
    setStatusFilter('all');
    setDateFilters(emptyDateFilters());
  }

  function saveProcess(): void {
    if (!draft.name.trim()) return;
    const next = { ...draft, name: draft.name.trim(), notes: draft.notes?.trim(), updatedAt: nowIso() };
    if (editingId) {
      onChange(processes.map((process) => (process.id === editingId ? next : process)));
    } else {
      onChange([next, ...processes]);
    }
    setDraft(emptyDraft());
    setEditingId(null);
  }

  function updateStatus(id: string, status: ProcessStatus): void {
    onChange(processes.map((process) => (process.id === id ? { ...process, status, updatedAt: nowIso() } : process)));
  }

  async function deleteProcess(process: Process): Promise<void> {
    const confirmed = await confirmDialog({
      title: 'Eliminar proceso',
      text: `El proceso de ${process.name} se eliminara de este navegador.`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;
    onChange(processes.filter((item) => item.id !== process.id));
  }

  async function previewProcessNote(process: Process): Promise<void> {
    const note = process.notes?.trim();
    if (!note) return;

    await contentDialog({
      title: `Nota de ${process.name}`,
      html: `
        <div class="app-dialog-note app-process-note">
          ${escapeHtml(note)}
        </div>
        <p class="app-dialog-note-meta">
          Proceso del ${formatProcessDate(process.date)} - Actualizado ${formatDateTime(process.updatedAt)}
        </p>
      `,
    });
  }

  async function previewProcessName(process: Process): Promise<void> {
    await contentDialog({
      title: 'Nombre completo',
      html: `
        <div class="app-dialog-note app-process-note">
          ${escapeHtml(process.name)}
        </div>
        <p class="app-dialog-note-meta">
          CC: ${escapeHtml(process.identification || 'Sin identificacion')} - Proceso del ${formatProcessDate(process.date)}
        </p>
      `,
    });
  }

  function copyPhone(id: string, phone: string): void {
    void navigator.clipboard?.writeText(phone);
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 1500);
  }

  function reviewPaste(): void {
    setPreview(parseProcessesText(pasteText, processes));
  }

  function importPreview(): void {
    const selected = preview.filter((item) => !item.duplicateOf).map((item) => item.process);
    onChange([...selected, ...processes]);
    setPasteText('');
    setPreview([]);
    setShowPaste(false);
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-3xl border border-[var(--color-card-border)] bg-[var(--color-hero-process)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--color-primary)]">Herramienta diaria</p>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">Procesos</h2>
            <p className="mt-1 max-w-2xl text-sm font-medium text-[var(--color-muted)]">
              Pega, revisa, busca y actualiza estados sin volver al Bloc de notas.
            </p>
          </div>
          <div className="grid gap-2 sm:min-w-[420px] sm:grid-cols-[1fr_auto]">
            <TextInput
              placeholder="Buscar nombre, CC o telefono"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button className="gap-2" type="button" variant="primary" onClick={() => setShowPaste(true)}>
              <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
              Pegar datos
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon="T" label="Total" value={stats.total} tone="bg-[var(--color-surface)]" />
        <StatCard icon="OK" label="Completos" value={stats.complete} tone="bg-[var(--color-stat-complete)]" />
        <StatCard
          icon="OK"
          label="COMPLETO - NO APTO"
          value={stats.noApto}
          tone="border-[var(--color-status-no-apto-border)] bg-[var(--color-stat-no-apto)]"
          iconTone="bg-[var(--color-stat-no-apto-icon-bg)] text-[var(--color-stat-no-apto-icon-text)]"
          valueTone="text-[var(--color-stat-no-apto-value)]"
        />
        <StatCard icon="CV" label="Convalidaciones" value={stats.validation} tone="bg-[var(--color-stat-validation)]" />
        <StatCard icon="P" label="Pendientes" value={stats.pending} tone="bg-[var(--color-stat-pending)]" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form
          className="grid content-start gap-3 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-panel)] p-5 shadow-[var(--shadow-card)]"
          onSubmit={(event) => {
            event.preventDefault();
            saveProcess();
          }}
        >
          <h3 className="text-lg font-bold tracking-tight">{editingId ? 'Editar registro' : 'Nuevo registro rapido'}</h3>
          <Field label="Fecha">
            <TextInput type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
          </Field>
          <Field label="Nombre">
            <TextInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </Field>
          <Field label="Identificacion">
            <TextInput
              value={draft.identification ?? ''}
              onChange={(event) => setDraft({ ...draft, identification: event.target.value })}
            />
          </Field>
          <Field label="Telefono">
            <TextInput value={draft.phone ?? ''} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
          </Field>
          <Field label="Estado">
            <select
              className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-panel)] px-3 py-2 text-sm text-[var(--color-text)]"
              value={draft.status}
              onChange={(event) => setDraft({ ...draft, status: event.target.value as ProcessStatus })}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {formatStatusLabel(option)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notas">
            <TextArea value={draft.notes ?? ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary">
              Guardar
            </Button>
            {editingId ? (
              <Button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setDraft(emptyDraft());
                }}
              >
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>

        <div className="grid min-h-0 min-w-0 content-start gap-4">
          <div className="grid gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-panel)] p-3 shadow-[var(--shadow-soft)] xl:grid-cols-[minmax(0,1fr)_minmax(360px,auto)] xl:items-start">
            <div className="flex flex-wrap items-center gap-2">
              <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                Todos
              </FilterButton>
              {visibleStatusOptions.map((option) => (
                <FilterButton key={option.value} active={statusFilter === option.value} onClick={() => setStatusFilter(option.value)}>
                  {formatStatusLabel(option)}
                </FilterButton>
              ))}
              {hasActiveFilters ? (
                <button className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)] hover:underline" type="button" onClick={clearFilters}>
                  <FilterX className="h-4 w-4" aria-hidden="true" />
                  Limpiar filtros
                </button>
              ) : null}
            </div>

            <div className="grid gap-2 xl:justify-self-end">
              <div className="flex flex-wrap gap-2">
                <DateFilterButton active={dateFilters.mode === 'all'} Icon={FilterX} onClick={() => setDateFilters(emptyDateFilters())}>
                  Sin fecha
                </DateFilterButton>
                <DateFilterButton active={dateFilters.mode === 'month'} Icon={Calendar} onClick={() => setDateFilters((current) => ({ ...current, mode: 'month' }))}>
                  Mes
                </DateFilterButton>
                <DateFilterButton active={dateFilters.mode === 'week'} Icon={CalendarDays} onClick={() => setDateFilters((current) => ({ ...current, mode: 'week' }))}>
                  Semana
                </DateFilterButton>
                <DateFilterButton active={dateFilters.mode === 'range'} Icon={CalendarRange} onClick={() => setDateFilters((current) => ({ ...current, mode: 'range' }))}>
                  Rango
                </DateFilterButton>
              </div>

              {dateFilters.mode === 'month' ? (
                <TextInput
                  aria-label="Filtrar por mes"
                  type="month"
                  value={dateFilters.month}
                  onChange={(event) => setDateFilters((current) => ({ ...current, month: event.target.value }))}
                />
              ) : null}

              {dateFilters.mode === 'week' ? (
                <TextInput
                  aria-label="Filtrar por semana"
                  type="week"
                  value={dateFilters.week}
                  onChange={(event) => setDateFilters((current) => ({ ...current, week: event.target.value }))}
                />
              ) : null}

              {dateFilters.mode === 'range' ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Fecha A">
                    <TextInput
                      type="date"
                      value={dateFilters.from}
                      onChange={(event) => setDateFilters((current) => ({ ...current, from: event.target.value }))}
                    />
                  </Field>
                  <Field label="Fecha B">
                    <TextInput
                      type="date"
                      value={dateFilters.to}
                      onChange={(event) => setDateFilters((current) => ({ ...current, to: event.target.value }))}
                    />
                  </Field>
                </div>
              ) : null}
            </div>
          </div>

          <div className="min-h-[420px] overflow-y-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-3 shadow-inner lg:max-h-[calc(100vh-360px)]">
            {grouped.length === 0 ? <EmptyProcesses hasActiveFilters={hasActiveFilters} onClear={clearFilters} query={query} /> : null}

            <div className="grid gap-4">
              {grouped.map(([date, items]) => {
                const relative = relativeDateLabel(date);
                return (
                  <section className="grid gap-3" key={date}>
                    <div className="flex flex-wrap items-end justify-between gap-2 px-1">
                      <div>
                        <h3 className="text-lg font-bold capitalize text-[var(--color-text)]">
                          {relative ? <span>{relative} - </span> : null}
                          <span className={relative ? 'font-semibold text-[var(--color-muted)]' : ''}>{formatProcessDate(date)}</span>
                        </h3>
                        <p className="text-sm font-medium text-[var(--color-muted)]">{items.length} procesos en esta pagina</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {visibleStatusOptions.map((option) => (
                          <span className={`rounded-full border px-2 py-1 font-semibold ${option.classes}`} key={option.value}>
                            {formatStatusLabel(option)} {items.filter((item) => (option.value === 'complete' ? isCompleteProcessStatus(item.status) : item.status === option.value)).length}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
                      {items.map((process) => {
                        const status = getStatusInfo(process.status);
                        const waHref = process.phone ? whatsappHref(process.phone) : null;
                        const note = process.notes?.trim();
                        const hasNote = Boolean(note);
                        return (
                          <article className="grid gap-3 border-b border-[var(--color-border-subtle)] p-4 transition-colors last:border-b-0 hover:bg-[var(--color-surface-soft)] md:grid-cols-[minmax(0,1fr)_150px_210px_170px] md:items-center" key={process.id}>
                            <div className="min-w-0">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <button
                                  className="min-w-0 truncate text-left font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] hover:underline"
                                  onClick={() => void previewProcessName(process)}
                                  title={process.name}
                                  type="button"
                                >
                                  {process.name}
                                </button>
                                {hasNote ? (
                                  <span className="rounded-full border border-[var(--color-accent-border)] bg-[var(--color-accent-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--color-accent-text)]">
                                    Tiene nota
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs text-[var(--color-muted)]">Actualizado {formatDateTime(process.updatedAt)}</p>
                              {hasNote ? (
                                <p className="mt-1 line-clamp-1 text-xs font-medium text-[var(--color-muted-strong)]">Nota: {note}</p>
                              ) : (
                                <p className="mt-1 text-xs text-[var(--color-subtle)]">Sin nota registrada</p>
                              )}
                            </div>

                            <p className="text-sm font-medium text-[var(--color-muted-strong)]">
                              CC: {process.identification || <span className="text-[var(--color-subtle)]">Falta</span>}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-muted-strong)]">
                              {process.phone ? (
                                <a className="font-semibold hover:underline" href={`tel:${process.phone}`}>
                                  {process.phone}
                                </a>
                              ) : (
                                <span className="text-[var(--color-subtle)]">Sin telefono</span>
                              )}
                              {process.phone ? (
                                <button className="rounded-lg bg-[var(--color-surface-muted)] px-2 py-1 text-xs font-semibold hover:bg-[var(--color-primary-soft)]" type="button" onClick={() => copyPhone(process.id, process.phone ?? '')}>
                                  {copiedId === process.id ? 'Copiado' : 'Copiar'}
                                </button>
                              ) : null}
                              {waHref ? (
                                <a className="rounded-lg bg-[var(--color-success-bg)] px-2 py-1 text-xs font-semibold text-[var(--color-success-text)] hover:bg-[var(--color-complete)]" href={waHref} target="_blank" rel="noreferrer">
                                  WhatsApp
                                </a>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap gap-2 md:justify-end">
                              <select className={`min-h-9 rounded-full border px-3 text-sm font-semibold ${status.classes}`} value={process.status} onChange={(event) => updateStatus(process.id, event.target.value as ProcessStatus)}>
                                {statusOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {formatStatusLabel(option)}
                                  </option>
                                ))}
                              </select>
                              {hasNote ? (
                                <button className="rounded-lg px-2 py-1 text-sm font-semibold text-[var(--color-accent-text)] hover:bg-[var(--color-accent-bg)]" type="button" onClick={() => void previewProcessNote(process)}>
                                  Ver nota
                                </button>
                              ) : null}
                              <button className="rounded-lg px-2 py-1 text-sm font-semibold text-[var(--color-muted)] hover:bg-[var(--color-surface-muted)]" type="button" onClick={() => { setEditingId(process.id); setDraft(process); }}>
                                Editar
                              </button>
                              <button className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-[var(--color-error-text)] hover:bg-[var(--color-error-bg)]" type="button" onClick={() => void deleteProcess(process)}>
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                Eliminar
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          <Pagination
            currentPage={safePage}
            hasActiveSearch={hasActiveFilters}
            itemLabel="procesos"
            onPageChange={setCurrentPage}
            pageSize={PROCESSES_PER_PAGE}
            totalItems={filtered.length}
          />
        </div>
      </div>

      {showPaste ? (
        <div
          className="fixed inset-0 z-20 grid place-items-center bg-[var(--color-overlay)] p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowPaste(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-[var(--color-surface)] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold tracking-tight">Pegar procesos</h3>
                <p className="mt-1 text-sm font-medium text-[var(--color-muted)]">
                  Acepta fechas, tabulaciones, espacios multiples, simbolos (* - *, -_-, -) y estados (ok, completos, cv, convalidaciones, p, pendientes, COMPLETO - NO APTO).
                </p>
              </div>
              <Button type="button" onClick={() => setShowPaste(false)}>
                Cerrar
              </Button>
            </div>
            <TextArea
              className="mt-4 min-h-52 w-full rounded-2xl border border-[var(--color-border)] p-3 text-sm"
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
              placeholder={'14/9/2026\nPERSONA DE EJEMPLO  1000000000  3000000000 ok\nOTRA PERSONA  1000000001  3000000001 cv\nTERCERA PERSONA  1000000002  3000000002 COMPLETO - NO APTO'}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="primary" onClick={reviewPaste}>
                Revisar datos
              </Button>
              <Button type="button" onClick={() => { setPasteText(''); setPreview([]); }}>
                Limpiar
              </Button>
            </div>
            {preview.length > 0 ? (
              <div className="mt-5 grid gap-3">
                <p className="text-sm font-semibold">
                  Se encontraron {preview.length} registros. {preview.filter((item) => item.duplicateOf).length} posibles duplicados.
                </p>
                <div className="max-h-72 overflow-auto rounded-2xl border border-[var(--color-border)]">
                  {preview.map((item) => {
                    const status = getStatusInfo(item.process.status);
                    const flagged = item.warnings.length > 0 || Boolean(item.duplicateOf);
                    return (
                      <div className={`grid gap-2 border-b border-[var(--color-border-subtle)] p-3 last:border-b-0 md:grid-cols-[1fr_120px_130px_160px] ${flagged ? 'bg-[var(--color-warning-bg)]' : ''}`} key={item.process.id}>
                        <strong>{item.process.name}</strong>
                        <span>{item.process.identification || 'Sin CC'}</span>
                        <span>{item.process.phone || 'Sin tel.'}</span>
                        <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${status.classes}`}>{formatStatusLabel(status)}</span>
                        {flagged ? <p className="text-sm text-[var(--color-warning-text)] md:col-span-4">Atencion: {[...item.warnings, item.duplicateOf ? 'posible duplicado' : ''].filter(Boolean).join(', ')}</p> : null}
                      </div>
                    );
                  })}
                </div>
                <Button type="button" variant="primary" onClick={importPreview}>
                  Importar registros no duplicados
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function EmptyProcesses({ query, hasActiveFilters, onClear }: { query: string; hasActiveFilters: boolean; onClear: () => void }) {
  return (
    <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
      <div>
        <h3 className="text-lg font-bold text-[var(--color-text)]">No encontramos procesos</h3>
        <p className="mt-2 text-sm font-medium text-[var(--color-muted)]">
          {query.trim() ? `No hay procesos que coincidan con: "${query.trim()}".` : 'No hay procesos con los filtros actuales.'}
        </p>
        {hasActiveFilters ? (
          <Button className="mt-4" type="button" onClick={onClear}>
            Limpiar busqueda
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  iconTone = 'bg-[var(--color-surface-glass)] text-[var(--color-primary)]',
  valueTone = 'text-[var(--color-text)]',
}: {
  icon: string;
  label: string;
  value: number;
  tone: string;
  iconTone?: string;
  valueTone?: string;
}) {
  return (
    <div className={`rounded-3xl border border-[var(--color-card-border)] p-4 shadow-[var(--shadow-card)] ${tone}`}>
      <p className="flex items-center gap-2 text-sm font-bold text-[var(--color-muted)]">
        <span className={`grid h-7 min-w-7 place-items-center rounded-xl px-1 text-xs shadow-sm ${iconTone}`} aria-hidden="true">{icon}</span>
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${valueTone}`}>{value}</p>
    </div>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[0_8px_18px_rgba(91,124,250,0.18)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-text)]'
      }`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function DateFilterButton({
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
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
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
