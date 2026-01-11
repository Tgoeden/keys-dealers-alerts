import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { userApi, dealershipApi, authApi } from '../lib/api';
import { Layout } from '../components/layout/Layout';
import {
  Users as UsersIcon,
  Plus,
  Search,
  Trash2,
  Mail,
  Building2,
  AlertTriangle,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import api from '../lib/api';

// Standard user roles
const STANDARD_ROLES = [
  { id: 'sales', name: 'Sales' },
  { id: 'service', name: 'Service' },
  { id: 'delivery', name: 'Delivery' },
  { id: 'porter', name: 'Porter' },
  { id: 'lot_tech', name: 'Lot Tech' },
];

const Users = () => {
  const { user, isOwner, isDealershipAdmin, isDemo } = useAuth();
  const [users, setUsers] = useState([]);
  const [dealerships, setDealerships] = useState([]);
  const [selectedDealership, setSelectedDealership] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [demoLimits, setDemoLimits] = useState(null);

  useEffect(() => {
    fetchDealerships();
    if (isDemo) {
      fetchDemoLimits();
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [selectedDealership]);

  const fetchDemoLimits = async () => {
    try {
      const res = await authApi.getDemoLimits();
      setDemoLimits(res.data);
    } catch (err) {
      console.error('Failed to fetch demo limits:', err);
    }
  };

  const fetchDealerships = async () => {
    try {
      const res = await dealershipApi.getAll();
      setDealerships(res.data);
      if (!isOwner && res.data.length > 0) {
        setSelectedDealership(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch dealerships:', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userApi.getAll(selectedDealership || undefined);
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (data) => {
    try {
      await userApi.create(data);
      toast.success('User created successfully');
      setShowAddModal(false);
      fetchUsers();
      if (isDemo) fetchDemoLimits();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    try {
      await userApi.delete(deleteUser.id);
      toast.success('User deleted successfully');
      setDeleteUser(null);
      fetchUsers();
      if (isDemo) fetchDemoLimits();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(searchLower) ||
      (u.email && u.email.toLowerCase().includes(searchLower))
    );
  });

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'dealership_admin':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'sales':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'service':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'delivery':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'porter':
        return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      case 'lot_tech':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const formatRoleName = (role) => {
    if (!role) return 'User';
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const canAddUsers = !isDemo || (demoLimits?.can_add_users ?? true);

  return (
    <Layout>
      <div className="space-y-6" data-testid="users-page">
        {/* Demo Limits Banner */}
        {isDemo && demoLimits && (
          <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-300">
                Demo Mode: {demoLimits.current_users} / {demoLimits.max_users} additional users
              </p>
              <p className="text-xs text-amber-400/70">
                Upgrade to add unlimited team members
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              User Management
            </h1>
            <p className="text-slate-400 mt-1">
              Manage dealership staff and access
            </p>
          </div>
          <Button 
            onClick={() => setShowAddModal(true)} 
            disabled={!canAddUsers}
            className="btn-primary"
            data-testid="add-user-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
            {!canAddUsers && ' (Limit Reached)'}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {isOwner && (
            <Select value={selectedDealership || "all"} onValueChange={(v) => setSelectedDealership(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-64 bg-[#111113] border-[#1f1f23] text-white" data-testid="dealership-filter">
                <SelectValue placeholder="All Dealerships" />
              </SelectTrigger>
              <SelectContent className="bg-[#111113] border-[#1f1f23]">
                <SelectItem value="all">All Dealerships</SelectItem>
                {dealerships.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#111113] border-[#1f1f23] text-white"
              data-testid="user-search"
            />
          </div>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <UsersIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white">No users found</h3>
            <p className="text-slate-500 mt-1">
              {search ? 'Try a different search term' : 'Add your first user to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((u) => (
              <Card key={u.id} className="bg-[#111113] border-[#1f1f23]" data-testid={`user-card-${u.name}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                        <span className="text-lg font-semibold text-white">
                          {u.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-white">{u.name}</p>
                        {u.email && (
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Mail className="w-3 h-3" />
                            {u.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getRoleBadgeStyle(u.role)}>
                        {formatRoleName(u.role)}
                      </Badge>
                      {u.id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => setDeleteUser(u)}
                          data-testid={`delete-user-${u.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <AddUserModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddUser}
        dealerships={dealerships}
        isOwner={isOwner}
        defaultDealershipId={isDealershipAdmin ? user?.dealership_id : selectedDealership}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent className="bg-[#111113] border-[#1f1f23]" data-testid="delete-user-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete User</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete {deleteUser?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteUser}
              data-testid="confirm-delete-user"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

const AddUserModal = ({ open, onClose, onSubmit, dealerships, isOwner, defaultDealershipId }) => {
  const [form, setForm] = useState({
    name: '',
    pin: '',
    role: 'sales',
    dealership_id: defaultDealershipId || '',
  });
  const [customRoles, setCustomRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Update form when defaultDealershipId changes
  const currentDealershipId = defaultDealershipId || '';
  useEffect(() => {
    if (currentDealershipId !== form.dealership_id) {
      setForm((prev) => ({ ...prev, dealership_id: currentDealershipId }));
    }
  }, [currentDealershipId, form.dealership_id]);

  // Fetch custom roles when dealership changes
  useEffect(() => {
    const fetchRoles = async () => {
      if (form.dealership_id) {
        try {
          const res = await api.get(`/dealerships/${form.dealership_id}/roles`);
          setCustomRoles(res.data.custom_roles || []);
        } catch (err) {
          console.error('Failed to fetch roles:', err);
        }
      }
    };
    fetchRoles();
  }, [form.dealership_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate PIN
    if (!/^\d{4,6}$/.test(form.pin)) {
      toast.error('PIN must be 4-6 digits');
      return;
    }

    setLoading(true);
    await onSubmit(form);
    setLoading(false);
    setForm({ name: '', pin: '', role: 'sales', dealership_id: currentDealershipId });
  };

  const allRoles = [
    ...STANDARD_ROLES,
    ...customRoles.map(r => ({ id: r.toLowerCase().replace(/\s+/g, '_'), name: r }))
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#111113] border-[#1f1f23]" data-testid="add-user-modal">
        <DialogHeader>
          <DialogTitle className="text-white">Add New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Full Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Smith"
                required
                className="pl-10 bg-white/5 border-white/10 text-white"
                data-testid="add-user-name"
              />
            </div>
            <p className="text-xs text-slate-500">This is how they&apos;ll sign in - name must be unique</p>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">PIN (4-6 digits) *</Label>
            <div className="relative">
              <Input
                type={showPin ? 'text' : 'password'}
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                placeholder="••••••"
                required
                className="bg-white/5 border-white/10 text-white text-center text-xl tracking-[0.3em] font-mono"
                maxLength={6}
                data-testid="add-user-pin"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500">User will sign in with name + PIN</p>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Role *</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="add-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111113] border-[#1f1f23]">
                {allRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isOwner && (
            <div className="space-y-2">
              <Label className="text-slate-300">Dealership *</Label>
              <Select
                value={form.dealership_id}
                onValueChange={(v) => setForm({ ...form, dealership_id: v })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="add-user-dealership">
                  <SelectValue placeholder="Select dealership" />
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
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1 border-white/20 text-white hover:bg-white/10" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 btn-primary"
              disabled={loading || !form.name || form.pin.length < 4 || (!isOwner && !form.dealership_id)}
              data-testid="add-user-submit"
            >
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default Users;
