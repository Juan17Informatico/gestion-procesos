// features/notes/NotesPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/Button';
import { Field, TextInput } from '../../components/Field';
import { Pagination } from '../../components/Pagination';
import { RichTextEditor } from '../../components/RichTextEditor';
import type { Note } from '../../types/app';
import { formatDateTime, nowIso } from '../../utils/dates';
import { confirmDialog, contentDialog } from '../../utils/dialogs';
import { htmlToPlainText, sanitizeRichTextHtml } from '../../utils/html';
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
      .filter((note) => `${note.title} ${htmlToPlainText(note.content)}`.toLowerCase().includes(term))
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
    const content = sanitizeRichTextHtml(draft.content).trim();
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

  async function deleteNote(note: Note): Promise<void> {
    const confirmed = await confirmDialog({
      title: 'Eliminar nota',
      text: `La nota "${note.title}" se eliminara de este navegador.`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;
    onChange(notes.filter((item) => item.id !== note.id));
  }

  async function previewNote(note: Note): Promise<void> {
    await contentDialog({
      title: note.title || 'Nota sin titulo',
      html: `
        <div class="rich-text-content note-content app-dialog-note">
          ${sanitizeRichTextHtml(note.content)}
        </div>
        <p class="app-dialog-note-meta">
          Creada ${formatDateTime(note.createdAt)} - Modificada ${formatDateTime(note.updatedAt)}
        </p>
      `,
    });
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
    <section className="grid gap-5 xl:grid-cols-[minmax(380px,500px)_minmax(0,1fr)]">
      <form
        className="grid content-start gap-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-panel)] p-5 shadow-[var(--shadow-card)]"
        onSubmit={(event) => {
          event.preventDefault();
          saveNote();
        }}
      >
        <div>
          <p className="text-sm font-semibold text-[var(--color-primary)]">Bloc enriquecido</p>
          <h2 className="text-2xl font-bold tracking-tight">{editingNote ? 'Editar nota' : 'Nueva nota'}</h2>
        </div>
        <Field label="Titulo">
          <TextInput
            placeholder="Sin titulo"
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </Field>
        <div className="grid gap-1.5 text-sm font-semibold text-[var(--color-muted)]">
          <span>Contenido</span>
          <RichTextEditor
            value={draft.content}
            onChange={(content) => setDraft({ ...draft, content })}
            placeholder="Escribe una nota con formato..."
          />
        </div>
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
        <div className="rounded-3xl border border-[var(--color-card-border)] bg-[var(--color-hero-notes)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <Field label="Buscar notas">
                <TextInput
                  placeholder="Titulo o contenido"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </Field>
            </div>
            <p className="pb-2 text-sm font-semibold text-[var(--color-muted)]">
              {filteredNotes.length} {filteredNotes.length === 1 ? 'nota' : 'notas'}
            </p>
          </div>
        </div>
        <div className="min-h-[420px] overflow-y-auto rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-3 shadow-inner lg:max-h-[calc(100vh-280px)]">
          {visibleNotes.length === 0 ? (
            <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text)]">No encontramos notas</h3>
                <p className="mt-2 text-sm font-medium text-[var(--color-muted)]">
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
              const noteText = htmlToPlainText(note.content);
              const safeContent = sanitizeRichTextHtml(note.content);
              const isLong = noteText.length > 220;
              return (
                <article
                  className={`rounded-3xl border p-5 shadow-[var(--shadow-card)] transition-colors ${
                    isEditing
                      ? 'border-[var(--color-primary-soft-border)] bg-[var(--color-primary-soft)]'
                      : 'border-[var(--color-card-border)] bg-[var(--color-surface)]'
                  }`}
                  key={note.id}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start gap-2">
                        <h3 className="break-words text-lg font-bold tracking-tight text-[var(--color-text)]">{note.title}</h3>
                        {isEditing ? (
                          <span className="rounded-full border border-[var(--color-primary-soft-border)] bg-[var(--color-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--color-primary-strong)]">
                            Editando
                          </span>
                        ) : null}
                      </div>
                      <div
                        className={`rich-text-content note-content mt-2 max-w-3xl break-words text-[13px] leading-relaxed text-[var(--color-muted-strong)] ${
                          isLong && !isExpanded ? 'line-clamp-4' : ''
                        }`}
                        dangerouslySetInnerHTML={{ __html: safeContent }}
                      />
                      {isLong ? (
                        <button
                          className="mt-2 text-xs font-semibold text-[var(--color-primary)] hover:underline"
                          onClick={() => toggleExpanded(note.id)}
                          type="button"
                        >
                          {isExpanded ? 'Ver menos' : 'Ver mas'}
                        </button>
                      ) : null}
                      <p className="mt-4 text-xs font-medium text-[var(--color-muted)]">
                        Creada {formatDateTime(note.createdAt)} - Modificada{' '}
                        {formatDateTime(note.updatedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button type="button" onClick={() => void previewNote(note)}>
                        Vista rapida
                      </Button>
                      <Button type="button" onClick={() => editNote(note)}>
                        Editar
                      </Button>
                      <Button type="button" variant="danger" onClick={() => void deleteNote(note)}>
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
