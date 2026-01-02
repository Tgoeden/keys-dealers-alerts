import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { dealershipApi } from '../lib/api';
import { Layout } from '../components/layout/Layout';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Car,
  Truck,
  MapPin,
  Phone,
  Wrench,
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

const Dealerships = () => {
  const { isOwner } = useAuth();
  const [dealerships, setDealerships] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editDealership, setEditDealership] = useState(null);
  const [deleteDealership, setDeleteDealership] = useState(null);

  useEffect(() => {
    fetchDealerships();
  }, []);

  const fetchDealerships = async () => {
    setLoading(true);
    try {
      const res = await dealershipApi.getAll();
      setDealerships(res.data);
    } catch (err) {
      console.error('Failed to fetch dealerships:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDealership = async (data) => {
    try {
      await dealershipApi.create(data);
      toast.success('Dealership created successfully');
      setShowAddModal(false);
      fetchDealerships();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create dealership');
    }
  };

  const handleUpdateDealership = async (data) => {
    try {
      await dealershipApi.update(editDealership.id, data);
      toast.success('Dealership updated successfully');
      setEditDealership(null);
      fetchDealerships();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update dealership');
    }
  };

  const handleDeleteDealership = async () => {
    if (!deleteDealership) return;
    try {
      await dealershipApi.delete(deleteDealership.id);
      toast.success('Dealership deleted successfully');
      setDeleteDealership(null);
      fetchDealerships();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete dealership');
    }
  };

  const filteredDealerships = dealerships.filter((d) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(searchLower) ||
      d.address?.toLowerCase().includes(searchLower)
    );
  });

  if (!isOwner) {
    return (
      <Layout>
        <div className="p-6 lg:p-10">
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Access Denied</h3>
            <p className="text-slate-500 mt-1">
              Only owners can manage dealerships
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 lg:p-10 space-y-6" data-testid="dealerships-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              Dealerships
            </h1>
            <p className="text-slate-500 mt-1">
              Manage all dealership locations
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)} data-testid="add-dealership-btn">
            <Plus className="w-4 h-4 mr-2" />
            Add Dealership
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search dealerships..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="dealership-search"
          />
        </div>

        {/* Dealerships Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredDealerships.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No dealerships found</h3>
            <p className="text-slate-500 mt-1">
              {search ? 'Try a different search term' : 'Add your first dealership to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDealerships.map((d) => (
              <Card key={d.id} className="card-hover" data-testid={`dealership-card-${d.name}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      d.dealership_type === 'rv' ? 'bg-amber-100' : 'bg-blue-100'
                    }`}>
                      {d.dealership_type === 'rv' ? (
                        <Truck className={`w-6 h-6 ${d.dealership_type === 'rv' ? 'text-amber-600' : 'text-blue-600'}`} />
                      ) : (
                        <Car className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                    <Badge className={d.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                      {d.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{d.name}</h3>
                  
                  <div className="space-y-2 text-sm text-slate-500 mb-4">
                    {d.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{d.address}</span>
                      </div>
                    )}
                    {d.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{d.phone}</span>
                      </div>
                    )}
                    {d.dealership_type === 'rv' && d.service_bays > 0 && (
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        <span>{d.service_bays} Service Bays</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditDealership(d)}
                      data-testid={`edit-dealership-${d.name}`}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteDealership(d)}
                      data-testid={`delete-dealership-${d.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <DealershipModal
        open={showAddModal || !!editDealership}
        onClose={() => {
          setShowAddModal(false);
          setEditDealership(null);
        }}
        onSubmit={editDealership ? handleUpdateDealership : handleAddDealership}
        dealership={editDealership}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDealership} onOpenChange={() => setDeleteDealership(null)}>
        <AlertDialogContent data-testid="delete-dealership-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dealership</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteDealership?.name}? This will also remove all associated keys and users. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteDealership}
              data-testid="confirm-delete-dealership"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

const DealershipModal = ({ open, onClose, onSubmit, dealership }) => {
  const [form, setForm] = useState({
    name: '',
    dealership_type: 'automotive',
    address: '',
    phone: '',
    service_bays: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dealership) {
      setForm({
        name: dealership.name,
        dealership_type: dealership.dealership_type,
        address: dealership.address || '',
        phone: dealership.phone || '',
        service_bays: dealership.service_bays || 0,
      });
    } else {
      setForm({
        name: '',
        dealership_type: 'automotive',
        address: '',
        phone: '',
        service_bays: 0,
      });
    }
  }, [dealership]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      ...form,
      service_bays: parseInt(form.service_bays) || 0,
    });
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="dealership-modal">
        <DialogHeader>
          <DialogTitle>{dealership ? 'Edit' : 'Add'} Dealership</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Dealership Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="ABC Motors"
              required
              data-testid="dealership-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Type *</Label>
            <Select
              value={form.dealership_type}
              onValueChange={(v) => setForm({ ...form, dealership_type: v })}
            >
              <SelectTrigger data-testid="dealership-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automotive">Automotive</SelectItem>
                <SelectItem value="rv">RV Dealership</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="123 Main St, City, State"
              data-testid="dealership-address"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(555) 123-4567"
              data-testid="dealership-phone"
            />
          </div>
          {form.dealership_type === 'rv' && (
            <div className="space-y-2">
              <Label>Number of Service Bays</Label>
              <Input
                type="number"
                min="0"
                value={form.service_bays}
                onChange={(e) => setForm({ ...form, service_bays: e.target.value })}
                placeholder="10"
                data-testid="dealership-bays"
              />
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading} data-testid="dealership-submit">
              {loading ? 'Saving...' : dealership ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default Dealerships;
