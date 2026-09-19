import type { InputHTMLAttributes, PropsWithChildren, TextareaHTMLAttributes } from 'react';

interface FieldProps {
  label: string;
}

export function Field({ label, children }: PropsWithChildren<FieldProps>) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-[var(--color-muted)]">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="min-h-11 w-full min-w-0 rounded-xl border border-[var(--color-border)] bg-white/95 px-3.5 py-2 text-sm text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary-soft-border)] focus:ring-0"
      {...props}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="min-h-28 w-full min-w-0 rounded-xl border border-[var(--color-border)] bg-white/95 px-3.5 py-2 text-sm text-[var(--color-text)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary-soft-border)] focus:ring-0"
      {...props}
    />
  );
}
