import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Button } from '../../components/Button';

type FlowView = 'source' | 'target' | 'diff';

interface FlowNode {
  x: number;
  y: number;
  label: string;
  color: string;
  type: string;
  src: string;
  map: string;
  props: string;
}

// Verbatim `srcNodes` — do not invent alternate content.
const SRC_NODES: FlowNode[] = [
  { x: 450, y: 30, label: 'Start (VDN 44801)', color: '#10B981', type: 'Entry Point', src: 'VDN-44801', map: 'Initial Greeting', props: 'dnis: 8005551234\nroute: vector 12' },
  { x: 450, y: 110, label: 'Play Welcome', color: '#8B5CF6', type: 'Announcement', src: 'ann_welcome_44801', map: 'Play Audio', props: 'file: welcome.wav\nbarge-in: yes' },
  { x: 450, y: 200, label: 'Main Menu (DTMF)', color: '#E8612D', type: 'Menu (DTMF Input)', src: 'Main_Menu_v3', map: 'Architect Menu', props: 'timeout: 5s\nretries: 3\noptions: [1,2,3,0]' },
  { x: 300, y: 310, label: 'Press 1: Sales', color: '#3B82F6', type: 'Route Branch', src: 'route-to 1', map: 'Menu Choice 1', props: 'goto: step 8' },
  { x: 450, y: 310, label: 'Press 2: Support', color: '#3B82F6', type: 'Route Branch', src: 'route-to 2', map: 'Menu Choice 2', props: 'goto: step 12' },
  { x: 600, y: 310, label: 'Press 3: Billing', color: '#3B82F6', type: 'Route Branch', src: 'route-to 3', map: 'Menu Choice 3', props: 'goto: step 16' },
  { x: 300, y: 410, label: 'Queue: Sales Split', color: '#F59E0B', type: 'Queue-to Skill', src: 'queue-to skill 21', map: 'Transfer to Queue', props: 'skill: 21 pri: m' },
  { x: 450, y: 410, label: 'Queue: Support Split', color: '#F59E0B', type: 'Queue-to Skill', src: 'queue-to skill 22', map: 'Transfer to Queue', props: 'skill: 22 pri: m' },
  { x: 600, y: 410, label: 'Queue: Billing Split', color: '#F59E0B', type: 'Queue-to Skill', src: 'queue-to skill 23', map: 'Transfer to Queue', props: 'skill: 23 pri: h' },
];

// Verbatim `tgtNodes` — same 9 slots / colors as SRC_NODES.
const TGT_NODES: FlowNode[] = [
  { x: 450, y: 30, label: 'Incoming Call (DID)', color: '#10B981', type: 'Entry — Architect', src: 'Inbound Call Flow', map: 'from VDN-44801', props: 'did: +18005551234' },
  { x: 450, y: 110, label: 'Play Audio: welcome', color: '#8B5CF6', type: 'Play Audio Action', src: 'welcome_prompt', map: 'from ann_welcome', props: 'tts fallback: yes' },
  { x: 450, y: 200, label: 'Menu: Main Menu', color: '#E8612D', type: 'Menu Action', src: 'Main Menu', map: 'from Main_Menu_v3', props: 'listen: dtmf+speech\ntimeout: 5s' },
  { x: 300, y: 310, label: 'Choice 1: Sales', color: '#3B82F6', type: 'Menu Choice', src: 'dtmf: 1', map: 'from route-to 1', props: 'action: transfer' },
  { x: 450, y: 310, label: 'Choice 2: Support', color: '#3B82F6', type: 'Menu Choice', src: 'dtmf: 2', map: 'from route-to 2', props: 'action: transfer' },
  { x: 600, y: 310, label: 'Choice 3: Billing', color: '#3B82F6', type: 'Menu Choice', src: 'dtmf: 3', map: 'from route-to 3', props: 'action: transfer' },
  { x: 300, y: 410, label: 'Queue: Sales', color: '#F59E0B', type: 'Transfer to ACD', src: 'Sales Queue', map: 'from skill 21', props: 'pri: 5, in-queue flow' },
  { x: 450, y: 410, label: 'Queue: Support', color: '#F59E0B', type: 'Transfer to ACD', src: 'Support Queue', map: 'from skill 22', props: 'pri: 5, in-queue flow' },
  { x: 600, y: 410, label: 'Queue: Billing', color: '#F59E0B', type: 'Transfer to ACD', src: 'Billing Queue', map: 'from skill 23', props: 'pri: 8, in-queue flow' },
];

// Verbatim static connector lines (x1,y1,x2,y2) between the 9 node slots.
const LINES: [number, number, number, number][] = [
  [450, 60, 450, 110],
  [450, 160, 450, 200],
  [450, 260, 300, 310],
  [450, 260, 450, 310],
  [450, 260, 600, 310],
  [300, 370, 300, 410],
  [450, 370, 450, 410],
  [600, 370, 600, 410],
];

// The original's "Diff" toggle had no onClick at all. Per the fidelity plan
// we make it functional: it highlights the one node slot (index 7 — the
// Support queue step) that differs in meaning between source and target.
const DIFF_NODE_INDEX = 7;

const FLOW_OPTIONS = ['Main IVR — Customer Service', 'Sales Inquiry', 'After Hours', 'Payment IVR'];

function toggleStyle(active: boolean, extraBorder?: boolean): React.CSSProperties {
  return {
    padding: '5px 12px',
    background: active ? '#FFF7ED' : 'white',
    border: 'none',
    borderLeft: extraBorder ? '1px solid var(--border)' : undefined,
    fontSize: 11,
    fontWeight: active ? 700 : 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: active ? '#E8612D' : '#6B7280',
  };
}

export default function CallFlow() {
  const { scenario } = useData();
  const [selectedFlowOption, setSelectedFlowOption] = useState(FLOW_OPTIONS[0]);
  const [flowView, setFlowView] = useState<FlowView>('source');
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState(2);

  if (!scenario) {
    return <p style={{ color: 'var(--text-muted)' }}>Select a project from the Projects page first.</p>;
  }

  const nodes = flowView === 'target' ? TGT_NODES : SRC_NODES;
  const selNode = nodes[selectedNode] ?? nodes[2];
  const isDiff = flowView === 'diff';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '14px 20px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>IVR Call Flow Viewer</h2>
          <select
            value={selectedFlowOption}
            onChange={(e) => setSelectedFlowOption(e.target.value)}
            style={{ padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: 12, background: 'var(--surface)', cursor: 'pointer', fontWeight: 500 }}
          >
            {FLOW_OPTIONS.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <button onClick={() => setFlowView('source')} style={toggleStyle(flowView === 'source')}>Source</button>
            <button onClick={() => setFlowView('target')} style={toggleStyle(flowView === 'target', true)}>Target</button>
            <button onClick={() => setFlowView('diff')} style={toggleStyle(flowView === 'diff', true)}>Diff</button>
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <Button variant="secondary" onClick={() => setZoom((z) => Math.min(2, +(z + 0.2).toFixed(1)))} aria-label="Zoom in" style={{ padding: 5 }}>
            <span className="material-icons-outlined" style={{ fontSize: 16, color: 'var(--text-tertiary)' }}>zoom_in</span>
          </Button>
          <Button variant="secondary" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(1)))} aria-label="Zoom out" style={{ padding: 5 }}>
            <span className="material-icons-outlined" style={{ fontSize: 16, color: 'var(--text-tertiary)' }}>zoom_out</span>
          </Button>
          <Button variant="secondary" onClick={() => setZoom(1)} aria-label="Fit to screen" style={{ padding: 5 }}>
            <span className="material-icons-outlined" style={{ fontSize: 16, color: 'var(--text-tertiary)' }}>fit_screen</span>
          </Button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--bg)' }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 900 500"
          style={{ position: 'absolute', top: 0, left: 0, transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.2s' }}
        >
          {LINES.map((l, i) => (
            <line key={`l${i}`} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke="#D1D5DB" strokeWidth={2} />
          ))}
          {nodes.map((n, i) => {
            const selected = i === selectedNode;
            const changed = isDiff && i === DIFF_NODE_INDEX;
            const w = 148;
            const h = 50;
            return (
              <g key={`n${i}`}>
                <rect
                  x={n.x - w / 2}
                  y={n.y}
                  width={w}
                  height={h}
                  rx={8}
                  fill={selected ? '#FFF7ED' : '#FFFFFF'}
                  stroke={changed ? '#F59E0B' : n.color}
                  strokeWidth={selected ? 3 : 2}
                  strokeDasharray={changed ? '5,3' : undefined}
                  style={{ cursor: 'pointer', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.08))' }}
                  onClick={() => setSelectedNode(i)}
                />
                <text
                  x={n.x}
                  y={n.y + 30}
                  textAnchor="middle"
                  fill="#1A1A2E"
                  fontSize={11}
                  fontWeight={600}
                  fontFamily="Inter, sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {n.label}
                </text>
                {changed && (
                  <text x={n.x + w / 2 - 4} y={n.y - 6} textAnchor="end" fontSize={9} fontWeight={700} fill="#F59E0B" style={{ pointerEvents: 'none' }}>
                    CHANGED
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div
          style={{
            position: 'absolute',
            bottom: 14,
            right: 14,
            width: 160,
            height: 100,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: 'var(--shadow-card)',
            padding: 6,
          }}
        >
          <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5 }}>MINIMAP</div>
          <div style={{ width: '100%', height: 'calc(100% - 14px)', background: 'var(--divider)', borderRadius: 3, position: 'relative', marginTop: 3 }}>
            <div
              style={{
                position: 'absolute',
                top: '10%',
                left: '15%',
                width: '40%',
                height: '45%',
                border: '1.5px solid var(--brand)',
                background: 'rgba(232,97,45,0.06)',
                borderRadius: 2,
              }}
            />
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 280,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--divider)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg)',
            }}
          >
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Node Inspector</h4>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5 }}>NODE TYPE</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{selNode.type}</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5 }}>SOURCE LABEL</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{selNode.src}</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5 }}>TARGET MAPPING</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <span style={{ padding: '2px 6px', background: '#D1FAE5', borderRadius: 3, fontSize: 10, fontWeight: 700, color: '#065F46' }}>Mapped</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selNode.map}</span>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5 }}>PROPERTIES</div>
              <div
                style={{
                  background: 'var(--divider)',
                  borderRadius: 6,
                  padding: '8px 10px',
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  fontFamily: 'monospace',
                  lineHeight: 1.7,
                  marginTop: 3,
                  whiteSpace: 'pre-line',
                }}
              >
                {selNode.props}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5 }}>DEPENDENCIES</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                {['welcome.wav', 'queue_sales', 'queue_support'].map((d) => (
                  <span key={d} style={{ padding: '2px 7px', background: 'var(--divider)', borderRadius: 4, fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
