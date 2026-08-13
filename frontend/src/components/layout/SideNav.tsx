import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { navGroupsForRole } from '../../routes';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../ToastContext';

export function SideNav() {
  const [collapsed, setCollapsed] = useState(false);
  const { showToast } = useToast();
  const { role, isRoleLoading } = useAuth();
  // While the role fetch is in flight, show nothing rather than the full list
  // — avoids a one-frame flash of admin-only items for a demo user.
  const navGroups = isRoleLoading ? [] : navGroupsForRole(role);

  return (
    <nav
      style={{
        width: collapsed ? 60 : 220,
        flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.15s ease',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        <button
          onClick={() => setCollapsed((c) => !c)}
          style={{ background: 'none', border: 'none', color: '#9CA3AF' }}
          aria-label="Toggle navigation"
        >
          <span className="material-icons-outlined">{collapsed ? 'chevron_right' : 'chevron_left'}</span>
        </button>
      </div>

      <div style={{ flex: 1 }}>
        {navGroups.map((group) => (
          <div key={group.title} style={{ padding: '8px 0' }}>
            {!collapsed && (
              <div
                style={{
                  padding: '18px 12px 6px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: '#A0A0B0',
                }}
              >
                {group.title}
              </div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: collapsed ? '10px 0' : '10px 16px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  color: isActive ? 'var(--brand-deep)' : '#374151',
                  background: isActive ? 'var(--brand-tint-bg)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                })}
                title={item.label}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className="material-icons-outlined"
                      style={{ fontSize: 19, color: isActive ? 'var(--brand)' : '#6B7280' }}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {item.label}
                        {item.badge && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 8,
                              minWidth: 18,
                              textAlign: 'center',
                              background: '#FEE2E2',
                              color: '#DC2626',
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div style={{ padding: 10, borderTop: '1px solid var(--divider)' }}>
        <button
          onClick={() => showToast('Opening Help & Docs…')}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand-tint-bg)',
            border: 'none',
            color: 'var(--brand-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8,
            fontSize: 12,
            fontWeight: 600,
          }}
          title="Help & Docs"
        >
          <span className="material-icons-outlined" style={{ fontSize: 17, color: 'var(--brand)' }}>
            help_outline
          </span>
          {!collapsed && 'Help & Docs'}
        </button>
      </div>
    </nav>
  );
}
