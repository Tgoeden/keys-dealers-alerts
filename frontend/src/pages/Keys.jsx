import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { keyApi, dealershipApi, authApi } from '../lib/api';
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
  AlertTriangle,
  Upload,
  FileText,
  MessageSquare,
  Download,
  ClipboardCheck,
  History,
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
import { formatDistanceToNow, format } from 'date-fns';

// PDI Status options
const PDI_STATUSES = [
  { value: 'not_pdi_yet', label: 'Not PDI Yet', color: 'bg-red-500', textColor: 'text-red-400', bgColor: 'bg-red-500/20' },
  { value: 'in_progress', label: 'PDI In Progress', color: 'bg-yellow-500', textColor: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  { value: 'finished', label: 'PDI Finished', color: 'bg-emerald-500', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
];

// Checkout reasons for AUTOMOTIVE dealerships
const AUTO_CHECKOUT_REASONS = [
  { value: 'test_drive', label: 'Test Drive' },
  { value: 'service_loaner', label: 'Service Loaner' },
  { value: 'extended_test_drive', label: 'Extended Test Drive' },
  { value: 'show_move', label: 'Show/Move' },
];

// Checkout reasons for RV dealerships (includes service bay option)
const RV_CHECKOUT_REASONS = [
  { value: 'test_drive', label: 'Test Drive' },
  { value: 'service_loaner', label: 'Service Loaner' },
  { value: 'extended_test_drive', label: 'Extended Test Drive' },
  { value: 'show_move', label: 'Show/Move' },
  { value: 'service', label: 'Service (Assign to Bay)' },
];

const Keys = () => {
  const { user, isOwner, isDealershipAdmin, isDemo } = useAuth();
  const [keys, setKeys] = useState([]);
  const [dealerships, setDealerships] = useState([]);
  const [selectedDealership, setSelectedDealership] = useState('');
  const [filter, setFilter] = useState('all');
  const [pdiFilter, setPdiFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showPDIModal, setShowPDIModal] = useState(false);
  const [showFlagAttentionModal, setShowFlagAttentionModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [demoLimits, setDemoLimits] = useState(null);

  useEffect(() => {
    fetchDealerships();
    if (isDemo) {
      fetchDemoLimits();
    }
  }, []);

  useEffect(() => {
    if (selectedDealership || !isOwner) {
      fetchKeys();
    }
  }, [selectedDealership, filter, pdiFilter]);

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
      if (pdiFilter !== 'all') params.pdi_status = pdiFilter;
      
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
      if (isDemo) fetchDemoLimits();
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
  const checkoutReasons = isRV ? RV_CHECKOUT_REASONS : AUTO_CHECKOUT_REASONS;
  const canAddKeys = !isDemo || (demoLimits?.can_add_keys ?? true);

  return (
    <Layout>
      <div className="space-y-6" data-testid="keys-page">
        {/* Demo Limits Banner */}
        {isDemo && demoLimits && (
          <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-300">
                Demo Mode: {demoLimits.current_keys} / {demoLimits.max_keys} keys used
              </p>
              <p className="text-xs text-amber-400/70">
                Upgrade to a full account to add unlimited keys
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Key Management
            </h1>
            <p className="text-slate-400 mt-1">
              Track and manage all vehicle keys
            </p>
          </div>
          {(isOwner || isDealershipAdmin) && (
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowImportModal(true)} 
                disabled={!canAddKeys}
                variant="outline"
                className="border-[#1f1f23] text-slate-300 hover:text-white hover:bg-white/5"
                data-testid="import-keys-btn"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
              <Button 
                onClick={() => setShowAddModal(true)} 
                disabled={!canAddKeys}
                className="btn-primary"
                data-testid="add-key-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Key
                {!canAddKeys && ' (Limit Reached)'}
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {isOwner && (
            <Select value={selectedDealership} onValueChange={setSelectedDealership}>
              <SelectTrigger className="w-full sm:w-64 bg-[#111113] border-[#1f1f23] text-white" data-testid="dealership-filter">
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

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search by stock #, model, or VIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-[#111113] border-[#1f1f23] text-white"
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
                className={filter === f ? 'btn-primary' : 'border-[#1f1f23] text-slate-400 hover:text-white hover:bg-white/5'}
                data-testid={`filter-${f}`}
              >
                {f === 'all' ? 'All' : f === 'available' ? 'Available' : 'Checked Out'}
              </Button>
            ))}
          </div>
        </div>

        {/* PDI Status Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-400 mr-2">PDI Status:</span>
          <Button
            variant={pdiFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPdiFilter('all')}
            className={pdiFilter === 'all' ? 'btn-primary' : 'border-[#1f1f23] text-slate-400 hover:text-white hover:bg-white/5'}
            data-testid="pdi-filter-all"
          >
            All
          </Button>
          {PDI_STATUSES.map((pdi) => (
            <Button
              key={pdi.value}
              variant={pdiFilter === pdi.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPdiFilter(pdi.value)}
              className={pdiFilter === pdi.value 
                ? `${pdi.bgColor} ${pdi.textColor} border-transparent hover:opacity-90` 
                : 'border-[#1f1f23] text-slate-400 hover:text-white hover:bg-white/5'}
              data-testid={`pdi-filter-${pdi.value}`}
            >
              <span className={`w-2 h-2 rounded-full ${pdi.color} mr-2`} />
              {pdi.label}
            </Button>
          ))}
        </div>

        {/* Keys Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="text-center py-16">
            <Key className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white">No keys found</h3>
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
                onViewNotes={() => {
                  setSelectedKey(key);
                  setShowNotesModal(true);
                }}
                onPDIClick={() => {
                  setSelectedKey(key);
                  setShowPDIModal(true);
                }}
                onPDIUpdate={fetchKeys}
                onFlagAttention={() => {
                  setSelectedKey(key);
                  setShowFlagAttentionModal(true);
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
        isRV={isRV}
      />

      {/* Import Keys Modal */}
      <ImportKeysModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false);
          fetchKeys();
        }}
        dealershipId={selectedDealership || user?.dealership_id}
      />

      {/* Notes Modal */}
      <NotesModal
        open={showNotesModal}
        onClose={() => {
          setShowNotesModal(false);
          setSelectedKey(null);
        }}
        keyData={selectedKey}
      />

      {/* PDI Status Modal */}
      <PDIStatusModal
        open={showPDIModal}
        onClose={() => {
          setShowPDIModal(false);
          setSelectedKey(null);
        }}
        keyData={selectedKey}
        onUpdate={() => {
          fetchKeys();
          setShowPDIModal(false);
          setSelectedKey(null);
        }}
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
        checkoutReasons={checkoutReasons}
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

// Helper to get PDI status info
const getPDIStatusInfo = (status) => {
  return PDI_STATUSES.find(s => s.value === status) || PDI_STATUSES[0];
};

const KeyCard = ({ keyData, isRV, onCheckout, onReturn, onViewNotes, onPDIClick, onPDIUpdate, onFlagAttention }) => {
  const isCheckedOut = keyData.status === 'checked_out';
  const checkout = keyData.current_checkout;
  const isNew = keyData.condition === 'new';
  const hasNotes = (keyData.notes_history && keyData.notes_history.length > 0) || 
                   (checkout && checkout.notes);
  const needsAttention = keyData.attention_status === 'needs_attention';
  const isFixed = keyData.attention_status === 'fixed';
  
  // PDI Status
  const pdiStatus = keyData.pdi_status || 'not_pdi_yet';
  const pdiInfo = getPDIStatusInfo(pdiStatus);
  const [showPDIDropdown, setShowPDIDropdown] = useState(false);
  const [updatingPDI, setUpdatingPDI] = useState(false);

  const handleQuickPDIUpdate = async (newStatus) => {
    if (newStatus === pdiStatus) {
      setShowPDIDropdown(false);
      return;
    }
    
    setUpdatingPDI(true);
    try {
      await keyApi.updatePDIStatus(keyData.id, newStatus, null);
      toast.success('PDI status updated');
      onPDIUpdate && onPDIUpdate();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update PDI status');
    } finally {
      setUpdatingPDI(false);
      setShowPDIDropdown(false);
    }
  };

  return (
    <div
      className={`key-card relative ${isCheckedOut ? 'checked-out' : 'available'} ${needsAttention ? 'ring-2 ring-red-500/50' : ''}`}
      data-testid={`key-card-${keyData.stock_number}`}
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          {isRV ? (
            <Truck className="w-5 h-5 text-slate-500 flex-shrink-0" />
          ) : (
            <Car className="w-5 h-5 text-slate-500 flex-shrink-0" />
          )}
          <span className="stock-number text-lg text-white whitespace-nowrap font-mono">
            #{keyData.stock_number}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end flex-shrink-0">
          {/* PDI Status - Simple text with color */}
          <button
            onClick={() => setShowPDIDropdown(!showPDIDropdown)}
            disabled={updatingPDI}
            className={`text-xs font-bold px-1.5 py-0.5 rounded transition-all hover:opacity-80 ${
              pdiStatus === 'not_pdi_yet' ? 'text-red-400 bg-red-500/10' :
              pdiStatus === 'in_progress' ? 'text-yellow-400 bg-yellow-500/10' :
              'text-emerald-400 bg-emerald-500/10'
            }`}
            data-testid={`pdi-badge-${keyData.stock_number}`}
          >
            {updatingPDI ? '...' : 'PDI'}
            <ChevronDown className="w-3 h-3 inline ml-0.5" />
          </button>
          
          {/* PDI Dropdown */}
          {showPDIDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowPDIDropdown(false)} />
              <div className="absolute right-0 top-8 z-20 bg-[#1a1a1d] border border-white/20 rounded-lg shadow-xl min-w-[140px] py-1">
                {PDI_STATUSES.map((pdi) => (
                  <button
                    key={pdi.value}
                    onClick={() => handleQuickPDIUpdate(pdi.value)}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-white/10 ${
                      pdiStatus === pdi.value ? 'bg-white/5' : ''
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${pdi.color}`} />
                    <span className={pdi.textColor}>{pdi.label}</span>
                    {pdiStatus === pdi.value && <Check className="w-3 h-3 ml-auto text-emerald-400" />}
                  </button>
                ))}
              </div>
            </>
          )}
          
          {needsAttention && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs px-1.5 py-0.5">
              <AlertTriangle className="w-3 h-3 mr-0.5" />
              Attn
            </Badge>
          )}
          {isFixed && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs px-1.5 py-0.5">
              Fixed
            </Badge>
          )}
          <Badge className={`text-xs px-1.5 py-0.5 ${isNew ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
            {isNew ? 'New' : 'Used'}
          </Badge>
          <Badge
            className={`text-xs px-1.5 py-0.5 ${isCheckedOut ? 'status-checked-out' : 'status-available'}`}
          >
            {isCheckedOut ? 'Out' : 'In'}
          </Badge>
        </div>
      </div>

      <p className="text-slate-200 font-medium text-sm">
        {keyData.vehicle_year} {keyData.vehicle_make} {keyData.vehicle_model}
      </p>
      {keyData.vehicle_vin && (
        <p className="text-xs text-slate-500 font-mono mt-1">VIN: {keyData.vehicle_vin}</p>
      )}

      {isCheckedOut && checkout && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <User className="w-4 h-4" />
            <span>{checkout.user_name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <Clock className="w-3 h-3" />
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

      {/* Notes Indicator */}
      {hasNotes && (
        <button
          onClick={onViewNotes}
          className="mt-2 flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          data-testid={`view-notes-${keyData.stock_number}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>View Notes ({keyData.notes_history?.length || (checkout?.notes ? 1 : 0)})</span>
        </button>
      )}

      {/* Images Indicator */}
      {keyData.images && keyData.images.length > 0 && (
        <div className="mt-2 flex gap-1">
          {keyData.images.map((img, idx) => (
            <img 
              key={idx}
              src={img} 
              alt={`Key ${idx + 1}`}
              className="w-8 h-8 object-cover rounded"
            />
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 space-y-2">
        {/* Flag Attention Button - always visible if not already flagged */}
        {!needsAttention && (
          <Button
            variant="outline"
            size="sm"
            className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
            onClick={onFlagAttention}
            data-testid={`flag-attention-${keyData.stock_number}`}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Flag Needs Attention
          </Button>
        )}
        
        {isCheckedOut ? (
          <Button
            variant="outline"
            className="w-full border-white/20 text-white hover:bg-white/10"
            onClick={onReturn}
            data-testid={`return-key-${keyData.stock_number}`}
          >
            <Check className="w-4 h-4 mr-2" />
            Return Key
          </Button>
        ) : (
          <Button
            className="w-full btn-success"
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

const AddKeyModal = ({ open, onClose, onSubmit, isRV }) => {
  const [form, setForm] = useState({
    stock_number: '',
    vehicle_year: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_vin: '',
    condition: 'new',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      stock_number: form.stock_number,
      vehicle_year: form.vehicle_year ? parseInt(form.vehicle_year) : null,
      vehicle_make: form.vehicle_make || null,
      vehicle_model: form.vehicle_model,
      vehicle_vin: form.vehicle_vin || null,
      condition: form.condition,
    });
    setLoading(false);
    setForm({ stock_number: '', vehicle_year: '', vehicle_make: '', vehicle_model: '', vehicle_vin: '', condition: 'new' });
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
          
          {/* Condition: New or Used */}
          <div className="space-y-2">
            <Label>Condition *</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, condition: 'new' })}
                className={`p-3 rounded-lg border-2 transition-all ${
                  form.condition === 'new'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                data-testid="condition-new"
              >
                <span className="font-semibold">New</span>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, condition: 'used' })}
                className={`p-3 rounded-lg border-2 transition-all ${
                  form.condition === 'used'
                    ? 'border-slate-500 bg-slate-50 text-slate-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                data-testid="condition-used"
              >
                <span className="font-semibold">Used</span>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
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
            <div className="space-y-2 col-span-2">
              <Label>Make</Label>
              <Input
                value={form.vehicle_make}
                onChange={(e) => setForm({ ...form, vehicle_make: e.target.value })}
                placeholder="e.g., Ford, Thor, Winnebago"
                data-testid="add-key-make"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Model *</Label>
            <Input
              value={form.vehicle_model}
              onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })}
              placeholder={isRV ? "e.g., Sunseeker, Minnie Winnie" : "e.g., F-150, Camry"}
              required
              data-testid="add-key-model"
            />
          </div>
          
          {/* VIN - Only show for Automotive dealerships */}
          {!isRV && (
            <div className="space-y-2">
              <Label>VIN (optional)</Label>
              <Input
                value={form.vehicle_vin}
                onChange={(e) => setForm({ ...form, vehicle_vin: e.target.value })}
                placeholder="1HGBH41JXMN..."
                data-testid="add-key-vin"
              />
            </div>
          )}
          
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

const CheckoutModal = ({ open, onClose, keyData, isRV, checkoutReasons, serviceBays, onSubmit }) => {
  const [form, setForm] = useState({
    reason: '',
    notes: '',
    service_bay: '',
    needs_attention: false,
  });
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Limit to 3 total images
    const remainingSlots = 3 - images.length;
    const filesToUpload = files.slice(0, remainingSlots);
    
    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of filesToUpload) {
        // Convert to base64 and upload
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
        
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/upload-image-base64`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('keyflow_token')}`
          },
          body: JSON.stringify({ image: base64 })
        });
        
        if (res.ok) {
          const data = await res.json();
          uploadedUrls.push(`${process.env.REACT_APP_BACKEND_URL}${data.url}`);
        }
      }
      setImages([...images, ...uploadedUrls]);
    } catch (err) {
      console.error('Image upload failed:', err);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (idx) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      reason: form.reason,
      notes: form.notes || null,
      service_bay: form.service_bay ? parseInt(form.service_bay) : null,
      needs_attention: form.needs_attention,
      images: form.needs_attention ? images : [],
    });
    setLoading(false);
    setForm({ reason: '', notes: '', service_bay: '', needs_attention: false });
    setImages([]);
  };

  if (!keyData) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="checkout-modal">
        <DialogHeader>
          <DialogTitle>Check Out Key</DialogTitle>
        </DialogHeader>
        <div className="mb-4 p-4 bg-slate-800/50 rounded-xl">
          <p className="font-mono font-semibold text-lg text-white">#{keyData.stock_number}</p>
          <p className="text-slate-400">{keyData.vehicle_year} {keyData.vehicle_make} {keyData.vehicle_model}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
              <SelectTrigger data-testid="checkout-reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {checkoutReasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isRV && form.reason === 'service' && serviceBays > 0 && (
            <div className="space-y-2">
              <Label>Service Bay *</Label>
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
            <Label>Notes {form.needs_attention ? '*' : '(optional)'}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={form.needs_attention ? "Describe what needs attention..." : "Add any additional notes..."}
              rows={3}
              data-testid="checkout-notes"
            />
          </div>

          {/* Needs Attention Toggle */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            form.needs_attention 
              ? 'bg-red-500/10 border-red-500/50' 
              : 'bg-white/5 border-white/10 hover:border-white/20'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-5 h-5 ${form.needs_attention ? 'text-red-400' : 'text-slate-500'}`} />
                <div>
                  <p className={`font-medium ${form.needs_attention ? 'text-red-400' : 'text-white'}`}>
                    Needs Attention
                  </p>
                  <p className="text-xs text-slate-500">Flag this unit for repair/service</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, needs_attention: !form.needs_attention })}
                className={`w-14 h-8 rounded-full transition-all ${
                  form.needs_attention ? 'bg-red-500' : 'bg-slate-600'
                }`}
                data-testid="needs-attention-toggle"
              >
                <div className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${
                  form.needs_attention ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Image Upload - Only show when needs attention is checked */}
            {form.needs_attention && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <Label className="text-sm text-slate-400 mb-2 block">
                  Attach Photos (optional, up to 3)
                </Label>
                
                {/* Image Preview */}
                {images.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={img} 
                          alt={`Upload ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {images.length < 3 && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      {uploading ? (
                        <>Uploading...</>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Add Photo
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className={`flex-1 ${form.needs_attention ? 'bg-red-600 hover:bg-red-500' : ''}`}
              disabled={loading || !form.reason || (form.needs_attention && !form.notes)}
              data-testid="checkout-submit"
            >
              {loading ? 'Checking out...' : form.needs_attention ? 'Check Out & Flag' : 'Check Out'}
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

// Import Keys Modal for CSV upload
const ImportKeysModal = ({ open, onClose, onSuccess, dealershipId }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      const parsed = [];

      for (let i = 0; i < lines.length && i < 10; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse CSV line (handle quotes if present)
        const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        
        // Skip header row if it looks like headers
        if (i === 0 && values[0]?.toLowerCase().includes('condition')) continue;

        if (values.length >= 2) {
          parsed.push({
            condition: values[0] || '',
            stock_number: values[1] || '',
            vehicle_year: values[2] ? parseInt(values[2]) : null,
            vehicle_make: values[3] || '',
            vehicle_model: values[4] || values[3] || '', // Fall back to make if model not provided
          });
        }
      }

      setPreview(parsed);
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file || !dealershipId) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const keys = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
          
          // Skip header row
          if (i === 0 && values[0]?.toLowerCase().includes('condition')) continue;

          if (values.length >= 2) {
            keys.push({
              condition: values[0] || 'used',
              stock_number: values[1] || '',
              vehicle_year: values[2] ? parseInt(values[2]) : null,
              vehicle_make: values[3] || '',
              vehicle_model: values[4] || values[3] || '',
            });
          }
        }

        const res = await keyApi.bulkImport({
          dealership_id: dealershipId,
          keys: keys,
        });

        setResult(res.data);
        
        if (res.data.imported > 0) {
          toast.success(`Successfully imported ${res.data.imported} keys`);
          if (res.data.errors?.length === 0) {
            onSuccess();
          }
        }
        
        if (res.data.errors?.length > 0) {
          toast.error(`${res.data.errors.length} errors occurred during import`);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const downloadTemplate = () => {
    const template = "Condition,Stock Number,Year,Make,Model\nNew,STK001,2024,Ford,F-150\nUsed,STK002,2022,Toyota,Camry\nNew,STK003,2024,Thor,Magnitude";
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keys_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" data-testid="import-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Keys from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="p-4 bg-slate-800/50 rounded-xl text-sm">
            <p className="text-slate-300 mb-2">CSV Format (one key per line):</p>
            <code className="block text-xs text-cyan-400 bg-slate-900/50 p-2 rounded">
              Condition, Stock Number, Year, Make, Model
            </code>
            <p className="text-slate-500 mt-2 text-xs">
              Example: New, STK001, 2024, Ford, F-150
            </p>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="text-cyan-400 p-0 h-auto mt-2"
              onClick={downloadTemplate}
            >
              <Download className="w-3 h-3 mr-1" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Select CSV File</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="bg-[#111113] border-[#1f1f23] text-white file:bg-slate-700 file:text-white file:border-0 file:mr-4 file:py-2 file:px-4 file:rounded-lg"
              data-testid="import-file-input"
            />
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <Label>Preview (first {preview.length} entries)</Label>
              <div className="max-h-40 overflow-y-auto bg-slate-900/50 rounded-lg p-2 text-xs">
                {preview.map((item, idx) => (
                  <div key={idx} className="flex gap-2 py-1 border-b border-slate-800 last:border-0">
                    <Badge className={item.condition?.toLowerCase() === 'new' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}>
                      {item.condition}
                    </Badge>
                    <span className="text-slate-300">#{item.stock_number}</span>
                    <span className="text-slate-500">
                      {item.vehicle_year} {item.vehicle_make} {item.vehicle_model}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-xl ${result.errors?.length > 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
              <p className="text-sm font-medium text-white">
                Import Complete: {result.imported} of {result.total_submitted} keys imported
              </p>
              {result.errors?.length > 0 && (
                <div className="mt-2 text-xs text-amber-400 max-h-24 overflow-y-auto">
                  {result.errors.map((err, idx) => (
                    <p key={idx}>Row {err.row}: {err.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result && (
              <Button 
                className="flex-1 btn-primary" 
                disabled={!file || loading || preview.length === 0}
                onClick={handleImport}
                data-testid="import-submit"
              >
                {loading ? 'Importing...' : `Import ${preview.length} Keys`}
              </Button>
            )}
            {result && result.errors?.length > 0 && (
              <Button 
                className="flex-1" 
                onClick={onSuccess}
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Notes History Modal
const NotesModal = ({ open, onClose, keyData }) => {
  if (!keyData) return null;

  const notesHistory = keyData.notes_history || [];
  const currentNote = keyData.current_checkout?.notes;

  // Combine current checkout note with history if not already included
  const allNotes = [...notesHistory];
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="notes-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Notes for #{keyData.stock_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            {keyData.vehicle_year} {keyData.vehicle_make} {keyData.vehicle_model}
          </p>

          {/* Current Checkout Note (if checked out and has note not in history) */}
          {keyData.status === 'checked_out' && currentNote && !notesHistory.find(n => n.note === currentNote) && (
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">Current Checkout</Badge>
                <span className="text-xs text-slate-500">{keyData.current_checkout?.user_name}</span>
              </div>
              <p className="text-sm text-slate-200">{currentNote}</p>
            </div>
          )}

          {/* Notes History */}
          {allNotes.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {allNotes.map((note, idx) => (
                <div key={idx} className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={note.action === 'checkout' ? 'bg-amber-500/20 text-amber-400 text-xs' : 'bg-emerald-500/20 text-emerald-400 text-xs'}>
                      {note.action === 'checkout' ? 'Check Out' : 'Return'}
                    </Badge>
                    <span className="text-xs text-slate-500">{note.user_name}</span>
                    {note.timestamp && (
                      <span className="text-xs text-slate-600">
                        {format(new Date(note.timestamp), 'MMM d, yyyy h:mm a')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300">{note.note}</p>
                </div>
              ))}
            </div>
          ) : (
            !currentNote && (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notes for this key</p>
              </div>
            )
          )}

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// PDI Status Modal with full details and audit history
const PDIStatusModal = ({ open, onClose, keyData, onUpdate }) => {
  const { user, isDealershipAdmin, isOwner } = useAuth();
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);

  useEffect(() => {
    if (keyData && open) {
      setStatus(keyData.pdi_status || 'not_pdi_yet');
      setNotes('');
      fetchAuditLog();
    }
  }, [keyData, open]);

  const fetchAuditLog = async () => {
    if (!keyData) return;
    setLoadingLog(true);
    try {
      const res = await keyApi.getPDIAuditLog(keyData.id);
      setAuditLog(res.data);
    } catch (err) {
      console.error('Failed to fetch PDI audit log:', err);
    } finally {
      setLoadingLog(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!keyData) return;
    
    // Don't submit if status hasn't changed
    if (status === keyData.pdi_status) {
      onClose();
      return;
    }
    
    setLoading(true);
    try {
      await keyApi.updatePDIStatus(keyData.id, status, notes || null);
      toast.success('PDI status updated');
      onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update PDI status');
    } finally {
      setLoading(false);
    }
  };

  if (!keyData) return null;

  const currentPdiInfo = getPDIStatusInfo(keyData.pdi_status || 'not_pdi_yet');
  const canViewFullHistory = isDealershipAdmin || isOwner;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="pdi-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-cyan-400" />
            PDI Status - #{keyData.stock_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Vehicle Info */}
          <div className="p-4 bg-slate-800/50 rounded-xl">
            <p className="font-medium text-white">
              {keyData.vehicle_year} {keyData.vehicle_make} {keyData.vehicle_model}
            </p>
            {keyData.vehicle_vin && (
              <p className="text-xs text-slate-500 font-mono mt-1">VIN: {keyData.vehicle_vin}</p>
            )}
          </div>

          {/* Current Status */}
          <div className="space-y-2">
            <Label className="text-slate-300">Current Status</Label>
            <div className="flex items-center gap-3">
              <Badge className={`${currentPdiInfo.bgColor} ${currentPdiInfo.textColor} text-sm px-3 py-1`}>
                <span className={`w-2 h-2 rounded-full ${currentPdiInfo.color} mr-2`} />
                {currentPdiInfo.label}
              </Badge>
              {keyData.pdi_last_updated_at && (
                <span className="text-xs text-slate-500">
                  by {keyData.pdi_last_updated_by_user_name} at {format(new Date(keyData.pdi_last_updated_at), 'MMM d, yyyy h:mm a')}
                </span>
              )}
            </div>
          </div>

          {/* Update Status Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Change Status</Label>
              <div className="grid grid-cols-3 gap-2">
                {PDI_STATUSES.map((pdi) => (
                  <button
                    key={pdi.value}
                    type="button"
                    onClick={() => setStatus(pdi.value)}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                      status === pdi.value 
                        ? `${pdi.bgColor} border-current ${pdi.textColor}` 
                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                    data-testid={`pdi-option-${pdi.value}`}
                  >
                    <span className={`w-4 h-4 rounded-full ${pdi.color}`} />
                    <span className="text-xs font-medium text-center leading-tight">{pdi.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this PDI status change..."
                rows={2}
                className="bg-white/5 border-white/10 text-white"
                data-testid="pdi-notes"
              />
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 btn-primary"
                disabled={loading || status === keyData.pdi_status}
                data-testid="pdi-submit"
              >
                {loading ? 'Updating...' : 'Update Status'}
              </Button>
            </div>
          </form>

          {/* Audit History */}
          {canViewFullHistory && (
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  PDI History
                </Label>
                {loadingLog && <span className="text-xs text-slate-500">Loading...</span>}
              </div>
              
              {auditLog.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {auditLog.map((log) => {
                    const prevInfo = getPDIStatusInfo(log.previous_status);
                    const newInfo = getPDIStatusInfo(log.new_status);
                    return (
                      <div key={log.id} className="p-2 bg-white/5 rounded-lg text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded ${prevInfo.bgColor} ${prevInfo.textColor}`}>
                            {prevInfo.label}
                          </span>
                          <span className="text-slate-500">→</span>
                          <span className={`px-2 py-0.5 rounded ${newInfo.bgColor} ${newInfo.textColor}`}>
                            {newInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-slate-500">
                          <span>{log.changed_by_user_name}</span>
                          <span>•</span>
                          <span>{format(new Date(log.changed_at), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                        {log.notes && (
                          <p className="mt-1 text-slate-400 italic">{log.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-2">No PDI history recorded yet</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Keys;
