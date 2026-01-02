import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { bayApi, keyApi, dealershipApi } from '../lib/api';
import { Layout } from '../components/layout/Layout';
import {
  Wrench,
  Truck,
  ArrowRight,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const ServiceBays = () => {
  const { user, isOwner } = useAuth();
  const [dealerships, setDealerships] = useState([]);
  const [selectedDealership, setSelectedDealership] = useState('');
  const [bays, setBays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => {
    fetchDealerships();
  }, []);

  useEffect(() => {
    if (selectedDealership) {
      fetchBays();
    }
  }, [selectedDealership]);

  const fetchDealerships = async () => {
    try {
      const res = await dealershipApi.getAll();
      const rvDealerships = res.data.filter((d) => d.dealership_type === 'rv');
      setDealerships(rvDealerships);
      if (rvDealerships.length > 0) {
        setSelectedDealership(rvDealerships[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch dealerships:', err);
    }
  };

  const fetchBays = async () => {
    setLoading(true);
    try {
      const res = await bayApi.getAll(selectedDealership);
      setBays(res.data);
    } catch (err) {
      console.error('Failed to fetch bays:', err);
      setBays([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveBay = async (newBay) => {
    if (!selectedKey) return;
    try {
      await keyApi.moveBay(selectedKey.id, newBay);
      toast.success(`Unit moved to Bay ${newBay}`);
      setShowMoveModal(false);
      setSelectedKey(null);
      fetchBays();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to move unit');
    }
  };

  const handleReturn = async (keyData) => {
    try {
      await keyApi.return(keyData.id, {});
      toast.success('Key returned successfully');
      fetchBays();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to return key');
    }
  };

  const currentDealership = dealerships.find((d) => d.id === selectedDealership);

  if (dealerships.length === 0 && !loading) {
    return (
      <Layout>
        <div className="p-6 lg:p-10">
          <div className="text-center py-16">
            <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No RV Dealerships</h3>
            <p className="text-slate-500 mt-1">
              Service bays are only available for RV dealerships
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 lg:p-10 space-y-6" data-testid="service-bays-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              Service Bays
            </h1>
            <p className="text-slate-500 mt-1">
              Track RV units in service bays
            </p>
          </div>
          {isOwner && dealerships.length > 1 && (
            <Select value={selectedDealership} onValueChange={setSelectedDealership}>
              <SelectTrigger className="w-64" data-testid="bay-dealership-select">
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
        </div>

        {/* Bay Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-mono text-slate-900">
                {currentDealership?.service_bays || 0}
              </p>
              <p className="text-sm text-slate-500">Total Bays</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-mono text-emerald-600">
                {bays.filter((b) => !b.is_occupied).length}
              </p>
              <p className="text-sm text-slate-500">Available</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-mono text-amber-600">
                {bays.filter((b) => b.is_occupied).length}
              </p>
              <p className="text-sm text-slate-500">Occupied</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-mono text-blue-600">
                {Math.round((bays.filter((b) => b.is_occupied).length / (bays.length || 1)) * 100)}%
              </p>
              <p className="text-sm text-slate-500">Utilization</p>
            </CardContent>
          </Card>
        </div>

        {/* Bay Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-slate-400" />
              Bay Layout
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : bays.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500">No service bays configured</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {bays.map((bay) => (
                  <BaySlot
                    key={bay.bay_number}
                    bay={bay}
                    onMove={(key) => {
                      setSelectedKey(key);
                      setShowMoveModal(true);
                    }}
                    onReturn={handleReturn}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Move Modal */}
      <MoveBayModal
        open={showMoveModal}
        onClose={() => {
          setShowMoveModal(false);
          setSelectedKey(null);
        }}
        keyData={selectedKey}
        bays={bays}
        onSubmit={handleMoveBay}
      />
    </Layout>
  );
};

const BaySlot = ({ bay, onMove, onReturn }) => {
  const { is_occupied, bay_number, key: keyData } = bay;

  return (
    <div
      className={`bay-slot ${is_occupied ? 'occupied' : ''}`}
      data-testid={`bay-${bay_number}`}
    >
      <span className={`text-2xl font-bold font-mono ${is_occupied ? 'text-blue-600' : 'text-slate-300'}`}>
        {bay_number}
      </span>
      
      {is_occupied && keyData ? (
        <div className="w-full px-2 mt-2 space-y-2">
          <div className="text-center">
            <p className="text-xs font-mono font-semibold text-slate-900 truncate">
              #{keyData.stock_number}
            </p>
            <p className="text-xs text-slate-500 truncate">{keyData.vehicle_model}</p>
          </div>
          <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            {keyData.current_checkout && (
              <span>
                {formatDistanceToNow(new Date(keyData.current_checkout.checked_out_at), { addSuffix: false })}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => onMove(keyData)}
              data-testid={`move-bay-${bay_number}`}
            >
              <ArrowRight className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-7 text-xs text-emerald-600"
              onClick={() => onReturn(keyData)}
              data-testid={`return-bay-${bay_number}`}
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <Badge variant="outline" className="mt-2 text-xs">
          Empty
        </Badge>
      )}
    </div>
  );
};

const MoveBayModal = ({ open, onClose, keyData, bays, onSubmit }) => {
  const [newBay, setNewBay] = useState('');

  const availableBays = bays.filter((b) => !b.is_occupied || b.key?.id === keyData?.id);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newBay) {
      onSubmit(parseInt(newBay));
    }
  };

  if (!keyData) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="move-bay-modal">
        <DialogHeader>
          <DialogTitle>Move Unit to New Bay</DialogTitle>
        </DialogHeader>
        <div className="mb-4 p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center gap-3">
            <Truck className="w-8 h-8 text-amber-600" />
            <div>
              <p className="font-mono font-semibold">#{keyData.stock_number}</p>
              <p className="text-sm text-slate-600">{keyData.vehicle_model}</p>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Currently in Bay {keyData.current_checkout?.service_bay}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Move to Bay</label>
            <Select value={newBay} onValueChange={setNewBay}>
              <SelectTrigger data-testid="new-bay-select">
                <SelectValue placeholder="Select new bay" />
              </SelectTrigger>
              <SelectContent>
                {availableBays.map((b) => (
                  <SelectItem
                    key={b.bay_number}
                    value={String(b.bay_number)}
                    disabled={b.bay_number === keyData.current_checkout?.service_bay}
                  >
                    Bay {b.bay_number} {b.is_occupied && b.key?.id !== keyData.id ? '(Occupied)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!newBay} data-testid="confirm-move-bay">
              Move Unit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceBays;
