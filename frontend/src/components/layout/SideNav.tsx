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
        background: 'var(--navy)',
        color: '#fff',
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
        {!collapsed && <span style={{ fontWeight: 800, fontSize: 14 }}>CCaaS Suite</span>}
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
                  padding: '4px 16px',
                  fontSize: 10,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  color: '#6B7280',
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
                              background: isActive ? 'var(--brand)' : '#374151',
                              color: '#fff',
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

      <button
        onClick={() => showToast('Opening Help & Docs…')}
        style={{
          margin: 8,
          padding: '10px 12px',
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
        <span className="material-icons-outlined" style={{ fontSize: 18 }}>
          help_outline
        </span>
        {!collapsed && 'Help & Docs'}
      </button>
    </nav>
  );
}
