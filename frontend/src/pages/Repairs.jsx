import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { Layout } from '../components/layout/Layout';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Image,
  Trash2,
  X,
  Car,
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
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import api from '../lib/api';

const Repairs = () => {
  const { user, isOwner, isDealershipAdmin } = useAuth();
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, fixed, all
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);

  useEffect(() => {
    fetchRepairs();
  }, [filter]);

  const fetchRepairs = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await api.get('/repair-requests', { params });
      setRepairs(res.data);
    } catch (err) {
      console.error('Failed to fetch repairs:', err);
      toast.error('Failed to load repair requests');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkFixed = async (keyId) => {
    try {
      await api.post(`/keys/${keyId}/mark-fixed`, { notes: 'Marked as fixed' });
      toast.success('Marked as fixed');
      fetchRepairs();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to mark as fixed');
    }
  };

  const handleClearRepair = async (repairId) => {
    if (!window.confirm('Are you sure you want to clear this repair log? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/repair-requests/${repairId}`);
      toast.success('Repair log cleared');
      fetchRepairs();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to clear repair log');
    }
  };

  const openImages = (images) => {
    setSelectedImages(images);
    setShowImageModal(true);
  };

  const pendingCount = repairs.filter(r => r.status === 'pending').length;
  const fixedCount = repairs.filter(r => r.status === 'fixed').length;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6" data-testid="repairs-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Needs Attention
            </h1>
            <p className="text-slate-400 mt-1">
              Units flagged for repair or inspection
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className={`bg-[#111113] border-[#1f1f23] cursor-pointer transition-all ${filter === 'pending' ? 'ring-2 ring-red-500' : ''}`} onClick={() => setFilter('pending')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingCount}</p>
                <p className="text-xs text-slate-500">Needs Attention</p>
              </div>
            </CardContent>
          </Card>
          <Card className={`bg-[#111113] border-[#1f1f23] cursor-pointer transition-all ${filter === 'fixed' ? 'ring-2 ring-emerald-500' : ''}`} onClick={() => setFilter('fixed')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{fixedCount}</p>
                <p className="text-xs text-slate-500">Fixed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {['pending', 'fixed', 'all'].map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className={filter === f ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-[#1f1f23] text-slate-400'}
            >
              {f === 'pending' ? 'Needs Attention' : f === 'fixed' ? 'Fixed' : 'All'}
            </Button>
          ))}
        </div>

        {/* Repairs List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : repairs.length === 0 ? (
          <Card className="bg-[#111113] border-[#1f1f23]">
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-emerald-500/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                {filter === 'pending' ? 'All Clear!' : 'No Records'}
              </h3>
              <p className="text-slate-500">
                {filter === 'pending' 
                  ? 'No units currently need attention'
                  : filter === 'fixed'
                  ? 'No fixed repair records'
                  : 'No repair requests found'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {repairs.map((repair) => (
              <Card 
                key={repair.id} 
                className={`bg-[#111113] border-l-4 ${repair.status === 'pending' ? 'border-l-red-500' : 'border-l-emerald-500'} border-[#1f1f23]`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left - Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={repair.status === 'pending' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}>
                          {repair.status === 'pending' ? (
                            <><AlertTriangle className="w-3 h-3 mr-1" /> Needs Attention</>
                          ) : (
                            <><CheckCircle className="w-3 h-3 mr-1" /> Fixed</>
                          )}
                        </Badge>
                        <span className="text-lg font-bold text-white">#{repair.stock_number}</span>
                      </div>
                      <p className="text-slate-300">{repair.vehicle_info}</p>
                      <p className="text-sm text-slate-400 mt-2">{repair.notes}</p>
                      
                      {/* Images */}
                      {repair.images && repair.images.length > 0 && (
                        <button
                          onClick={() => openImages(repair.images)}
                          className="flex items-center gap-2 mt-3 text-sm text-cyan-400 hover:text-cyan-300"
                        >
                          <Image className="w-4 h-4" />
                          View {repair.images.length} photo{repair.images.length > 1 ? 's' : ''}
                        </button>
                      )}
                      
                      {/* Meta */}
                      <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Reported by {repair.reported_by_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(repair.reported_at), { addSuffix: true })}
                        </span>
                        {repair.fixed_by_name && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle className="w-3 h-3" />
                            Fixed by {repair.fixed_by_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right - Actions */}
                    <div className="flex items-center gap-2">
                      {repair.status === 'pending' && (
                        <Button
                          onClick={() => handleMarkFixed(repair.key_id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark Fixed
                        </Button>
                      )}
                      {(isOwner || isDealershipAdmin) && (
                        <Button
                          variant="ghost"
                          onClick={() => handleClearRepair(repair.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
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

      {/* Image Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Photos</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedImages.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`Repair photo ${idx + 1}`}
                className="w-full h-48 object-cover rounded-lg"
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Repairs;
