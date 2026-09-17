// features/notes/NotesPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/Button';
import { Field, TextArea, TextInput } from '../../components/Field';
import { Pagination } from '../../components/Pagination';
import type { Note } from '../../types/app';
import { formatDateTime, nowIso } from '../../utils/dates';
import { createId } from '../../utils/id';

interface NotesPageProps {
  notes: Note[];
  onChange: (notes: Note[]) => void;
}

const emptyDraft = { title: '', content: '' };
const NOTES_PER_PAGE = 8;

export function NotesPage({ notes, onChange }: NotesPageProps) {
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const editingNote = notes.find((note) => note.id === editingId);
  const filteredNotes = useMemo(() => {
    const term = query.trim().toLowerCase();
    return notes
      .filter((note) => `${note.title} ${note.content}`.toLowerCase().includes(term))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, query]);
  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / NOTES_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleNotes = useMemo(() => {
    const start = (safePage - 1) * NOTES_PER_PAGE;
    return filteredNotes.slice(start, start + NOTES_PER_PAGE);
  }, [filteredNotes, safePage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!editingId) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setEditingId(null);
        setDraft(emptyDraft);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [editingId]);

  function saveNote(): void {
    const title = draft.title.trim();
    const content = draft.content.trim();
    if (!title && !content) return;

    const now = nowIso();
    if (editingNote) {
      onChange(
        notes.map((note) =>
          note.id === editingNote.id ? { ...note, title, content, updatedAt: now } : note,
        ),
      );
    } else {
      onChange([
        {
          id: createId('note'),
          title: title || 'Nota sin titulo',
          content,
          createdAt: now,
          updatedAt: now,
        },
        ...notes,
      ]);
    }

    setDraft(emptyDraft);
    setEditingId(null);
  }

  function editNote(note: Note): void {
    setEditingId(note.id);
    setDraft({ title: note.title, content: note.content });
  }

  function deleteNote(note: Note): void {
    if (!confirm(`Eliminar la nota "${note.title}"?`)) return;
    onChange(notes.filter((item) => item.id !== note.id));
  }

  function toggleExpanded(id: string): void {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <form
        className="grid content-start gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          saveNote();
        }}
      >
        <h2 className="text-lg font-semibold">{editingNote ? 'Editar nota' : 'Nueva nota'}</h2>
        <Field label="Titulo">
          <TextInput
            placeholder="Sin titulo"
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </Field>
        <Field label="Contenido">
          <TextArea
            value={draft.content}
            onChange={(event) => setDraft({ ...draft, content: event.target.value })}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary">
            Guardar nota
          </Button>
          {editingNote ? (
            <Button
              type="button"
              onClick={() => {
                setEditingId(null);
                setDraft(emptyDraft);
              }}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>

      <div className="grid min-h-0 content-start gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <Field label="Buscar notas">
              <TextInput
                placeholder="Titulo o contenido"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </Field>
          </div>
          <p className="pb-2 text-sm text-slate-500">
            {filteredNotes.length} {filteredNotes.length === 1 ? 'nota' : 'notas'}
          </p>
        </div>
        <div className="min-h-[420px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-3 lg:max-h-[calc(100vh-280px)]">
          {visibleNotes.length === 0 ? (
            <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">No encontramos notas</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {query.trim()
                    ? `No hay notas que coincidan con: "${query.trim()}".`
                    : 'Aun no hay notas guardadas.'}
                </p>
                {query.trim() ? (
                  <Button className="mt-4" type="button" onClick={() => setQuery('')}>
                    Limpiar busqueda
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="grid gap-3">
            {visibleNotes.map((note) => {
              const isEditing = note.id === editingId;
              const isExpanded = expandedIds.has(note.id);
              const isLong = note.content.length > 220;
              return (
                <article
                  className={`rounded-md border bg-white p-4 transition-colors ${
                    isEditing ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
                  }`}
                  key={note.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold">{note.title}</h3>
                      <p
                        className={`mt-1 whitespace-pre-wrap break-words text-sm text-slate-700 ${
                          isLong && !isExpanded ? 'line-clamp-4' : ''
                        }`}
                      >
                        {note.content}
                      </p>
                      {isLong ? (
                        <button
                          className="mt-1 text-xs font-medium text-slate-600 hover:underline"
                          onClick={() => toggleExpanded(note.id)}
                          type="button"
                        >
                          {isExpanded ? 'Ver menos' : 'Ver mas'}
                        </button>
                      ) : null}
                      <p className="mt-3 text-xs text-slate-500">
                        Creada {formatDateTime(note.createdAt)} - Modificada{' '}
                        {formatDateTime(note.updatedAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" onClick={() => editNote(note)}>
                        Editar
                      </Button>
                      <Button type="button" variant="danger" onClick={() => deleteNote(note)}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        <Pagination
          currentPage={safePage}
          hasActiveSearch={Boolean(query.trim())}
          itemLabel="notas"
          onPageChange={setCurrentPage}
          pageSize={NOTES_PER_PAGE}
          totalItems={filteredNotes.length}
        />
      </div>
    </section>
  );
}