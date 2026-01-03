import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { userApi, inviteApi, dealershipApi } from '../lib/api';
import { Layout } from '../components/layout/Layout';
import {
  Share2,
  Copy,
  Mail,
  Check,
  Users,
  Link,
  Plus,
  Trash2,
  Clock,
  Shield,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

const ShareAccess = () => {
  const { user, isOwner, isDealershipAdmin, isDemo } = useAuth();
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [dealerships, setDealerships] = useState([]);
  const [selectedDealership, setSelectedDealership] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const appUrl = window.location.origin;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedDealership) {
      fetchInvites();
    }
  }, [selectedDealership]);

  const fetchData = async () => {
    try {
      // Fetch dealerships
      const dealershipRes = await dealershipApi.getAll();
      setDealerships(dealershipRes.data);
      
      if (dealershipRes.data.length > 0) {
        const defaultDealership = isOwner ? dealershipRes.data[0].id : user?.dealership_id;
        setSelectedDealership(defaultDealership);
      }

      // Fetch users
      const usersRes = await userApi.getAll();
      setUsers(usersRes.data.filter(u => u.role !== 'owner'));
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const res = await inviteApi.getAll(selectedDealership);
      setInvites(res.data);
    } catch (err) {
      console.error('Failed to fetch invites:', err);
    }
  };

  const copyInviteLink = (token) => {
    const link = `${appUrl}/join/${token}`;
    navigator.clipboard.writeText(link);
    setCopied(token);
    toast.success('Invite link copied to clipboard!');
    setTimeout(() => setCopied(null), 2000);
  };

  const deleteInvite = async (inviteId) => {
    try {
      await inviteApi.delete(inviteId);
      toast.success('Invite deleted');
      fetchInvites();
    } catch (err) {
      toast.error('Failed to delete invite');
    }
  };

  const handleCreateInvite = async (role) => {
    if (!selectedDealership) {
      toast.error('Please select a dealership first');
      return;
    }

    try {
      await inviteApi.create({
        dealership_id: selectedDealership,
        role: role,
        expires_in_days: 7,
      });
      toast.success('Invite link created!');
      setShowCreateModal(false);
      fetchInvites();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create invite');
    }
  };

  const currentDealership = dealerships.find(d => d.id === selectedDealership);
  const dealershipUsers = users.filter(u => u.dealership_id === selectedDealership);
  const activeInvites = invites.filter(i => !i.is_used && new Date(i.expires_at) > new Date());
  const usedInvites = invites.filter(i => i.is_used);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6" data-testid="share-access-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Share Access
            </h1>
            <p className="text-slate-400 mt-1">
              Create invite links to add team members to your dealership
            </p>
          </div>
          {(isOwner || isDealershipAdmin) && !isDemo && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
              data-testid="create-invite-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Invite Link
            </Button>
          )}
        </div>

        {/* Dealership Selector (Owner only) */}
        {isOwner && dealerships.length > 1 && (
          <Select value={selectedDealership} onValueChange={setSelectedDealership}>
            <SelectTrigger className="w-full sm:w-64 bg-[#111113] border-[#1f1f23] text-white">
              <SelectValue placeholder="Select Dealership" />
            </SelectTrigger>
            <SelectContent className="bg-[#111113] border-[#1f1f23]">
              {dealerships.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Demo Warning */}
        {isDemo && (
          <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-300">Demo Mode</p>
              <p className="text-xs text-amber-400/70">
                Invite creation is disabled in demo mode. Upgrade to create invite links.
              </p>
            </div>
          </div>
        )}

        {/* Active Invite Links */}
        <Card className="bg-[#111113] border-[#1f1f23]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Link className="w-5 h-5 text-cyan-400" />
              Active Invite Links ({activeInvites.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-white/5 rounded-lg" />
                ))}
              </div>
            ) : activeInvites.length === 0 ? (
              <div className="text-center py-8">
                <Link className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No active invite links</p>
                <p className="text-sm text-slate-500 mt-1">
                  Create an invite link to share with new team members
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="p-4 bg-white/5 rounded-xl border border-white/5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={
                            invite.role === 'dealership_admin'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                          }>
                            <Shield className="w-3 h-3 mr-1" />
                            {invite.role === 'dealership_admin' ? 'Admin' : 'Staff'}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            for {invite.dealership_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>
                            Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => copyInviteLink(invite.token)}
                          className="btn-primary"
                        >
                          {copied === invite.token ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1" />
                              Copy Link
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteInvite(invite.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="bg-[#111113] border-[#1f1f23]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Share2 className="w-5 h-5 text-emerald-400" />
              How Invites Work
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center mb-3">
                  <span className="text-sm font-bold text-cyan-400">1</span>
                </div>
                <h4 className="font-medium text-white mb-1">Create Invite</h4>
                <p className="text-sm text-slate-400">
                  Click "Create Invite Link" and choose the role (Admin or Staff)
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center mb-3">
                  <span className="text-sm font-bold text-cyan-400">2</span>
                </div>
                <h4 className="font-medium text-white mb-1">Share Link</h4>
                <p className="text-sm text-slate-400">
                  Copy the link and send it to your team member via email or text
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center mb-3">
                  <span className="text-sm font-bold text-cyan-400">3</span>
                </div>
                <h4 className="font-medium text-white mb-1">They Register</h4>
                <p className="text-sm text-slate-400">
                  They'll create their account and be automatically added to your dealership
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
              Team Members ({dealershipUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-white/5 rounded-lg" />
                ))}
              </div>
            ) : dealershipUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No team members yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Create an invite link to add team members
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dealershipUsers.map((u) => (
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
                    <Badge className={
                      u.role === 'dealership_admin'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                    }>
                      {u.role === 'dealership_admin' ? 'Admin' : 'Staff'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Used Invites (History) */}
        {usedInvites.length > 0 && (
          <Card className="bg-[#111113] border-[#1f1f23]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                Used Invites ({usedInvites.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {usedInvites.slice(0, 5).map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">
                        {invite.role === 'dealership_admin' ? 'Admin' : 'Staff'}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-500">
                      Used {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Invite Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md" data-testid="create-invite-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Invite Link
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Choose the role for the person you're inviting to <span className="text-white">{currentDealership?.name}</span>
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Admin Invite (Owner only) */}
              {isOwner && (
                <button
                  onClick={() => handleCreateInvite('dealership_admin')}
                  className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-left hover:bg-blue-500/20 transition-colors"
                  data-testid="invite-admin"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Dealership Admin</p>
                      <p className="text-xs text-slate-400">
                        Can manage keys, users, and settings
                      </p>
                    </div>
                  </div>
                </button>
              )}
              
              {/* Staff Invite */}
              <button
                onClick={() => handleCreateInvite('user')}
                className="p-4 bg-slate-500/10 border border-slate-500/20 rounded-xl text-left hover:bg-slate-500/20 transition-colors"
                data-testid="invite-user"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Staff Member</p>
                    <p className="text-xs text-slate-400">
                      Can check keys in/out and use Sales Tracker
                    </p>
                  </div>
                </div>
              </button>
            </div>
            
            <p className="text-xs text-slate-500 text-center">
              Links expire after 7 days
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ShareAccess;
