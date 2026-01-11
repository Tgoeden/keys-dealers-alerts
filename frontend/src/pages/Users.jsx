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
      u.email.toLowerCase().includes(searchLower)
    );
  });

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700';
      case 'dealership_admin':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const canAddUsers = !isDemo || (demoLimits?.can_add_users ?? true);

  return (
    <Layout>
      <div className="p-6 lg:p-10 space-y-6" data-testid="users-page">
        {/* Demo Limits Banner */}
        {isDemo && demoLimits && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Demo Mode: {demoLimits.current_users} / {demoLimits.max_users} additional users
              </p>
              <p className="text-xs text-amber-600">
                Upgrade to add unlimited team members
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              User Management
            </h1>
            <p className="text-slate-500 mt-1">
              Manage dealership staff and access
            </p>
          </div>
          <Button 
            onClick={() => setShowAddModal(true)} 
            disabled={!canAddUsers}
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
            <Select value={selectedDealership} onValueChange={setSelectedDealership}>
              <SelectTrigger className="w-full sm:w-64" data-testid="dealership-filter">
                <SelectValue placeholder="All Dealerships" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Dealerships</SelectItem>
                {dealerships.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="user-search"
            />
          </div>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <UsersIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No users found</h3>
            <p className="text-slate-500 mt-1">
              {search ? 'Try a different search term' : 'Add your first user to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((u) => (
              <Card key={u.id} className="card-hover" data-testid={`user-card-${u.email}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                        <span className="text-lg font-semibold text-slate-600">
                          {u.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{u.name}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Mail className="w-3 h-3" />
                          {u.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getRoleBadgeStyle(u.role)}>
                        {u.role?.replace('_', ' ')}
                      </Badge>
                      {u.id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 hover:text-red-600"
                          onClick={() => setDeleteUser(u)}
                          data-testid={`delete-user-${u.email}`}
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
        <AlertDialogContent data-testid="delete-user-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteUser?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
    email: '',
    password: '',
    role: 'user',
    dealership_id: defaultDealershipId || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm((prev) => ({ ...prev, dealership_id: defaultDealershipId || '' }));
  }, [defaultDealershipId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(form);
    setLoading(false);
    setForm({ name: '', email: '', password: '', role: 'user', dealership_id: defaultDealershipId || '' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="add-user-modal">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="John Smith"
              required
              data-testid="add-user-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="john@dealership.com"
              required
              data-testid="add-user-email"
            />
          </div>
          <div className="space-y-2">
            <Label>Password *</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
              data-testid="add-user-password"
            />
          </div>
          <div className="space-y-2">
            <Label>Role *</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger data-testid="add-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Sales Staff</SelectItem>
                <SelectItem value="dealership_admin">Dealership Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isOwner && (
            <div className="space-y-2">
              <Label>Dealership *</Label>
              <Select
                value={form.dealership_id}
                onValueChange={(v) => setForm({ ...form, dealership_id: v })}
              >
                <SelectTrigger data-testid="add-user-dealership">
                  <SelectValue placeholder="Select dealership" />
                </SelectTrigger>
                <SelectContent>
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
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || (!isOwner && !form.dealership_id)}
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
