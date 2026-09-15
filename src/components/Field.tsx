import type { InputHTMLAttributes, PropsWithChildren, TextareaHTMLAttributes } from 'react';

interface FieldProps {
  label: string;
}

export function Field({ label, children }: PropsWithChildren<FieldProps>) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="min-h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-700"
      {...props}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="min-h-28 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-700"
      {...props}
    />
  );
}
