import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef, useState } from 'react';
import { inputDialog } from '../utils/dialogs';
import { normalizeNoteContent } from '../utils/html';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const highlightColors = [
  { label: 'Amarillo suave', value: '#fef3c7' },
  { label: 'Durazno', value: '#fed7aa' },
  { label: 'Rosa', value: '#fecdd3' },
  { label: 'Fucsia suave', value: '#fbcfe8' },
  { label: 'Lila', value: '#ddd6fe' },
  { label: 'Azul', value: '#bfdbfe' },
  { label: 'Celeste', value: '#bae6fd' },
  { label: 'Cian', value: '#a5f3fc' },
  { label: 'Menta', value: '#bbf7d0' },
  { label: 'Verde suave', value: '#d9f99d' },
  { label: 'Lima', value: '#ecfccb' },
  { label: 'Gris calido', value: '#e7e5e4' },
];

export function RichTextEditor({ value, onChange, placeholder = 'Escribe una nota...' }: RichTextEditorProps) {
  const [isHighlightOpen, setIsHighlightOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Highlight.configure({ multicolor: true }),
      Underline,
      Link.configure({
        autolink: true,
        defaultProtocol: 'https',
        openOnClick: false,
      }),
    ],
    content: normalizeNoteContent(value),
    editorProps: {
      attributes: {
        class:
          'rich-text-content min-h-48 rounded-b-2xl bg-white px-4 py-3 text-sm text-[var(--color-text)] outline-none',
        'aria-label': 'Contenido de la nota',
      },
    },
    onUpdate({ editor: currentEditor }) {
      onChange(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!toolbarRef.current?.contains(event.target as Node)) {
        setIsHighlightOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!editor) return;
    const normalizedValue = normalizeNoteContent(value);
    if (editor.getHTML() !== normalizedValue) {
      editor.commands.setContent(normalizedValue, { emitUpdate: false });
    }
  }, [editor, value]);

  async function setLink(): Promise<void> {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = await inputDialog({
      title: 'Editar enlace',
      label: 'URL',
      value: previousUrl ?? 'https://',
      placeholder: 'https://ejemplo.com',
      confirmText: 'Aplicar enlace',
    });
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }

  function applyHighlight(color: string): void {
    editor?.chain().focus().setHighlight({ color }).run();
    setIsHighlightOpen(false);
  }

  const toolButton = (label: string, active: boolean, action: () => void) => (
    <button
      className={`min-h-9 rounded-md border px-3 text-sm font-medium transition ${
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[0_8px_18px_rgba(91,124,250,0.16)]'
          : 'border-[var(--color-border)] bg-white text-[var(--color-muted)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-text)]'
      }`}
      disabled={!editor}
      onClick={action}
      onMouseDown={(event) => event.preventDefault()}
      type="button"
    >
      {label}
    </button>
  );

  return (
    <div className="relative rounded-2xl border border-[var(--color-border)] bg-white shadow-sm">
      <div className="relative flex flex-wrap gap-1.5 border-b border-[var(--color-border)] bg-[var(--color-surface-soft)] p-2.5" ref={toolbarRef}>
        {toolButton('B', Boolean(editor?.isActive('bold')), () => editor?.chain().focus().toggleBold().run())}
        {toolButton('I', Boolean(editor?.isActive('italic')), () => editor?.chain().focus().toggleItalic().run())}
        {toolButton('U', Boolean(editor?.isActive('underline')), () =>
          editor?.chain().focus().toggleUnderline().run(),
        )}
        {toolButton('H1', Boolean(editor?.isActive('heading', { level: 1 })), () =>
          editor?.chain().focus().toggleHeading({ level: 1 }).run(),
        )}
        {toolButton('H2', Boolean(editor?.isActive('heading', { level: 2 })), () =>
          editor?.chain().focus().toggleHeading({ level: 2 }).run(),
        )}
        {toolButton('Texto', Boolean(editor?.isActive('paragraph')), () =>
          editor?.chain().focus().setParagraph().run(),
        )}
        {toolButton('Lista', Boolean(editor?.isActive('bulletList')), () =>
          editor?.chain().focus().toggleBulletList().run(),
        )}
        {toolButton('1. Lista', Boolean(editor?.isActive('orderedList')), () =>
          editor?.chain().focus().toggleOrderedList().run(),
        )}
        {toolButton('Enlace', Boolean(editor?.isActive('link')), setLink)}
        <div className="relative">
          <button
            className={`min-h-9 rounded-md border px-3 text-sm font-medium transition ${
              editor?.isActive('highlight')
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--color-border)] bg-white text-[var(--color-muted)] hover:bg-[var(--color-primary-soft)]'
            }`}
            disabled={!editor}
            onClick={() => setIsHighlightOpen((current) => !current)}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            Resaltar
          </button>
          {isHighlightOpen ? (
            <div className="absolute left-0 top-11 z-30 w-64 rounded-2xl border border-[var(--color-border)] bg-white p-3 shadow-xl">
              <p className="mb-2 text-xs font-semibold text-slate-500">Color de resaltado</p>
              <div className="grid grid-cols-6 gap-2">
                {highlightColors.map((color) => (
                  <button
                    aria-label={`Resaltar en ${color.label}`}
                    className="h-8 w-8 rounded-full border border-slate-300 shadow-sm transition hover:scale-105 focus-visible:outline-sky-300"
                    disabled={!editor}
                    key={color.value}
                    onClick={() => applyHighlight(color.value)}
                    onMouseDown={(event) => event.preventDefault()}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                    type="button"
                  />
                ))}
              </div>
              <button
                className="mt-3 w-full rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                disabled={!editor}
                onClick={() => {
                  editor?.chain().focus().unsetHighlight().run();
                  setIsHighlightOpen(false);
                }}
                onMouseDown={(event) => event.preventDefault()}
                type="button"
              >
                Quitar resaltado
              </button>
            </div>
          ) : null}
        </div>
        <button
          className="min-h-9 rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-medium text-[var(--color-muted)] transition hover:bg-amber-50 hover:text-[var(--color-text)]"
          disabled={!editor}
          onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
          onMouseDown={(event) => event.preventDefault()}
          type="button"
        >
          Limpiar
        </button>
      </div>
      {editor?.isEmpty ? (
        <p className="pointer-events-none absolute ml-3 mt-3 text-sm text-slate-400">{placeholder}</p>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
