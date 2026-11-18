import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FileText, LayoutDashboard, Menu, Plus, Settings, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStore } from '../store';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const { data } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  // Keyboard shortcut: "n" for a new invoice (when not typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n') {
        e.preventDefault();
        navigate('/invoices/new');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const biz = data.settings.business;

  return (
    <div className="app">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden>
            <svg viewBox="0 0 32 32" width="28" height="28">
              <rect width="32" height="32" rx="8" fill="currentColor" />
              <path d="M10 9h12M10 15h12M10 21h7" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span>Ledgerly</span>
          <button className="icon-btn sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <button className="btn btn-primary btn-block" onClick={() => navigate('/invoices/new')} title="Shortcut: N">
          <Plus size={16} /> New invoice
        </button>

        <nav className="nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="avatar sm">
            {biz.logo ? <img src={biz.logo} alt="" /> : biz.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min0">
            <div className="truncate strong">{biz.name}</div>
            <div className="truncate muted small">{biz.email}</div>
          </div>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topbar-mobile">
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <span className="strong">Ledgerly</span>
          <button className="icon-btn" onClick={() => navigate('/invoices/new')} aria-label="New invoice">
            <Plus size={20} />
          </button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
