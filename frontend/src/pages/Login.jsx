import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Play } from 'lucide-react';
import { toast } from 'sonner';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_keytrack-2/artifacts/jpgdi733_1000023991.jpg";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showOwnerModal, setShowOwnerModal] = useState(false);

  const { login, ownerLogin, demoLogin } = useAuth();
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
      await login(email, password, rememberMe);
      toast.success('Welcome back!');
      navigate('/keys');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setError('');
    try {
      await demoLogin();
      toast.success('Welcome to the demo! Explore KeyFlow features.');
      navigate('/keys');
    } catch (err) {
      setError(err.response?.data?.detail || 'Demo login failed');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleOwnerLogin = async (pin, ownerRememberMe) => {
    try {
      await ownerLogin(pin, ownerRememberMe);
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
          className="flex items-center justify-center mb-8 cursor-pointer select-none"
          onClick={handleLogoClick}
          data-testid="login-logo"
        >
          <img 
            src={LOGO_URL} 
            alt="KeyFlow" 
            className="h-20 w-auto object-contain"
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to KeyFlow</h1>
          <p className="text-slate-400">Sign in to manage your dealership keys</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-6 text-red-400" data-testid="login-error">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Demo Button - Prominent */}
        <div className="mb-6">
          <Button
            type="button"
            className="w-full h-14 text-base bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-semibold"
            onClick={handleDemoLogin}
            disabled={demoLoading}
            data-testid="demo-login-btn"
          >
            <Play className="w-5 h-5 mr-2" />
            {demoLoading ? 'Starting...' : 'Try Demo'}
          </Button>
          <p className="text-xs text-slate-500 text-center mt-2">
            No login required • Limited to 4 keys
          </p>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#111113] px-4 text-slate-500">Or sign in with credentials</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-slate-300">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@dealership.com"
                className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder-slate-500"
                required
                data-testid="login-email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 pr-10 h-12 bg-white/5 border-white/10 text-white placeholder-slate-500"
                required
                data-testid="login-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked)}
              className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              data-testid="remember-me-checkbox"
            />
            <label
              htmlFor="remember-me"
              className="text-sm text-slate-400 cursor-pointer select-none"
            >
              Keep me signed in
            </label>
          </div>
          <p className="text-xs text-slate-500 -mt-3 ml-7">
            Auto-logout after 5 hours of inactivity
          </p>

          <Button
            type="submit"
            className="w-full h-12 text-base btn-primary"
            disabled={loading}
            data-testid="login-submit"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          Need an account? Contact your administrator
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
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSubmit(pin, rememberMe);
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
          
          {/* Remember Me for Owner */}
          <div className="flex items-center space-x-3 mt-4">
            <Checkbox
              id="owner-remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked)}
              className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              data-testid="owner-remember-me-checkbox"
            />
            <label
              htmlFor="owner-remember-me"
              className="text-sm text-slate-400 cursor-pointer select-none"
            >
              Keep me signed in
            </label>
          </div>

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
