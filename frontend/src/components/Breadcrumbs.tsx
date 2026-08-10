import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items, dark }: { items: BreadcrumbItem[]; dark?: boolean }) {
  const muted = dark ? '#9CA3AF' : 'var(--text-tertiary)';
  const strong = dark ? '#fff' : 'var(--text-primary)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: muted }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && (
            <span className="material-icons-outlined" style={{ fontSize: 14 }}>
              chevron_right
            </span>
          )}
          {item.to ? (
            <Link to={item.to} style={{ color: muted, textDecoration: 'none' }}>
              {item.label}
            </Link>
          ) : (
            <span style={{ color: strong, fontWeight: 600 }}>{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}
