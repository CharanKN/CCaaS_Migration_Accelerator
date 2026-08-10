import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({ variant = 'secondary', style, ...rest }: ButtonProps) {
  const base = {
    padding: '9px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: 13,
    fontWeight: 600,
    border: '1px solid transparent',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'opacity 0.15s ease',
  } as const;

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: `linear-gradient(135deg, var(--brand), var(--brand-gradient-end))`,
      color: '#fff',
      boxShadow: 'var(--shadow-cta)',
    },
    secondary: {
      background: 'var(--surface)',
      color: 'var(--text-secondary)',
      borderColor: 'var(--border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
    },
  };

  return <button {...rest} style={{ ...base, ...variants[variant], ...style }} />;
}
