// layouts/AppLayout.tsx
import type { PropsWithChildren } from 'react';

interface AppLayoutProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  storageError?: string;
}

const sections = [
  { id: 'processes', label: 'Procesos' },
  { id: 'notes', label: 'Notas' },
  { id: 'data', label: 'Importar / Exportar' },
];

export function AppLayout({
  activeSection,
  onSectionChange,
  storageError,
  children,
}: PropsWithChildren<AppLayoutProps>) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">Procesos claros</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Guardado en este navegador
            </span>
          </div>
          <nav aria-label="Secciones principales" className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {sections.map((section) => (
              <button
                aria-current={activeSection === section.id ? 'page' : undefined}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                type="button"
              >
                {section.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {storageError ? (
          <div className="mb-5 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span aria-hidden="true">⚠</span>
            <span>{storageError}</span>
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}