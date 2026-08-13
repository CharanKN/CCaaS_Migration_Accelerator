import { useNavigate } from 'react-router-dom';
import { Breadcrumbs, type BreadcrumbItem } from '../Breadcrumbs';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ToastContext';

export function TopBar({ breadcrumbs }: { breadcrumbs: BreadcrumbItem[] }) {
  const navigate = useNavigate();
  const { logout, email } = useAuth();
  const { showToast } = useToast();

  const initials = (email ?? 'U').replace(/@.*/, '').slice(0, 2).toUpperCase();

  return (
    <header
      style={{
        height: 52,
        flexShrink: 0,
        background: 'var(--navy)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {/* <span className="material-icons-outlined" style={{ color: 'var(--brand)' }}>
            hub
          </span> */}
          <div style={{width: 30, height: 30, background: 'linear-gradient(135deg, #E8612D, #F59E0B)', borderRadius: 7.5, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <span style={{color: '#fff', fontWeight: 700, fontSize: 10, letterSpacing: -0.5}}> EXL </span>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Migration Suite</span>
        </button>
        <div style={{width: 1, height: 20, background: 'rgba(255,255,255,0.12)', margin: '0 6'}}></div>
        <Breadcrumbs items={breadcrumbs} dark />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
         <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 4,
            background: 'rgba(52,211,153,0.15)',
            color: '#34D399',
          }}
        >
          PROD
        </span>
        <button
          onClick={() => showToast("Organization switching isn't available in this demo tenant.")}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '5px 10px',
            color: '#D1D5DB',
            fontSize: 12,
          }}
        >
          <span className="material-icons-outlined" style={{ fontSize: 16 }}>
            business
          </span>
          Acme Financial
          <span className="material-icons-outlined" style={{ fontSize: 16 }}>
            unfold_more
          </span>
        </button>

        <button
          onClick={() => showToast('No new notifications.')}
          style={{ background: 'none', border: 'none', position: 'relative' }}
          aria-label="Notifications"
        >
          <span className="material-icons-outlined" style={{ color: '#9CA3AF' }}>
            notifications
          </span>
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#EF4444',
            }}
          />
        </button>

        <button
          onClick={logout}
          title={email ? `Sign out — ${email}` : 'Sign out'}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--brand)',
            color: '#fff',
            border: 'none',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
