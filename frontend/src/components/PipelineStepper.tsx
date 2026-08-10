interface PipelineStepperProps {
  steps: string[];
  doneSteps: string[];
  activeStep: string | null;
  onStepClick?: (step: string) => void;
}

export function PipelineStepper({ steps, doneSteps, activeStep, onStepClick }: PipelineStepperProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', padding: '4px 0' }}>
      {steps.map((step, i) => {
        const done = doneSteps.includes(step);
        const active = step === activeStep;
        const color = done ? 'var(--status-good)' : active ? 'var(--brand)' : 'var(--border)';
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i === steps.length - 1 ? 'none' : 1 }}>
            <button
              onClick={() => onStepClick?.(step)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                minWidth: 84,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: done || active ? color : 'var(--surface)',
                  border: `2px solid ${color}`,
                  color: done || active ? '#fff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {done ? <span className="material-icons-outlined" style={{ fontSize: 16 }}>check</span> : i + 1}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {step}
              </span>
            </button>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: color, minWidth: 20 }} />}
          </div>
        );
      })}
    </div>
  );
}
