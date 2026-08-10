export interface Platform {
  id: string;
  name: string;
  abbr: string;
}

interface PlatformPickerProps {
  platforms: Platform[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export function PlatformPicker({ platforms, selected, onSelect }: PlatformPickerProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
      {platforms.map((p) => {
        const active = p.id === selected;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              border: `2px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
              background: active ? 'rgba(232,97,45,0.06)' : 'var(--surface)',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--navy)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {p.abbr}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}
