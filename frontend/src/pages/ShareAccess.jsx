import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { userApi } from '../lib/api';
import { Layout } from '../components/layout/Layout';
import {
  Share2,
  Copy,
  Mail,
  Check,
  Users,
  Link,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

const ShareAccess = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const appUrl = window.location.origin;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await userApi.getAll();
      setUsers(res.data.filter(u => u.role !== 'owner'));
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    toast.success('Login link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const sendInviteEmail = (email) => {
    const subject = encodeURIComponent('Welcome to KeyFlow - Your Login Credentials');
    const body = encodeURIComponent(`
You have been invited to KeyFlow!

Login URL: ${appUrl}

Please contact your administrator for your login credentials.

Best regards,
${user?.name}
    `);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6" data-testid="share-access-page">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Share Access
          </h1>
          <p className="text-slate-400 mt-1">
            Invite team members and manage access to KeyFlow
          </p>
        </div>

        {/* Share Link */}
        <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Link className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-2">Share Login Link</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Share this link with team members so they can access KeyFlow
                </p>
                <div className="flex gap-3">
                  <Input
                    value={appUrl}
                    readOnly
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <Button onClick={copyLink} className="btn-primary flex-shrink-0">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How to Share */}
        <Card className="bg-[#111113] border-[#1f1f23]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Share2 className="w-5 h-5 text-emerald-400" />
              How to Share Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center mb-3">
                  <span className="text-sm font-bold text-cyan-400">1</span>
                </div>
                <h4 className="font-medium text-white mb-1">Create User Account</h4>
                <p className="text-sm text-slate-400">
                  Go to User Management and click "Add User" to create their account
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center mb-3">
                  <span className="text-sm font-bold text-cyan-400">2</span>
                </div>
                <h4 className="font-medium text-white mb-1">Share Credentials</h4>
                <p className="text-sm text-slate-400">
                  Send them the login link and their email/password credentials
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center mb-3">
                  <span className="text-sm font-bold text-cyan-400">3</span>
                </div>
                <h4 className="font-medium text-white mb-1">Ready to Go</h4>
                <p className="text-sm text-slate-400">
                  They can now log in and start managing keys!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="bg-[#111113] border-[#1f1f23]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5 text-purple-400" />
              Team Members ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-white/5 rounded-lg" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No team members yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Create users in User Management to see them here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {u.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{u.name}</p>
                        <p className="text-sm text-slate-500">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={
                        u.role === 'dealership_admin'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                      }>
                        {u.role === 'dealership_admin' ? 'Admin' : 'Staff'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => sendInviteEmail(u.email)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ShareAccess;
