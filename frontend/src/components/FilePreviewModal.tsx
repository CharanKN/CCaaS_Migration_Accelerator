import { useEffect, useRef, useState } from 'react';
import { CodeViewer, type CodeLanguage } from './CodeViewer';
import { Button } from './Button';
import { useToast } from './ToastContext';
import { formatBytes } from '../utils/format';

export type PreviewKind = 'code' | 'image' | 'audio' | 'unsupported';

export interface PreviewEntry {
  name: string;
  size?: number;
  icon?: string;
}

export interface ResolvedPreview {
  kind: PreviewKind;
  content?: string;
  language?: CodeLanguage;
  url?: string;
  note?: string;
}

interface FilePreviewModalProps {
  open: boolean;
  onClose: () => void;
  entries: PreviewEntry[];
  initialIndex?: number;
  resolve: (index: number) => Promise<ResolvedPreview>;
}

export function FilePreviewModal({ open, onClose, entries, initialIndex = 0, resolve }: FilePreviewModalProps) {
  const { showToast } = useToast();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [cache, setCache] = useState<Record<number, ResolvedPreview | undefined>>({});
  const createdUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (open) setActiveIndex(initialIndex);
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open) return;
    if (cache[activeIndex]) return;
    let cancelled = false;
    resolve(activeIndex).then((result) => {
      if (cancelled) return;
      if (result.url) createdUrls.current.add(result.url);
      setCache((prev) => ({ ...prev, [activeIndex]: result }));
    });
    return () => {
      cancelled = true;
    };
  }, [open, activeIndex, cache, resolve]);

  useEffect(() => {
    if (open) return;
    // Revoke every object URL created while the modal was open, and clear
    // the cache so the next open re-resolves fresh entries.
    createdUrls.current.forEach((url) => URL.revokeObjectURL(url));
    createdUrls.current.clear();
    setCache({});
  }, [open]);

  if (!open) return null;

  const entry = entries[activeIndex];
  const resolved = cache[activeIndex];

  function downloadCurrent() {
    if (!entry) return;
    if (resolved?.url) {
      const a = document.createElement('a');
      a.href = resolved.url;
      a.download = entry.name;
      a.click();
      return;
    }
    if (resolved?.content !== undefined) {
      const blob = new Blob([resolved.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = entry.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  async function copyCurrent() {
    if (resolved?.content === undefined) return;
    try {
      await navigator.clipboard.writeText(resolved.content);
      showToast('Copied to clipboard.');
    } catch {
      showToast('Could not copy — clipboard access denied.');
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,26,46,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          width: 'min(920px, 94vw)',
          height: 'min(640px, 86vh)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-modal)',
          animation: 'scaleIn 0.18s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {entry?.name ?? 'Preview'}
            </h3>
            {entry?.size != null && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatBytes(entry.size)}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {resolved?.kind === 'code' && (
              <Button variant="ghost" onClick={copyCurrent} style={{ padding: '6px 10px', fontSize: 12, border: '1px solid var(--border)' }}>
                <span className="material-icons-outlined" style={{ fontSize: 15 }}>content_copy</span>
                Copy
              </Button>
            )}
            {(resolved?.url || resolved?.content !== undefined) && (
              <Button variant="ghost" onClick={downloadCurrent} style={{ padding: '6px 10px', fontSize: 12, border: '1px solid var(--border)' }}>
                <span className="material-icons-outlined" style={{ fontSize: 15 }}>download</span>
                Download
              </Button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)' }}
              aria-label="Close"
            >
              <span className="material-icons-outlined">close</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {entries.length > 1 && (
            <div
              style={{
                width: 220,
                flexShrink: 0,
                borderRight: '1px solid var(--border)',
                overflowY: 'auto',
                padding: 'var(--space-2)',
              }}
            >
              {entries.map((e, i) => (
                <button
                  key={e.name}
                  onClick={() => setActiveIndex(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: i === activeIndex ? 'var(--brand-tint-bg)' : 'transparent',
                    color: i === activeIndex ? 'var(--brand)' : 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: i === activeIndex ? 700 : 500,
                    marginBottom: 2,
                  }}
                >
                  <span className="material-icons-outlined" style={{ fontSize: 15, flexShrink: 0 }}>
                    {e.icon ?? 'description'}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                </button>
              ))}
            </div>
          )}

          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {!resolved && (
              <div style={{ padding: 'var(--space-5)', color: 'var(--text-muted)', fontSize: 13 }}>Loading preview…</div>
            )}
            {resolved?.kind === 'code' && (
              <CodeViewer code={resolved.content ?? ''} language={resolved.language ?? 'text'} maxHeight="none" />
            )}
            {resolved?.kind === 'image' && resolved.url && (
              <div style={{ padding: 'var(--space-5)', display: 'flex', justifyContent: 'center' }}>
                <img src={resolved.url} alt={entry?.name} style={{ maxWidth: '100%', maxHeight: 460, borderRadius: 'var(--radius-md)' }} />
              </div>
            )}
            {resolved?.kind === 'audio' && resolved.url && (
              <div style={{ padding: 'var(--space-5)' }}>
                <audio controls src={resolved.url} style={{ width: '100%' }} />
              </div>
            )}
            {resolved?.kind === 'unsupported' && (
              <div style={{ padding: 'var(--space-5)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <span className="material-icons-outlined" style={{ fontSize: 32, color: 'var(--text-muted)' }}>
                  visibility_off
                </span>
                <p style={{ marginTop: 8, fontSize: 13 }}>{resolved.note ?? 'Preview not available for this file.'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
