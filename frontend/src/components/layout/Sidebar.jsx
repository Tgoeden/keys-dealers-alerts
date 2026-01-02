import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import {
  Key,
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  TrendingUp,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Wrench,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_keytrack-2/artifacts/jpgdi733_1000023991.jpg";

const Logo = ({ onClick }) => {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 cursor-pointer select-none"
    >
      <img 
        src={LOGO_URL} 
        alt="KeyFlow" 
        className="h-10 w-auto object-contain"
      />
    </div>
  );
};

export const Sidebar = () => {
  const { user, logout, isOwner, isDealershipAdmin, isDemo } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showOwnerModal, setShowOwnerModal] = useState(false);

  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    
    if (newCount >= 5) {
      setShowOwnerModal(true);
      setLogoClickCount(0);
    }
    
    // Reset count after 2 seconds of inactivity
    setTimeout(() => setLogoClickCount(0), 2000);
  };

  const navItems = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
      roles: ['owner', 'dealership_admin', 'user'],
    },
    {
      label: 'Key Management',
      icon: Key,
      path: '/keys',
      roles: ['owner', 'dealership_admin', 'user'],
    },
    {
      label: 'Service Bays',
      icon: Wrench,
      path: '/service-bays',
      roles: ['owner', 'dealership_admin', 'user'],
      rvOnly: true,
    },
    {
      label: 'Sales Tracker',
      icon: TrendingUp,
      path: '/sales-tracker',
      roles: ['owner', 'dealership_admin', 'user'],
    },
    {
      label: 'Users',
      icon: Users,
      path: '/users',
      roles: ['owner', 'dealership_admin'],
    },
    {
      label: 'Dealerships',
      icon: Building2,
      path: '/dealerships',
      roles: ['owner'],
    },
    {
      label: 'Time Alerts',
      icon: Clock,
      path: '/alerts',
      roles: ['owner', 'dealership_admin'],
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => item.roles.includes(user?.role)
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
        data-testid="mobile-menu-btn"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'sidebar',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <Logo onClick={handleLogoClick} />
          {isDemo && (
            <Badge className="mt-3 w-full justify-center bg-amber-100 text-amber-700 hover:bg-amber-100">
              Demo Mode • Limited Features
            </Badge>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                cn('sidebar-link', isActive && 'active')
              }
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100" />
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
              <span className="text-sm font-semibold text-slate-600">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-slate-500 capitalize">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Owner PIN Modal */}
      {showOwnerModal && (
        <OwnerPinModal onClose={() => setShowOwnerModal(false)} />
      )}
    </>
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
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Owner Access
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center text-2xl tracking-widest"
            maxLength={6}
            autoFocus
            data-testid="owner-pin-input"
          />
          {error && (
            <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
          )}
          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" data-testid="owner-pin-submit">
              Verify
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Sidebar;
