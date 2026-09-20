import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'border border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[0_10px_24px_rgba(91,124,250,0.22)] hover:bg-[var(--color-primary-strong)] hover:border-[var(--color-primary-strong)]',
  secondary:
    'border border-[var(--color-border)] bg-white/90 text-[var(--color-text)] shadow-sm hover:border-[var(--color-primary-soft-border)] hover:bg-[var(--color-primary-soft)]',
  danger:
    'border border-red-200 bg-red-50 text-red-700 shadow-sm hover:border-red-300 hover:bg-red-100',
};

export function Button({
  variant = 'secondary',
  className = '',
  children,
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
