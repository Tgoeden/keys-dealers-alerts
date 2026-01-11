import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import {
  Key,
  LayoutDashboard,
  Users,
  Share2,
  FileText,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
  TrendingUp,
  ChevronDown,
  Building2,
  Clock,
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { Toaster } from '../ui/sonner';

// Logo URL - can be customized per deployment
const LOGO_URL = process.env.REACT_APP_LOGO_URL || "https://customer-assets.emergentagent.com/job_keytrack-2/artifacts/jpgdi733_1000023991.jpg";

export const Layout = ({ children }) => {
  const { user, logout, isOwner, isDealershipAdmin, isDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    if (newCount >= 5) {
      setShowOwnerModal(true);
      setLogoClickCount(0);
    }
    setTimeout(() => setLogoClickCount(0), 2000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navigation items based on role
  const getNavItems = () => {
    if (isOwner) {
      return [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { label: 'Dealerships', icon: Building2, path: '/dealerships' },
        { label: 'All Keys', icon: Key, path: '/keys' },
        { label: 'Needs Attention', icon: AlertTriangle, path: '/repairs', highlight: true },
        { label: 'Time Alerts', icon: Clock, path: '/alerts' },
      ];
    }
    
    // Admin and User navigation
    return [
      { label: 'Key Management', icon: Key, path: '/keys' },
      { label: 'Needs Attention', icon: AlertTriangle, path: '/repairs', highlight: true },
      { label: 'User Management', icon: Users, path: '/users', adminOnly: true },
      { label: 'Share Access', icon: Share2, path: '/share', adminOnly: true },
      { label: 'Logs & Reports', icon: FileText, path: '/logs' },
      { label: 'Service Bays', icon: Wrench, path: '/service-bays', rvOnly: true },
    ].filter(item => {
      if (item.adminOnly && !isDealershipAdmin) return false;
      return true;
    });
  };

  const navItems = getNavItems();
  const currentPage = navItems.find(item => location.pathname === item.path)?.label || 'Dashboard';

  return (
    <div className="app-container">
      {/* Top Navigation Bar */}
      <header className="top-nav">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={handleLogoClick}
            data-testid="nav-logo"
          >
            <img src={LOGO_URL} alt="KeyFlow" className="h-8 w-auto" />
          </div>
        </div>

        {/* Center - Current Page + Navigation */}
        <div className="hidden md:flex items-center gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )
              }
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Right Side - Menu */}
        <div className="flex items-center gap-3">
          {/* Sales Tracker Button - SUSPENDED/HIDDEN */}
          {/* 
          {location.pathname !== '/sales-tracker' && (
            <Button
              onClick={() => navigate('/sales-tracker')}
              className="sales-tracker-btn hidden sm:flex"
              data-testid="sales-tracker-btn"
            >
              <TrendingUp className="w-5 h-5" />
              <span>Sales Tracker</span>
            </Button>
          )}
          */}

          {/* Settings & Help for Admin */}
          {(isDealershipAdmin || isOwner) && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/settings')}
                className="text-slate-400 hover:text-white"
                data-testid="settings-btn"
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/help')}
                className="text-slate-400 hover:text-white"
                data-testid="help-btn"
              >
                <HelpCircle className="w-5 h-5" />
              </Button>
            </>
          )}

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
              data-testid="user-menu-btn"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", menuOpen && "rotate-180")} />
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="menu-dropdown absolute right-0 mt-2 z-50 animate-fade-in" data-testid="user-dropdown">
                {isDemo && (
                  <div className="px-3 py-2 mb-2">
                    <Badge className="w-full justify-center bg-amber-500/20 text-amber-400 border-amber-500/30">
                      Demo Mode
                    </Badge>
                  </div>
                )}
                
                {/* Mobile Navigation */}
                <div className="md:hidden border-b border-white/10 pb-2 mb-2">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        cn('menu-item', isActive && 'active')
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </NavLink>
                  ))}
                  {/* Sales Tracker / Back to KeyFlow in mobile menu */}
                  {location.pathname === '/sales-tracker' ? (
                    <NavLink
                      to="/keys"
                      onClick={() => setMenuOpen(false)}
                      className="menu-item text-slate-300"
                    >
                      <Key className="w-4 h-4" />
                      Back to KeyFlow
                    </NavLink>
                  ) : (
                    /* Sales Tracker SUSPENDED - Hidden from mobile menu */
                    null
                  )}
                  {/* Needs Attention link */}
                  <NavLink
                    to="/repairs"
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      cn('menu-item text-amber-400', isActive && 'active')
                    }
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Needs Attention
                  </NavLink>
                </div>

                {(isDealershipAdmin || isOwner) && (
                  <>
                    <NavLink
                      to="/settings"
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) => cn('menu-item', isActive && 'active')}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </NavLink>
                    <NavLink
                      to="/help"
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) => cn('menu-item', isActive && 'active')}
                    >
                      <HelpCircle className="w-4 h-4" />
                      Help & Guides
                    </NavLink>
                  </>
                )}
                
                <button
                  onClick={handleLogout}
                  className="menu-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  data-testid="logout-btn"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      <Toaster position="top-right" richColors theme="dark" />

      {/* Owner PIN Modal */}
      {showOwnerModal && (
        <OwnerPinModal onClose={() => setShowOwnerModal(false)} />
      )}
    </div>
  );
};

const OwnerPinModal = ({ onClose }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { ownerLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await ownerLogin(pin);
      onClose();
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid PIN');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content max-w-sm"
        onClick={(e) => e.stopPropagation()}
        data-testid="owner-pin-modal"
      >
        <h3 className="text-lg font-semibold text-white mb-2 text-center">
          Owner Access
        </h3>
        <p className="text-slate-400 text-sm text-center mb-6">
          Enter your secure PIN to continue
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-center text-3xl tracking-[0.5em] font-mono text-white"
            maxLength={6}
            autoFocus
            data-testid="owner-pin-input"
          />
          {error && (
            <p className="text-red-400 text-sm mt-3 text-center">{error}</p>
          )}
          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 border-white/20 text-white hover:bg-white/10"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 btn-primary"
              disabled={pin.length < 4}
              data-testid="owner-pin-submit"
            >
              Verify
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Layout;
