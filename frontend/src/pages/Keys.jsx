import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { keyApi, dealershipApi } from '../lib/api';
import { Layout } from '../components/layout/Layout';
import {
  Key,
  Plus,
  Search,
  Clock,
  User,
  X,
  Check,
  Car,
  Truck,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const CHECKOUT_REASONS = [
  { value: 'test_drive', label: 'Test Drive' },
  { value: 'service_loaner', label: 'Service Loaner' },
  { value: 'extended_test_drive', label: 'Extended Test Drive' },
  { value: 'show_move', label: 'Show/Move' },
  { value: 'service', label: 'Service (RV)' },
];

const Keys = () => {
  const { user, isOwner, isDealershipAdmin } = useAuth();
  const [keys, setKeys] = useState([]);
  const [dealerships, setDealerships] = useState([]);
  const [selectedDealership, setSelectedDealership] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => {
    fetchDealerships();
  }, []);

  useEffect(() => {
    if (selectedDealership || !isOwner) {
      fetchKeys();
    }
  }, [selectedDealership, filter]);

  const fetchDealerships = async () => {
    try {
      const res = await dealershipApi.getAll();
      setDealerships(res.data);
      if (res.data.length > 0 && !isOwner) {
        setSelectedDealership(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch dealerships:', err);
    }
  };

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDealership) params.dealership_id = selectedDealership;
      if (filter !== 'all') params.status = filter;
      
      const res = await keyApi.getAll(params);
      setKeys(res.data);
    } catch (err) {
      console.error('Failed to fetch keys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (data) => {
    try {
      await keyApi.checkout(selectedKey.id, data);
      toast.success('Key checked out successfully');
      setShowCheckoutModal(false);
      setSelectedKey(null);
      fetchKeys();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to checkout key');
    }
  };

  const handleReturn = async (data) => {
    try {
      await keyApi.return(selectedKey.id, data);
      toast.success('Key returned successfully');
      setShowReturnModal(false);
      setSelectedKey(null);
      fetchKeys();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to return key');
    }
  };

  const handleAddKey = async (data) => {
    try {
      await keyApi.create({
        ...data,
        dealership_id: selectedDealership || dealerships[0]?.id,
      });
      toast.success('Key added successfully');
      setShowAddModal(false);
      fetchKeys();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add key');
    }
  };

  const filteredKeys = keys.filter((key) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      key.stock_number.toLowerCase().includes(searchLower) ||
      key.vehicle_model.toLowerCase().includes(searchLower) ||
      key.vehicle_vin?.toLowerCase().includes(searchLower)
    );
  });

  const currentDealership = dealerships.find((d) => d.id === selectedDealership);
  const isRV = currentDealership?.dealership_type === 'rv';

  return (
    <Layout>
      <div className="p-6 lg:p-10 space-y-6" data-testid="keys-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              Key Management
            </h1>
            <p className="text-slate-500 mt-1">
              Track and manage all vehicle keys
            </p>
          </div>
          {(isOwner || isDealershipAdmin) && (
            <Button onClick={() => setShowAddModal(true)} data-testid="add-key-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Key
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {isOwner && (
            <Select value={selectedDealership} onValueChange={setSelectedDealership}>
              <SelectTrigger className="w-full sm:w-64" data-testid="dealership-filter">
                <SelectValue placeholder="Select Dealership" />
              </SelectTrigger>
              <SelectContent>
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
              placeholder="Search by stock #, model, or VIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="key-search"
            />
          </div>

          <div className="flex gap-2">
            {['all', 'available', 'checked_out'].map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
                data-testid={`filter-${f}`}
              >
                {f === 'all' ? 'All' : f === 'available' ? 'Available' : 'Checked Out'}
              </Button>
            ))}
          </div>
        </div>

        {/* Keys Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="text-center py-16">
            <Key className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No keys found</h3>
            <p className="text-slate-500 mt-1">
              {search ? 'Try a different search term' : 'Add your first key to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredKeys.map((key) => (
              <KeyCard
                key={key.id}
                keyData={key}
                isRV={isRV}
                onCheckout={() => {
                  setSelectedKey(key);
                  setShowCheckoutModal(true);
                }}
                onReturn={() => {
                  setSelectedKey(key);
                  setShowReturnModal(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Key Modal */}
      <AddKeyModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddKey}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        open={showCheckoutModal}
        onClose={() => {
          setShowCheckoutModal(false);
          setSelectedKey(null);
        }}
        keyData={selectedKey}
        isRV={isRV}
        serviceBays={currentDealership?.service_bays || 0}
        onSubmit={handleCheckout}
      />

      {/* Return Modal */}
      <ReturnModal
        open={showReturnModal}
        onClose={() => {
          setShowReturnModal(false);
          setSelectedKey(null);
        }}
        keyData={selectedKey}
        onSubmit={handleReturn}
      />
    </Layout>
  );
};

const KeyCard = ({ keyData, isRV, onCheckout, onReturn }) => {
  const isCheckedOut = keyData.status === 'checked_out';
  const checkout = keyData.current_checkout;

  return (
    <div
      className={`key-card ${isCheckedOut ? 'checked-out' : 'available'}`}
      data-testid={`key-card-${keyData.stock_number}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isRV ? (
            <Truck className="w-5 h-5 text-slate-400" />
          ) : (
            <Car className="w-5 h-5 text-slate-400" />
          )}
          <span className="stock-number text-lg text-slate-900">
            #{keyData.stock_number}
          </span>
        </div>
        <Badge
          className={isCheckedOut ? 'status-checked-out' : 'status-available'}
        >
          {isCheckedOut ? 'Checked Out' : 'Available'}
        </Badge>
      </div>

      <p className="text-slate-700 font-medium">{keyData.vehicle_model}</p>
      {keyData.vehicle_year && (
        <p className="text-sm text-slate-500">{keyData.vehicle_year}</p>
      )}

      {isCheckedOut && checkout && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User className="w-4 h-4" />
            <span>{checkout.user_name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
            <Clock className="w-4 h-4" />
            <span>
              {formatDistanceToNow(new Date(checkout.checked_out_at), {
                addSuffix: true,
              })}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 capitalize">
            {checkout.reason?.replace('_', ' ')}
            {checkout.service_bay && ` • Bay ${checkout.service_bay}`}
          </p>
        </div>
      )}

      <div className="mt-4">
        {isCheckedOut ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={onReturn}
            data-testid={`return-key-${keyData.stock_number}`}
          >
            <Check className="w-4 h-4 mr-2" />
            Return Key
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={onCheckout}
            data-testid={`checkout-key-${keyData.stock_number}`}
          >
            <Key className="w-4 h-4 mr-2" />
            Check Out
          </Button>
        )}
      </div>
    </div>
  );
};

const AddKeyModal = ({ open, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    stock_number: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_vin: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      ...form,
      vehicle_year: form.vehicle_year ? parseInt(form.vehicle_year) : null,
    });
    setLoading(false);
    setForm({ stock_number: '', vehicle_model: '', vehicle_year: '', vehicle_vin: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="add-key-modal">
        <DialogHeader>
          <DialogTitle>Add New Key</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Stock Number *</Label>
            <Input
              value={form.stock_number}
              onChange={(e) => setForm({ ...form, stock_number: e.target.value })}
              placeholder="e.g., STK-12345"
              required
              data-testid="add-key-stock"
            />
          </div>
          <div className="space-y-2">
            <Label>Vehicle Model *</Label>
            <Input
              value={form.vehicle_model}
              onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })}
              placeholder="e.g., 2024 Ford F-150"
              required
              data-testid="add-key-model"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Year</Label>
              <Input
                type="number"
                value={form.vehicle_year}
                onChange={(e) => setForm({ ...form, vehicle_year: e.target.value })}
                placeholder="2024"
                data-testid="add-key-year"
              />
            </div>
            <div className="space-y-2">
              <Label>VIN</Label>
              <Input
                value={form.vehicle_vin}
                onChange={(e) => setForm({ ...form, vehicle_vin: e.target.value })}
                placeholder="1HGBH41JXMN..."
                data-testid="add-key-vin"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading} data-testid="add-key-submit">
              {loading ? 'Adding...' : 'Add Key'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const CheckoutModal = ({ open, onClose, keyData, isRV, serviceBays, onSubmit }) => {
  const [form, setForm] = useState({
    reason: '',
    notes: '',
    service_bay: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      reason: form.reason,
      notes: form.notes || null,
      service_bay: form.service_bay ? parseInt(form.service_bay) : null,
    });
    setLoading(false);
    setForm({ reason: '', notes: '', service_bay: '' });
  };

  if (!keyData) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="checkout-modal">
        <DialogHeader>
          <DialogTitle>Check Out Key</DialogTitle>
        </DialogHeader>
        <div className="mb-4 p-4 bg-slate-50 rounded-xl">
          <p className="font-mono font-semibold text-lg">#{keyData.stock_number}</p>
          <p className="text-slate-600">{keyData.vehicle_model}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
              <SelectTrigger data-testid="checkout-reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {CHECKOUT_REASONS.filter((r) => isRV || r.value !== 'service').map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isRV && form.reason === 'service' && serviceBays > 0 && (
            <div className="space-y-2">
              <Label>Service Bay</Label>
              <Select value={form.service_bay} onValueChange={(v) => setForm({ ...form, service_bay: v })}>
                <SelectTrigger data-testid="checkout-bay">
                  <SelectValue placeholder="Select bay" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: serviceBays }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      Bay {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Add any additional notes..."
              rows={3}
              data-testid="checkout-notes"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || !form.reason}
              data-testid="checkout-submit"
            >
              {loading ? 'Checking out...' : 'Check Out'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ReturnModal = ({ open, onClose, keyData, onSubmit }) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({ notes: notes || null });
    setLoading(false);
    setNotes('');
  };

  if (!keyData) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="return-modal">
        <DialogHeader>
          <DialogTitle>Return Key</DialogTitle>
        </DialogHeader>
        <div className="mb-4 p-4 bg-slate-50 rounded-xl">
          <p className="font-mono font-semibold text-lg">#{keyData.stock_number}</p>
          <p className="text-slate-600">{keyData.vehicle_model}</p>
          {keyData.current_checkout && (
            <p className="text-sm text-slate-500 mt-2">
              Checked out by {keyData.current_checkout.user_name}
            </p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about the return..."
              rows={3}
              data-testid="return-notes"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading} data-testid="return-submit">
              {loading ? 'Returning...' : 'Return Key'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default Keys;
