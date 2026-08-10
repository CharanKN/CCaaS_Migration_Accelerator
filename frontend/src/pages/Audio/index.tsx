import { useState } from 'react';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/Button';
import { useToast } from '../../components/ToastContext';
import { QUALITY_COLORS, AUDIO_DECISION_ON, AUDIO_DECISION_OFF } from '../../theme/legacyMaps';

type Decision = 'reuse' | 'tts' | 'rerecord';
type Quality = 'Good' | 'Degraded' | 'Poor';

interface PromptRow {
  id: string;
  name: string;
  transcript: string;
  duration: string;
  format: string;
  quality: Quality;
  decision: Decision;
}

const INITIAL_PROMPTS: PromptRow[] = [
  {
    id: 'ann_welcome_44801.wav',
    name: 'ann_welcome_44801.wav',
    transcript: 'Thank you for calling Acme Financial. Your call may be recorded...',
    duration: '0:08',
    format: 'WAV 8kHz μ-law',
    quality: 'Good',
    decision: 'reuse',
  },
  {
    id: 'ann_menu_main.wav',
    name: 'ann_menu_main.wav',
    transcript: 'For sales press 1, for support press 2, for billing press 3...',
    duration: '0:12',
    format: 'WAV 8kHz μ-law',
    quality: 'Good',
    decision: 'reuse',
  },
  {
    id: 'ann_hold_music_intro.wav',
    name: 'ann_hold_music_intro.wav',
    transcript: 'All agents are busy. Please stay on the line...',
    duration: '0:06',
    format: 'WAV 8kHz μ-law',
    quality: 'Degraded',
    decision: 'tts',
  },
  {
    id: 'ann_payment_secure.wav',
    name: 'ann_payment_secure.wav',
    transcript: 'You are being transferred to our secure payment line...',
    duration: '0:05',
    format: 'WAV 8kHz μ-law',
    quality: 'Good',
    decision: 'reuse',
  },
  {
    id: 'ann_holiday_closed.wav',
    name: 'ann_holiday_closed.wav',
    transcript: 'Our offices are closed for the holiday. Regular hours resume...',
    duration: '0:09',
    format: 'WAV 8kHz μ-law',
    quality: 'Poor',
    decision: 'rerecord',
  },
  {
    id: 'ann_afterhours.wav',
    name: 'ann_afterhours.wav',
    transcript: 'You have reached us outside business hours...',
    duration: '0:07',
    format: 'WAV 8kHz μ-law',
    quality: 'Degraded',
    decision: 'tts',
  },
];

const DECISION_LABEL: Record<Decision, string> = {
  reuse: 'Reuse',
  tts: 'TTS',
  rerecord: 'Re-record',
};

export default function Audio() {
  const [prompts, setPrompts] = useState<PromptRow[]>(INITIAL_PROMPTS);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const total = prompts.length;
  const ttsCount = prompts.filter((p) => p.decision === 'tts').length;

  function setDecision(id: string, decision: Decision) {
    setPrompts((rows) => rows.map((r) => (r.id === id ? { ...r, decision } : r)));
  }

  function togglePlay(id: string) {
    setPlayingId((current) => (current === id ? null : id));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Audio Prompt Management</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 2 }}>
            Decide per prompt: reuse original audio, generate TTS, or flag for re-record
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button onClick={() => showToast(`Queuing bulk TTS for ${ttsCount} prompt(s)…`)}>
            <span className="material-icons-outlined" style={{ fontSize: 16 }}>
              record_voice_over
            </span>
            Bulk TTS
          </Button>
          <Button variant="primary" onClick={() => showToast(`Applying decisions to ${total} prompts…`)}>
            Apply Decisions
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
        <StatCard icon="graphic_eq" label="Total Prompts" value={147} tone="neutral" />
        <StatCard icon="replay" label="Reuse As-Is" value={98} tone="good" />
        <StatCard icon="record_voice_over" label="Generate TTS" value={37} tone="info" />
        <StatCard icon="mic" label="Re-record" value={12} tone="warn" />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
        <h3 style={{ marginTop: 0, marginBottom: 14, fontSize: 14, fontWeight: 700 }}>Prompt Inventory</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {prompts.map((p) => {
            const isPlaying = playingId === p.id;
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: 'var(--space-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg)',
                }}
              >
                <button
                  onClick={() => togglePlay(p.id)}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  style={{
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    borderRadius: '50%',
                    border: 'none',
                    background: isPlaying ? 'var(--brand)' : 'var(--surface)',
                    color: isPlaying ? '#fff' : 'var(--text-secondary)',
                    boxShadow: 'var(--shadow-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <span className="material-icons-outlined" style={{ fontSize: 18 }}>
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-tertiary)',
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    "{p.transcript}"
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 130, textAlign: 'right' }}>
                  {p.duration} · {p.format}
                </div>

                <StatusBadge label={p.quality} colors={QUALITY_COLORS[p.quality]} />

                <div style={{ display: 'flex', gap: 6 }}>
                  {(Object.keys(DECISION_LABEL) as Decision[]).map((d) => {
                    const active = p.decision === d;
                    const [bg, border, text] = active ? AUDIO_DECISION_ON : AUDIO_DECISION_OFF;
                    return (
                      <button
                        key={d}
                        onClick={() => setDecision(p.id, d)}
                        style={{
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${border}`,
                          background: bg,
                          color: text,
                          cursor: 'pointer',
                        }}
                      >
                        {DECISION_LABEL[d]}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
