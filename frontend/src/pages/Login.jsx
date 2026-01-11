import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { authApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { 
  Mail, Lock, Eye, EyeOff, AlertCircle, Play, User, 
  Building2, ChevronLeft, Shield, Users 
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

// Logo URL - can be customized per deployment
const LOGO_URL = process.env.REACT_APP_LOGO_URL || "https://customer-assets.emergentagent.com/job_keytrack-2/artifacts/jpgdi733_1000023991.jpg";

const Login = () => {
  const [loginMode, setLoginMode] = useState('select'); // 'select', 'admin', 'user', 'legacy'
  const [dealerships, setDealerships] = useState([]);
  const [selectedDealership, setSelectedDealership] = useState('');
  const [pin, setPin] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showOwnerModal, setShowOwnerModal] = useState(false);

  const { login, ownerLogin, adminPinLogin, userPinLogin, demoLogin } = useAuth();
  const navigate = useNavigate();

  // Fetch dealerships on mount
  useEffect(() => {
    fetchDealerships();
  }, []);

  const fetchDealerships = async () => {
    try {
      const res = await authApi.getPublicDealerships();
      setDealerships(res.data);
    } catch (err) {
      console.error('Failed to fetch dealerships:', err);
    }
  };

  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);

    if (newCount >= 5) {
      setShowOwnerModal(true);
      setLogoClickCount(0);
    }

    setTimeout(() => setLogoClickCount(0), 2000);
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await adminPinLogin(selectedDealership, pin, rememberMe);
      toast.success('Welcome back!');
      navigate('/keys');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleUserLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await userPinLogin(selectedDealership, userName, pin, rememberMe);
      toast.success('Welcome back!');
      navigate('/keys');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleLegacyLogin = async (e) => {
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

  const handleOwnerLogin = async (ownerPin, ownerRememberMe) => {
    try {
      await ownerLogin(ownerPin, ownerRememberMe);
      setShowOwnerModal(false);
      toast.success('Owner access granted');
      navigate('/dashboard');
    } catch (err) {
      throw err;
    }
  };

  const resetForm = () => {
    setPin('');
    setUserName('');
    setEmail('');
    setPassword('');
    setError('');
  };

  const goBack = () => {
    resetForm();
    setLoginMode('select');
  };

  // Role selection screen
  if (loginMode === 'select') {
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
            <p className="text-slate-400">Select how you want to sign in</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-6 text-red-400" data-testid="login-error">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Demo Button */}
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
              <span className="bg-[#111113] px-4 text-slate-500">Or sign in as</span>
            </div>
          </div>

          {/* Login Options */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-14 border-cyan-500/30 text-white hover:bg-cyan-500/10 hover:border-cyan-500/50 justify-start px-4"
              onClick={() => setLoginMode('admin')}
              data-testid="admin-login-option"
            >
              <Shield className="w-5 h-5 mr-3 text-cyan-400" />
              <div className="text-left">
                <p className="font-medium">Admin Login</p>
                <p className="text-xs text-slate-400">Quick PIN access for dealership admins</p>
              </div>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full h-14 border-white/20 text-white hover:bg-white/5 justify-start px-4"
              onClick={() => setLoginMode('user')}
              data-testid="user-login-option"
            >
              <Users className="w-5 h-5 mr-3 text-slate-400" />
              <div className="text-left">
                <p className="font-medium">Staff Login</p>
                <p className="text-xs text-slate-400">Name + PIN for team members</p>
              </div>
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full h-10 text-slate-500 hover:text-white text-sm"
              onClick={() => setLoginMode('legacy')}
              data-testid="legacy-login-option"
            >
              <Mail className="w-4 h-4 mr-2" />
              Sign in with Email & Password
            </Button>
          </div>
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
  }

  // Admin PIN login screen
  if (loginMode === 'admin') {
    return (
      <div className="auth-container">
        <div className="auth-card animate-fade-in">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm"
            data-testid="back-btn"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div
            className="flex items-center justify-center mb-6 cursor-pointer select-none"
            onClick={handleLogoClick}
          >
            <img src={LOGO_URL} alt="KeyFlow" className="h-16 w-auto object-contain" />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-white mb-2">Admin Login</h1>
            <p className="text-slate-400 text-sm">Enter your dealership and PIN</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4 text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Dealership</Label>
              <Select value={selectedDealership} onValueChange={setSelectedDealership}>
                <SelectTrigger className="w-full h-12 bg-white/5 border-white/10 text-white" data-testid="dealership-select">
                  <Building2 className="w-4 h-4 mr-2 text-slate-500" />
                  <SelectValue placeholder="Select your dealership" />
                </SelectTrigger>
                <SelectContent className="bg-[#111113] border-[#1f1f23]">
                  {dealerships.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">PIN</Label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                className="h-12 bg-white/5 border-white/10 text-white text-center text-xl tracking-[0.3em] font-mono"
                maxLength={6}
                autoFocus
                data-testid="admin-pin-input"
              />
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked)}
                className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
              />
              <label htmlFor="remember-me" className="text-sm text-slate-400 cursor-pointer">
                Keep me signed in
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base btn-primary"
              disabled={loading || !selectedDealership || pin.length < 4}
              data-testid="admin-login-submit"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>

        {showOwnerModal && (
          <OwnerPinModal onClose={() => setShowOwnerModal(false)} onSubmit={handleOwnerLogin} />
        )}
      </div>
    );
  }

  // User PIN login screen
  if (loginMode === 'user') {
    return (
      <div className="auth-container">
        <div className="auth-card animate-fade-in">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm"
            data-testid="back-btn"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div
            className="flex items-center justify-center mb-6 cursor-pointer select-none"
            onClick={handleLogoClick}
          >
            <img src={LOGO_URL} alt="KeyFlow" className="h-16 w-auto object-contain" />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-white mb-2">Staff Login</h1>
            <p className="text-slate-400 text-sm">Enter your name and PIN</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4 text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleUserLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Dealership</Label>
              <Select value={selectedDealership} onValueChange={setSelectedDealership}>
                <SelectTrigger className="w-full h-12 bg-white/5 border-white/10 text-white" data-testid="dealership-select">
                  <Building2 className="w-4 h-4 mr-2 text-slate-500" />
                  <SelectValue placeholder="Select your dealership" />
                </SelectTrigger>
                <SelectContent className="bg-[#111113] border-[#1f1f23]">
                  {dealerships.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Your Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  className="pl-10 h-12 bg-white/5 border-white/10 text-white"
                  data-testid="user-name-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">PIN</Label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                className="h-12 bg-white/5 border-white/10 text-white text-center text-xl tracking-[0.3em] font-mono"
                maxLength={6}
                data-testid="user-pin-input"
              />
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked)}
                className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
              />
              <label htmlFor="remember-me" className="text-sm text-slate-400 cursor-pointer">
                Keep me signed in
              </label>
            </div>
            <p className="text-xs text-slate-500 -mt-2">
              Without this, you'll need to re-login after 6 hours of inactivity
            </p>

            <Button
              type="submit"
              className="w-full h-12 text-base btn-primary"
              disabled={loading || !selectedDealership || !userName || pin.length < 4}
              data-testid="user-login-submit"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>

        {showOwnerModal && (
          <OwnerPinModal onClose={() => setShowOwnerModal(false)} onSubmit={handleOwnerLogin} />
        )}
      </div>
    );
  }

  // Legacy email/password login screen
  return (
    <div className="auth-container">
      <div className="auth-card animate-fade-in">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm"
          data-testid="back-btn"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div
          className="flex items-center justify-center mb-6 cursor-pointer select-none"
          onClick={handleLogoClick}
        >
          <img src={LOGO_URL} alt="KeyFlow" className="h-16 w-auto object-contain" />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-white mb-2">Email Login</h1>
          <p className="text-slate-400 text-sm">Sign in with email and password</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4 text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleLegacyLogin} className="space-y-4">
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

          <div className="flex items-center space-x-3">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked)}
              className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
            />
            <label htmlFor="remember-me" className="text-sm text-slate-400 cursor-pointer">
              Keep me signed in
            </label>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base btn-primary"
            disabled={loading}
            data-testid="login-submit"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </div>

      {showOwnerModal && (
        <OwnerPinModal onClose={() => setShowOwnerModal(false)} onSubmit={handleOwnerLogin} />
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
