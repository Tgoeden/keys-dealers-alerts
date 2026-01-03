import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { inviteApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Shield, Users, Mail, Lock, User, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Logo URL - can be customized per deployment
const LOGO_URL = process.env.REACT_APP_LOGO_URL || "https://customer-assets.emergentagent.com/job_keytrack-2/artifacts/jpgdi733_1000023991.jpg";

const Join = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [inviteInfo, setInviteInfo] = useState(null);
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await inviteApi.validate(token);
      setInviteInfo(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired invite link');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await inviteApi.accept({
        token,
        name: form.name,
        email: form.email,
        password: form.password,
      });
      
      // Store auth data
      localStorage.setItem('keyflow_token', res.data.access_token);
      localStorage.setItem('keyflow_user', JSON.stringify(res.data.user));
      localStorage.setItem('keyflow_last_activity', Date.now().toString());
      
      toast.success('Welcome to KeyFlow! Your account has been created.');
      
      // Redirect to keys page
      window.location.href = '/keys';
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Validating invite link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Invite</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <Button onClick={() => navigate('/login')} className="btn-primary">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#111113] border border-white/5 rounded-2xl p-6 sm:p-8">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <img 
              src={LOGO_URL} 
              alt="KeyFlow" 
              className="h-16 w-auto object-contain"
            />
          </div>

          {/* Invite Info */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">You're Invited!</h1>
            <p className="text-slate-400 text-sm mb-4">
              You've been invited to join <span className="text-white font-medium">{inviteInfo?.dealership_name}</span>
            </p>
            <Badge className={
              inviteInfo?.role === 'dealership_admin'
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
            }>
              {inviteInfo?.role === 'dealership_admin' ? (
                <>
                  <Shield className="w-3 h-3 mr-1" />
                  Admin Access
                </>
              ) : (
                <>
                  <Users className="w-3 h-3 mr-1" />
                  Staff Access
                </>
              )}
            </Badge>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Your Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="John Smith"
                  className="pl-10 h-12 bg-white/5 border-white/10 text-white"
                  required
                  data-testid="join-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="pl-10 h-12 bg-white/5 border-white/10 text-white"
                  required
                  data-testid="join-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="pl-10 h-12 bg-white/5 border-white/10 text-white"
                  required
                  minLength={6}
                  data-testid="join-password"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className="pl-10 h-12 bg-white/5 border-white/10 text-white"
                  required
                  data-testid="join-confirm-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 btn-primary text-base"
              disabled={submitting}
              data-testid="join-submit"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account & Join'
              )}
            </Button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-cyan-400 hover:text-cyan-300"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Join;
