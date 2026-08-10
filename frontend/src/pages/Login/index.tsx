import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ToastContext';
import { ApiError } from '../../api/client';

const PLATFORMS = ['Avaya', 'Cisco', 'Genesys', 'Amazon', 'Twilio'];

export default function Login() {
  const { isAuthenticated, login, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex' }}>
      {/* Left hero panel — verbatim marketing copy from the original Login screen */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 72px',
          background: 'var(--gradient-login-bg)',
          color: '#fff',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232,97,45,0.12) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -100,
            left: -100,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232,97,45,0.06) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '35%',
            left: '10%',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
          }}
        />

        <div style={{ position: 'relative', maxWidth: 480 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, animation: 'fadeIn 0.5s ease' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--gradient-hero)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              EXL
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>CCaaS Migration Suite</div>
              <div style={{ fontSize: 10, letterSpacing: 3, color: '#9CA3AF', textTransform: 'uppercase' }}>
                Enterprise Platform
              </div>
            </div>
          </div>

          <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.2, margin: '32px 0 16px', animation: 'fadeInUp 0.6s ease' }}>
            Migrate your
            <br />
            contact center
            <br />
            with{' '}
            <span
              style={{
                background: 'var(--gradient-hero)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              confidence
            </span>
          </h1>

          <p style={{ fontSize: 15, color: '#D1D5DB', lineHeight: 1.7, animation: 'fadeInUp 0.7s ease' }}>
            End-to-end automated migration from legacy CCaaS to modern cloud contact centers. Connect, discover,
            transform, deploy, and test — all in one place.
          </p>

          <div style={{ display: 'flex', gap: 20, marginTop: 28, animation: 'fadeInUp 0.8s ease' }}>
            {[
              ['security', 'SOC 2 Certified'],
              ['verified', 'Enterprise Grade'],
              ['speed', '10x Faster'],
            ].map(([icon, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#D1D5DB' }}>
                <span className="material-icons-outlined" style={{ fontSize: 16, color: 'var(--brand)' }}>
                  {icon}
                </span>
                {label}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 40, animation: 'fadeInUp 0.9s ease' }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: '#6B7280', marginBottom: 10 }}>
              Supported Platforms
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {PLATFORMS.map((p) => (
                <span
                  key={p}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#D1D5DB',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right login card */}
      <div style={{ width: 500, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy)' }}>
        <div
          style={{
            width: 400,
            background: 'rgba(255,255,255,0.97)',
            borderRadius: 20,
            padding: 44,
            boxShadow: 'var(--shadow-login-card)',
            animation: 'scaleIn 0.5s ease',
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 4, marginBottom: 24 }}>
            {mode === 'login' ? 'Sign in to your migration workspace' : 'Set up access to your migration workspace'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Organization
              <select
                defaultValue="Acme Financial Corp"
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 6,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1.5px solid var(--border-input)',
                  background: '#F9FAFB',
                }}
              >
                <option>Acme Financial Corp</option>
                <option>TeleCorp Insurance</option>
                <option>GlobalBank Holdings</option>
              </select>
            </label>

            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 6,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1.5px solid var(--border-input)',
                  background: '#F9FAFB',
                }}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Password
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 6,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1.5px solid var(--border-input)',
                  background: '#F9FAFB',
                }}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)' }}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => showToast('Password reset is not available in this demo environment.')}
                style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 12, fontWeight: 600 }}
              >
                Forgot password?
              </button>
            </div>

            {error && <div style={{ color: 'var(--status-bad-fg)', fontSize: 13 }}>{error}</div>}

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--gradient-cta)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                boxShadow: 'var(--shadow-login-cta)',
              }}
            >
              {submitting ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
          </div>

          <button
            type="button"
            onClick={() => showToast('SSO / SAML login is not configured in this environment.')}
            style={{
              width: '100%',
              padding: '11px 16px',
              borderRadius: 10,
              border: '1.5px solid var(--border-input)',
              background: '#fff',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span className="material-icons-outlined" style={{ fontSize: 18 }}>
              key
            </span>
            SSO / SAML Login
          </button>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode((m) => (m === 'login' ? 'register' : 'login'));
            }}
            style={{ display: 'block', width: '100%', textAlign: 'center', background: 'none', border: 'none', color: 'var(--brand)', fontSize: 12, marginTop: 16 }}
          >
            {mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 20 }}>
            Protected by 256-bit encryption
          </p>
        </div>
      </div>
    </div>
  );
}
