// features/processes/ProcessesPage.tsx
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '../../components/Button';
import { Field, TextArea, TextInput } from '../../components/Field';
import { Pagination } from '../../components/Pagination';
import type { Process, ProcessStatus } from '../../types/app';
import { formatDateTime, nowIso } from '../../utils/dates';
import { createId } from '../../utils/id';
import { parseProcessesText, type ParsedProcess } from './services/processParser';

interface ProcessesPageProps {
  processes: Process[];
  onChange: (processes: Process[]) => void;
}

const statusOptions: Array<{ value: ProcessStatus; label: string; icon: string; classes: string }> = [
  { value: 'pending', label: 'Pendiente', icon: '○', classes: 'bg-amber-100 text-amber-900 border-amber-200' },
  { value: 'validation_only', label: 'Convalidaciones', icon: '◐', classes: 'bg-sky-100 text-sky-900 border-sky-200' },
  { value: 'complete', label: 'Completo', icon: '✓', classes: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  { value: 'unknown', label: 'Sin estado', icon: '·', classes: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const PROCESSES_PER_PAGE = 10;

function getStatusInfo(status: ProcessStatus) {
  return statusOptions.find((option) => option.value === status) ?? statusOptions[3];
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
    createdAt: now,
    updatedAt: now,
  };
}

export function ProcessesPage({ processes, onChange }: ProcessesPageProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProcessStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('');
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
      complete: processes.filter((process) => process.status === 'complete').length,
      validation: processes.filter((process) => process.status === 'validation_only').length,
      pending: processes.filter((process) => process.status === 'pending').length,
    }),
    [processes],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return processes.filter((process) => {
      const matchesQuery = !term || [process.name, process.identification, process.phone]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
      const matchesStatus = statusFilter === 'all' || process.status === statusFilter;
      const matchesDate = !dateFilter || process.date === dateFilter;
      return matchesQuery && matchesStatus && matchesDate;
    }).sort((a, b) => `${b.date}-${b.updatedAt}`.localeCompare(`${a.date}-${a.updatedAt}`));
  }, [dateFilter, processes, query, statusFilter]);

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

  const hasActiveFilters = Boolean(query.trim() || dateFilter || statusFilter !== 'all');

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, query, statusFilter]);

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
    setDateFilter('');
  }

  function saveProcess(): void {
    if (!draft.name.trim()) return;
    const next = { ...draft, name: draft.name.trim(), updatedAt: nowIso() };
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

  function deleteProcess(process: Process): void {
    if (!confirm(`Eliminar el proceso de ${process.name}?`)) return;
    onChange(processes.filter((item) => item.id !== process.id));
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
      <div className="rounded-lg border border-rose-100 bg-gradient-to-br from-rose-50 via-sky-50 to-emerald-50 p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Herramienta diaria</p>
            <h2 className="text-2xl font-semibold text-slate-950">Procesos</h2>
            <p className="mt-1 text-sm text-slate-600">Pega, revisa, busca y actualiza estados sin volver al Bloc de notas.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <TextInput
              placeholder="Buscar nombre, CC o telefono"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button type="button" variant="primary" onClick={() => setShowPaste(true)}>Pegar datos</Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="Σ" label="Total" value={stats.total} tone="bg-white" />
        <StatCard icon="✓" label="Completos" value={stats.complete} tone="bg-emerald-50" />
        <StatCard icon="◐" label="Convalidaciones" value={stats.validation} tone="bg-sky-50" />
        <StatCard icon="○" label="Pendientes" value={stats.pending} tone="bg-amber-50" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form className="grid content-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm" onSubmit={(event) => { event.preventDefault(); saveProcess(); }}>
          <h3 className="font-semibold">{editingId ? 'Editar registro' : 'Nuevo registro rapido'}</h3>
          <Field label="Fecha"><TextInput type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></Field>
          <Field label="Nombre"><TextInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
          <Field label="Identificacion"><TextInput value={draft.identification ?? ''} onChange={(event) => setDraft({ ...draft, identification: event.target.value })} /></Field>
          <Field label="Telefono"><TextInput value={draft.phone ?? ''} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></Field>
          <Field label="Estado">
            <select className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ProcessStatus })}>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.icon} {option.label}</option>)}
            </select>
          </Field>
          <Field label="Notas"><TextArea value={draft.notes ?? ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary">Guardar</Button>
            {editingId ? <Button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft()); }}>Cancelar</Button> : null}
          </div>
        </form>

        <div className="grid min-h-0 min-w-0 content-start gap-4">
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>Todos</FilterButton>
              {statusOptions.slice(0, 3).map((option) => (
                <FilterButton key={option.value} active={statusFilter === option.value} onClick={() => setStatusFilter(option.value)}>{option.icon} {option.label}</FilterButton>
              ))}
              {hasActiveFilters ? (
                <button className="text-sm font-medium text-slate-500 hover:text-slate-800 hover:underline" type="button" onClick={clearFilters}>
                  Limpiar filtros
                </button>
              ) : null}
            </div>
            <div className="sm:ml-auto">
              <TextInput type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
            </div>
          </div>

          <div className="min-h-[420px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-3 lg:max-h-[calc(100vh-360px)]">
            {grouped.length === 0 ? (
              <EmptyProcesses hasActiveFilters={hasActiveFilters} onClear={clearFilters} query={query} />
            ) : null}

            <div className="grid gap-4">
              {grouped.map(([date, items]) => {
                const relative = relativeDateLabel(date);
                return (
                <section className="grid gap-3" key={date}>
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold capitalize">
                        {relative ? <span className="text-slate-950">{relative} · </span> : null}
                        <span className={relative ? 'font-normal text-slate-500' : ''}>{formatProcessDate(date)}</span>
                      </h3>
                      <p className="text-sm text-slate-600">{items.length} procesos en esta pagina</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {statusOptions.slice(0, 3).map((option) => (
                        <span className={`rounded-full border px-2 py-1 ${option.classes}`} key={option.value}>
                          {option.icon} {items.filter((item) => item.status === option.value).length}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    {items.map((process) => {
                      const status = getStatusInfo(process.status);
                      const waHref = process.phone ? whatsappHref(process.phone) : null;
                      return (
                        <article className="grid gap-3 border-b border-slate-100 p-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_150px_190px_150px] md:items-center" key={process.id}>
                          <div className="min-w-0">
                            <h4 className="truncate font-semibold text-slate-950">{process.name}</h4>
                            <p className="text-xs text-slate-500">Actualizado {formatDateTime(process.updatedAt)}</p>
                          </div>
                          <p className="text-sm text-slate-700">
                            CC: {process.identification || <span className="text-slate-400">Falta</span>}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                            {process.phone ? (
                              <a className="font-medium hover:underline" href={`tel:${process.phone}`}>{process.phone}</a>
                            ) : (
                              <span className="text-slate-400">Sin telefono</span>
                            )}
                            {process.phone ? (
                              <button className="rounded-md bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200" type="button" onClick={() => copyPhone(process.id, process.phone ?? '')}>
                                {copiedId === process.id ? 'Copiado ✓' : 'Copiar'}
                              </button>
                            ) : null}
                            {waHref ? (
                              <a className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100" href={waHref} target="_blank" rel="noreferrer">
                                WhatsApp
                              </a>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2 md:justify-end">
                            <select className={`min-h-9 rounded-full border px-3 text-sm font-medium ${status.classes}`} value={process.status} onChange={(event) => updateStatus(process.id, event.target.value as ProcessStatus)}>
                              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.icon} {option.label}</option>)}
                            </select>
                            <button className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100" type="button" onClick={() => { setEditingId(process.id); setDraft(process); }}>Editar</button>
                            <button className="rounded-md px-2 py-1 text-sm text-red-700 hover:bg-red-50" type="button" onClick={() => deleteProcess(process)}>Eliminar</button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );})}
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
          className="fixed inset-0 z-20 grid place-items-center bg-slate-950/30 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowPaste(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Pegar procesos</h3>
                <p className="mt-1 text-sm text-slate-600">Acepta fechas, tabulaciones, espacios múltiples y simbolos como * - *, -_- o -.</p>
              </div>
              <Button type="button" onClick={() => setShowPaste(false)}>Cerrar</Button>
            </div>
            <TextArea className="mt-4 min-h-52 w-full rounded-md border border-slate-300 p-3 text-sm" value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder={'14/9/2026\nDUBAN SNEIDER BUSTILLO SARMIENTO  1005187002  3026000085 -'} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="primary" onClick={reviewPaste}>Revisar datos</Button>
              <Button type="button" onClick={() => { setPasteText(''); setPreview([]); }}>Limpiar</Button>
            </div>
            {preview.length > 0 ? (
              <div className="mt-5 grid gap-3">
                <p className="text-sm font-medium">Se encontraron {preview.length} registros. {preview.filter((item) => item.duplicateOf).length} posibles duplicados.</p>
                <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
                  {preview.map((item) => {
                    const status = getStatusInfo(item.process.status);
                    const flagged = item.warnings.length > 0 || Boolean(item.duplicateOf);
                    return (
                      <div className={`grid gap-2 border-b border-slate-100 p-3 last:border-b-0 md:grid-cols-[1fr_120px_130px_160px] ${flagged ? 'bg-amber-50' : ''}`} key={item.process.id}>
                        <strong>{item.process.name}</strong>
                        <span>{item.process.identification || 'Sin CC'}</span>
                        <span>{item.process.phone || 'Sin tel.'}</span>
                        <span className={`rounded-full border px-2 py-1 text-xs font-medium ${status.classes}`}>{status.icon} {status.label}</span>
                        {flagged ? <p className="text-sm text-amber-800 md:col-span-4">Atencion: {[...item.warnings, item.duplicateOf ? 'posible duplicado' : ''].filter(Boolean).join(', ')}</p> : null}
                      </div>
                    );
                  })}
                </div>
                <Button type="button" variant="primary" onClick={importPreview}>Importar registros no duplicados</Button>
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
    <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <div>
        <h3 className="text-lg font-semibold text-slate-950">No encontramos procesos</h3>
        <p className="mt-2 text-sm text-slate-600">
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

function StatCard({ icon, label, value, tone }: { icon: string; label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 p-4 shadow-sm ${tone}`}>
      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
        <span aria-hidden="true">{icon}</span> {label}
      </p>
      <p className="mt-1 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button className={`rounded-full border px-3 py-2 text-sm font-medium ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`} type="button" onClick={onClick}>
      {children}
    </button>
  );
}