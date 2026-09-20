// layouts/AppLayout.tsx
import { MonitorCog, Moon, Sun } from 'lucide-react';
import { useEffect, useRef, useState, type ComponentType, type PropsWithChildren } from 'react';
import type { ThemePreference } from '../hooks/useTheme';

interface AppLayoutProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onThemePreferenceChange: (theme: ThemePreference) => void;
  storageError?: string;
  themePreference: ThemePreference;
}

const sections = [
  { id: 'processes', label: 'Procesos' },
  { id: 'notes', label: 'Notas' },
  { id: 'data', label: 'Importar / Exportar' },
];

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}> = [
  { value: 'light', label: 'Modo claro', Icon: Sun },
  { value: 'dark', label: 'Modo oscuro', Icon: Moon },
  { value: 'system', label: 'Usar tema del sistema', Icon: MonitorCog },
];

export function AppLayout({
  activeSection,
  onSectionChange,
  onThemePreferenceChange,
  storageError,
  themePreference,
  children,
}: PropsWithChildren<AppLayoutProps>) {
  const currentYear = new Date().getFullYear();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const activeTheme = themeOptions.find((option) => option.value === themePreference) ?? themeOptions[2];
  const ActiveThemeIcon = activeTheme.Icon;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (!themeMenuRef.current?.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') setIsThemeMenuOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-page)] text-[var(--color-text)]">
      <header className="sticky top-0 z-10 border-b border-[var(--color-card-border)] bg-[var(--color-surface-glass)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--color-primary)] text-lg font-bold text-white shadow-[0_12px_28px_rgba(91,124,250,0.28)]">
              G
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Gestión de procesos</h1>
              <p className="text-xs font-medium text-[var(--color-muted)]">
                Trabajo local, rapido y ordenado
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-success-text)]">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-[var(--color-success-dot)] shadow-[0_0_0_3px_rgba(16,185,129,0.16)]"
              />
              Guardado en este navegador
            </span>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center lg:justify-end">
            <nav
              aria-label="Secciones principales"
              className="flex gap-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-glass)] p-1 shadow-sm"
            >
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

            <div className="relative self-start md:self-auto" ref={themeMenuRef}>
              <button
                aria-expanded={isThemeMenuOpen}
                aria-haspopup="menu"
                aria-label={`Tema actual: ${activeTheme.label}`}
                className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-glass)] text-[var(--color-muted)] shadow-sm transition-colors hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text)]"
                onClick={() => setIsThemeMenuOpen((current) => !current)}
                title={activeTheme.label}
                type="button"
              >
                <ActiveThemeIcon className="h-5 w-5" strokeWidth={2.2} />
              </button>

              {isThemeMenuOpen ? (
                <div
                  aria-label="Modo de apariencia"
                  className="absolute left-0 top-13 z-20 grid gap-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-card)] md:left-auto md:right-0"
                  role="menu"
                >
                  {themeOptions.map(({ value, label, Icon }) => (
                    <button
                      aria-label={label}
                      aria-pressed={themePreference === value}
                      className={`grid h-10 w-10 place-items-center rounded-xl transition-colors ${
                        themePreference === value
                          ? 'bg-[var(--color-primary)] text-white shadow-[0_8px_18px_rgba(91,124,250,0.18)]'
                          : 'text-[var(--color-muted)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-text)]'
                      }`}
                      key={value}
                      onClick={() => {
                        onThemePreferenceChange(value);
                        setIsThemeMenuOpen(false);
                      }}
                      role="menuitemradio"
                      title={label}
                      type="button"
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {storageError ? (
          <div className="mb-5 flex items-start gap-2 rounded-2xl border border-[var(--color-error-border)] bg-[var(--color-error-bg)] px-4 py-3 text-sm text-[var(--color-error-text)] shadow-sm">
            <span aria-hidden="true">!</span>
            <span>{storageError}</span>
          </div>
        ) : null}
        {children}
      </main>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface-glass)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-4 text-sm font-medium text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright {currentYear} Gestión de procesos.</p>
          <p>Autor: Juan Campuzano.</p>
        </div>
      </footer>
    </div>
  );
}
