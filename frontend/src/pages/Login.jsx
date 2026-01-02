import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Key, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showOwnerModal, setShowOwnerModal] = useState(false);

  const { login, ownerLogin } = useAuth();
  const navigate = useNavigate();

  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);

    if (newCount >= 5) {
      setShowOwnerModal(true);
      setLogoClickCount(0);
    }

    setTimeout(() => setLogoClickCount(0), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerLogin = async (pin) => {
    try {
      await ownerLogin(pin);
      setShowOwnerModal(false);
      toast.success('Owner access granted');
      navigate('/dashboard');
    } catch (err) {
      throw err;
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card animate-fade-in">
        {/* Logo */}
        <div
          className="flex items-center justify-center gap-3 mb-8 cursor-pointer select-none"
          onClick={handleLogoClick}
          data-testid="login-logo"
        >
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center">
            <Key className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            KeyFlow
          </span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome back</h1>
          <p className="text-slate-500">Sign in to your account to continue</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl mb-6 text-red-600" data-testid="login-error">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@dealership.com"
                className="pl-10 h-12"
                required
                data-testid="login-email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 pr-10 h-12"
                required
                data-testid="login-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base"
            disabled={loading}
            data-testid="login-submit"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline font-medium">
            Contact admin
          </Link>
        </p>
      </div>

      {/* Owner PIN Modal */}
      {showOwnerModal && (
        <OwnerPinModal
          onClose={() => setShowOwnerModal(false)}
          onSubmit={handleOwnerLogin}
        />
      )}
    </div>
  );
};

const OwnerPinModal = ({ onClose, onSubmit }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSubmit(pin);
    } catch (err) {
      setError('Invalid PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content max-w-sm"
        onClick={(e) => e.stopPropagation()}
        data-testid="owner-pin-modal"
      >
        <h3 className="text-lg font-semibold text-slate-900 mb-2 text-center">
          Owner Access
        </h3>
        <p className="text-slate-500 text-sm text-center mb-6">
          Enter your secure PIN to continue
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            className="w-full px-4 py-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center text-3xl tracking-[0.5em] font-mono"
            maxLength={6}
            autoFocus
            data-testid="owner-pin-input"
          />
          {error && (
            <p className="text-red-500 text-sm mt-3 text-center">{error}</p>
          )}
          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11"
              disabled={loading || pin.length < 4}
              data-testid="owner-pin-submit"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
