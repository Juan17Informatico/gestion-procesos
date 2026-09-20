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
    <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text)]">
      <header className="sticky top-0 z-10 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--color-primary)] text-lg font-bold text-white shadow-[0_12px_28px_rgba(91,124,250,0.28)]">
              P
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Procesos claros</h1>
              <p className="text-xs font-medium text-[var(--color-muted)]">Trabajo local, rapido y ordenado</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.16)]" />
              Guardado en este navegador
            </span>
          </div>
          <nav aria-label="Secciones principales" className="flex gap-1 rounded-2xl border border-[var(--color-border)] bg-white/80 p-1 shadow-sm">
            {sections.map((section) => (
              <button
                aria-current={activeSection === section.id ? 'page' : undefined}
                className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                  activeSection === section.id
                    ? 'bg-[var(--color-primary)] text-white shadow-[0_8px_18px_rgba(91,124,250,0.18)]'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-text)]'
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
      <main className="mx-auto max-w-7xl px-4 py-6">
        {storageError ? (
          <div className="mb-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
            <span aria-hidden="true">⚠</span>
            <span>{storageError}</span>
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
