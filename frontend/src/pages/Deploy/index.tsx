import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ToastContext';
import { Button } from '../../components/Button';
import { LiveLogConsole } from '../../components/LiveLogConsole';
import { languageForFilename } from '../../components/CodeViewer';
import { FilePreviewModal, type ResolvedPreview } from '../../components/FilePreviewModal';
import { api, ApiError } from '../../api/client';
import { formatBytes } from '../../utils/format';
import { fileIcon } from '../../utils/fileIcon';
import type { DeployRequest, DeployResponse } from '../../types/scenario';

interface EnvOption {
  id: string;
  badge: string;
  label: string;
  domain: string;
}

// Verbatim target-environment cards from the original .dc.html deploy screen.
const ENVIRONMENTS: EnvOption[] = [
  { id: 'DEV', badge: 'DEV', label: 'Development', domain: 'genesys-dev.acme.com' },
  { id: 'UAT', badge: 'UAT', label: 'User Acceptance', domain: 'genesys-uat.acme.com' },
  { id: 'PROD', badge: 'PROD', label: 'Production', domain: 'genesys.acme.com' },
];

export default function Deploy() {
  const { scenario } = useData();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [environment, setEnvironment] = useState<string>('UAT');

  const stateFiles = (location.state as { files?: Record<string, string> } | null)?.files;
  const files = useMemo(
    () =>
      stateFiles ?? {
        'main.tf': `# Placeholder Terraform generated for ${scenario?.name ?? 'this migration'}\n# Visit Mapping and click "Convert & Deploy" to generate a real artifact.\n`,
      },
    [stateFiles, scenario?.name],
  );
  const fileNames = Object.keys(files);

  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<DeployResponse | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const resolvePreview = useCallback(
    async (index: number): Promise<ResolvedPreview> => {
      const name = fileNames[index];
      return { kind: 'code', content: files[name], language: languageForFilename(name) };
    },
    [fileNames, files],
  );

  function openPreview(index: number) {
    setPreviewIndex(index);
    setPreviewOpen(true);
  }

  async function deployToGithub() {
    setDeploying(true);
    setDeployError(null);
    try {
      const req: DeployRequest = {
        files,
        commit_message: `Deploy migration artifact for ${scenario?.name ?? 'scenario'}`,
      };
      const res = await api.post<DeployResponse>('/api/deploy/github', req);
      setDeployResult(res);
      showToast('Deployed to GitHub.');
    } catch (err) {
      setDeployError(err instanceof ApiError ? err.message : 'Deploy failed.');
    } finally {
      setDeploying(false);
    }
  }

  if (!scenario) {
    return <p style={{ color: 'var(--text-muted)' }}>Select a project from the Projects page first.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Deployment</h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 2 }}>
            Convert and deploy to target platform environment
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            onClick={() => showToast('Rollback initiated')}
            style={{ border: '1.5px solid var(--status-bad)', color: 'var(--status-bad)', background: 'var(--surface)' }}
          >
            <span className="material-icons-outlined" style={{ fontSize: 16 }}>undo</span>
            Rollback
          </Button>
          <Button variant="primary" onClick={() => navigate('/testing')}>
            Run Tests
            <span className="material-icons-outlined" style={{ fontSize: 16 }}>east</span>
          </Button>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 14 }}>Generated Files</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
              Review the LLM-generated artifact before it's committed to GitHub
            </p>
          </div>
          <Button onClick={() => openPreview(0)} style={{ padding: '6px 12px', fontSize: 12 }}>
            <span className="material-icons-outlined" style={{ fontSize: 15 }}>visibility</span>
            Preview All
          </Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fileNames.map((name, i) => {
            const { icon, color } = fileIcon(name);
            return (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <span className="material-icons-outlined" style={{ fontSize: 18, color }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatBytes(new Blob([files[name]]).size)}</div>
                </div>
                <Button variant="ghost" onClick={() => openPreview(i)} style={{ padding: '4px 10px', fontSize: 11, border: '1px solid var(--border)' }}>
                  Preview
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
        <h3 style={{ marginTop: 0, fontSize: 14 }}>Target Environment</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {ENVIRONMENTS.map((env) => {
            const active = env.id === environment;
            return (
              <button
                key={env.id}
                onClick={() => setEnvironment(env.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 6,
                  padding: 16,
                  borderRadius: 'var(--radius-lg)',
                  border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                  background: active ? 'var(--brand-tint-bg)' : 'var(--surface)',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    background: active ? 'var(--brand)' : 'var(--border)',
                    color: active ? '#fff' : 'var(--text-tertiary)',
                  }}
                >
                  {env.badge}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{env.label}</span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{env.domain}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
          <Button variant="primary" onClick={deployToGithub} disabled={deploying}>
            {deploying ? 'Deploying…' : 'Deploy to GitHub'}
          </Button>
          {deployError && <span style={{ color: 'var(--status-bad-fg)', fontSize: 13 }}>{deployError}</span>}
          {deployResult && !deployError && (
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {deployResult.commit_url ? (
                <a href={deployResult.commit_url} target="_blank" rel="noreferrer" style={{ color: 'var(--brand)' }}>
                  {deployResult.commit_url}
                </a>
              ) : (
                'Committed'
              )}
              {deployResult.committed_paths.length > 0 && <> — {deployResult.committed_paths.join(', ')}</>}
            </span>
          )}
        </div>
      </div>

      <div style={{ background: 'var(--navy-deep)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10B981',
                display: 'inline-block',
                animation: 'pulse 2s infinite',
              }}
            />
            Deployment Logs — Live
          </h3>
          <span style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'ui-monospace, Consolas, monospace' }}>
            {scenario.target ?? 'Target'} — {environment}
          </span>
        </div>
        <LiveLogConsole lines={scenario.deployLogs ?? []} />
      </div>

      <FilePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        entries={fileNames.map((name) => ({ name, size: new Blob([files[name]]).size, icon: fileIcon(name).icon }))}
        initialIndex={previewIndex}
        resolve={resolvePreview}
      />
    </div>
  );
}
