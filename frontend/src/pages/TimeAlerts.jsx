import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { alertApi, dealershipApi } from '../lib/api';
import { Layout } from '../components/layout/Layout';
import {
  Clock,
  Plus,
  Bell,
  AlertTriangle,
  Settings,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
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

const TimeAlerts = () => {
  const { user, isOwner, isDealershipAdmin } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [dealerships, setDealerships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alertsRes, dealershipsRes] = await Promise.all([
        alertApi.getAll(),
        dealershipApi.getAll(),
      ]);
      setAlerts(alertsRes.data);
      setDealerships(dealershipsRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlert = async (data) => {
    try {
      await alertApi.create(data);
      toast.success('Time alert created');
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create alert');
    }
  };

  const handleToggleAlert = async (alert) => {
    try {
      await alertApi.update(alert.id, alert.alert_minutes, !alert.is_active);
      toast.success(`Alert ${alert.is_active ? 'disabled' : 'enabled'}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update alert');
    }
  };

  const handleUpdateMinutes = async (alert, minutes) => {
    try {
      await alertApi.update(alert.id, minutes, alert.is_active);
      toast.success('Alert threshold updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to update alert');
    }
  };

  const getDealershipName = (id) => {
    return dealerships.find((d) => d.id === id)?.name || 'Unknown';
  };

  // Filter dealerships that don't have alerts yet
  const dealershipsWithoutAlerts = dealerships.filter(
    (d) => !alerts.some((a) => a.dealership_id === d.id)
  );

  return (
    <Layout>
      <div className="p-6 lg:p-10 space-y-6" data-testid="time-alerts-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
              Time Alerts
            </h1>
            <p className="text-slate-500 mt-1">
              Set alerts for keys checked out too long
            </p>
          </div>
          {dealershipsWithoutAlerts.length > 0 && (
            <Button onClick={() => setShowAddModal(true)} data-testid="add-alert-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Alert
            </Button>
          )}
        </div>

        {/* Info Card */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">How Time Alerts Work</p>
                <p className="text-sm text-amber-700 mt-1">
                  When a key is checked out longer than the configured threshold, it will appear in the "Overdue Keys" section on the dashboard. This helps track keys that need to be returned.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No alerts configured</h3>
            <p className="text-slate-500 mt-1">
              Set up time alerts to track overdue keys
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {alerts.map((alert) => (
              <Card key={alert.id} data-testid={`alert-card-${alert.dealership_id}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        alert.is_active ? 'bg-blue-100' : 'bg-slate-100'
                      }`}>
                        <Bell className={`w-6 h-6 ${alert.is_active ? 'text-blue-600' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {getDealershipName(alert.dealership_id)}
                        </p>
                        <p className="text-sm text-slate-500">
                          Alert after {alert.alert_minutes} minutes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="5"
                          max="1440"
                          value={alert.alert_minutes}
                          onChange={(e) => handleUpdateMinutes(alert, parseInt(e.target.value))}
                          className="w-20 text-center"
                          data-testid={`alert-minutes-${alert.dealership_id}`}
                        />
                        <span className="text-sm text-slate-500">min</span>
                      </div>
                      <Switch
                        checked={alert.is_active}
                        onCheckedChange={() => handleToggleAlert(alert)}
                        data-testid={`alert-toggle-${alert.dealership_id}`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Preset Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="w-4 h-4 text-slate-400" />
              Suggested Presets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <PresetCard label="Test Drive" minutes={30} icon="🚗" />
              <PresetCard label="Service Loaner" minutes={480} icon="🔧" />
              <PresetCard label="Extended Drive" minutes={120} icon="🛣️" />
              <PresetCard label="Show/Move" minutes={15} icon="📍" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Alert Modal */}
      <AddAlertModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddAlert}
        dealerships={dealershipsWithoutAlerts}
      />
    </Layout>
  );
};

const PresetCard = ({ label, minutes, icon }) => (
  <div className="p-4 bg-slate-50 rounded-xl text-center">
    <span className="text-2xl">{icon}</span>
    <p className="font-medium text-slate-900 mt-2">{label}</p>
    <p className="text-sm text-slate-500">{minutes} min</p>
  </div>
);

const AddAlertModal = ({ open, onClose, onSubmit, dealerships }) => {
  const [form, setForm] = useState({
    dealership_id: '',
    alert_minutes: 30,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      dealership_id: form.dealership_id,
      alert_minutes: parseInt(form.alert_minutes),
      is_active: true,
    });
    setLoading(false);
    setForm({ dealership_id: '', alert_minutes: 30 });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="add-alert-modal">
        <DialogHeader>
          <DialogTitle>Add Time Alert</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Dealership *</Label>
            <Select
              value={form.dealership_id}
              onValueChange={(v) => setForm({ ...form, dealership_id: v })}
            >
              <SelectTrigger data-testid="alert-dealership">
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
          <div className="space-y-2">
            <Label>Alert After (minutes) *</Label>
            <Input
              type="number"
              min="5"
              max="1440"
              value={form.alert_minutes}
              onChange={(e) => setForm({ ...form, alert_minutes: e.target.value })}
              data-testid="alert-minutes-input"
            />
            <p className="text-xs text-slate-500">
              Keys checked out longer than this will show as overdue
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || !form.dealership_id}
              data-testid="alert-submit"
            >
              {loading ? 'Creating...' : 'Create Alert'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TimeAlerts;
