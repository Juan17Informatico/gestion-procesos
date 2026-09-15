import type { PropsWithChildren } from 'react';

interface AppLayoutProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  storageError?: string;
}

const sections = [
  { id: 'notes', label: 'Notas' },
  { id: 'processes', label: 'Procesos' },
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
          <div>
            <h1 className="text-xl font-semibold">Procesos claros</h1>
            <p className="text-sm text-slate-600">Guardado localmente en este navegador.</p>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Secciones principales">
            {sections.map((section) => (
              <button
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  activeSection === section.id
                    ? 'bg-slate-950 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-rose-50'
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
        <div className="mb-5 flex flex-col gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 sm:flex-row sm:items-center sm:justify-between">
          <span>✓ Guardado localmente</span>
          <span className="text-emerald-800">Exporta una copia de seguridad con frecuencia.</span>
        </div>
        {storageError ? (
          <div className="mb-5 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {storageError}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
