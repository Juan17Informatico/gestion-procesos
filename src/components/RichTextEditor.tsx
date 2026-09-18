import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { normalizeNoteContent, sanitizeRichTextHtml } from '../utils/html';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder = 'Escribe una nota...' }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
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
          'rich-text-content min-h-48 rounded-b-lg bg-white px-3 py-3 text-sm text-slate-900 outline-none',
        'aria-label': 'Contenido de la nota',
      },
    },
    onUpdate({ editor: currentEditor }) {
      onChange(sanitizeRichTextHtml(currentEditor.getHTML()));
    },
  });

  useEffect(() => {
    if (!editor) return;
    const normalizedValue = normalizeNoteContent(value);
    if (editor.getHTML() !== normalizedValue) {
      editor.commands.setContent(normalizedValue, { emitUpdate: false });
    }
  }, [editor, value]);

  function setLink(): void {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL del enlace', previousUrl ?? 'https://');
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }

  const toolButton = (label: string, active: boolean, action: () => void) => (
    <button
      className={`min-h-9 rounded-md border px-3 text-sm font-medium transition ${
        active
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-rose-50'
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
    <div className="relative overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-slate-700 focus-within:ring-2 focus-within:ring-sky-100">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
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
        <button
          className="min-h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-amber-50"
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
