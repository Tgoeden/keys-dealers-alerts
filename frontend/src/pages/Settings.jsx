import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { dealershipApi, alertApi } from '../lib/api';
import { Layout } from '../components/layout/Layout';
import {
  Settings as SettingsIcon,
  Upload,
  Palette,
  Clock,
  Save,
  Image,
  Check,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';

const PRESET_COLORS = [
  { name: 'Cyan', primary: '#22d3ee', secondary: '#0891b2' },
  { name: 'Blue', primary: '#3b82f6', secondary: '#1d4ed8' },
  { name: 'Purple', primary: '#a855f7', secondary: '#7c3aed' },
  { name: 'Pink', primary: '#ec4899', secondary: '#db2777' },
  { name: 'Red', primary: '#ef4444', secondary: '#dc2626' },
  { name: 'Orange', primary: '#f97316', secondary: '#ea580c' },
  { name: 'Amber', primary: '#f59e0b', secondary: '#d97706' },
  { name: 'Green', primary: '#22c55e', secondary: '#16a34a' },
];

const Settings = () => {
  const { user, isDealershipAdmin, isOwner } = useAuth();
  const [dealership, setDealership] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    logo_url: '',
    primary_color: '#22d3ee',
    secondary_color: '#0891b2',
    alert_minutes: 30,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dealershipRes, alertsRes] = await Promise.all([
        dealershipApi.getAll(),
        alertApi.getAll(),
      ]);
      
      if (dealershipRes.data.length > 0) {
        const d = dealershipRes.data[0];
        setDealership(d);
        // Load saved settings from localStorage for now
        const savedSettings = localStorage.getItem(`keyflow_settings_${d.id}`);
        if (savedSettings) {
          setForm({ ...form, ...JSON.parse(savedSettings) });
        }
      }
      
      if (alertsRes.data.length > 0) {
        setAlerts(alertsRes.data);
        setForm(f => ({ ...f, alert_minutes: alertsRes.data[0].alert_minutes }));
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save settings to localStorage (would be backend in production)
      if (dealership) {
        localStorage.setItem(`keyflow_settings_${dealership.id}`, JSON.stringify({
          logo_url: form.logo_url,
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
        }));
      }
      
      // Update alert if exists
      if (alerts.length > 0) {
        await alertApi.update(alerts[0].id, form.alert_minutes, true);
      } else if (dealership) {
        await alertApi.create({
          dealership_id: dealership.id,
          alert_minutes: form.alert_minutes,
          is_active: true,
        });
      }
      
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleColorSelect = (color) => {
    setForm({
      ...form,
      primary_color: color.primary,
      secondary_color: color.secondary,
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white/5 rounded w-48" />
            <div className="h-64 bg-white/5 rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6" data-testid="settings-page">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Settings
          </h1>
          <p className="text-slate-400 mt-1">
            Customize your dealership branding and preferences
          </p>
        </div>

        {/* Branding Section */}
        <Card className="bg-[#111113] border-[#1f1f23]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Palette className="w-5 h-5 text-cyan-400" />
              Branding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Upload */}
            <div className="space-y-3">
              <Label className="text-slate-300">Dealership Logo</Label>
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center overflow-hidden">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Image className="w-8 h-8 text-slate-500" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    value={form.logo_url}
                    onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                    placeholder="Enter logo URL..."
                    className="bg-white/5 border-white/10 text-white"
                    data-testid="logo-url-input"
                  />
                  <p className="text-xs text-slate-500">
                    Enter the URL of your dealership logo image
                  </p>
                </div>
              </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-3">
              <Label className="text-slate-300">Brand Colors</Label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => handleColorSelect(color)}
                    className={`w-full aspect-square rounded-xl transition-all ${
                      form.primary_color === color.primary
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111113]'
                        : 'hover:scale-105'
                    }`}
                    style={{ background: `linear-gradient(135deg, ${color.primary}, ${color.secondary})` }}
                    title={color.name}
                    data-testid={`color-${color.name.toLowerCase()}`}
                  >
                    {form.primary_color === color.primary && (
                      <Check className="w-5 h-5 text-white mx-auto" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-4 mt-4">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs text-slate-500">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg"
                      style={{ backgroundColor: form.primary_color }}
                    />
                    <Input
                      value={form.primary_color}
                      onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                      className="bg-white/5 border-white/10 text-white font-mono text-sm"
                      data-testid="primary-color-input"
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs text-slate-500">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg"
                      style={{ backgroundColor: form.secondary_color }}
                    />
                    <Input
                      value={form.secondary_color}
                      onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                      className="bg-white/5 border-white/10 text-white font-mono text-sm"
                      data-testid="secondary-color-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alert Settings */}
        <Card className="bg-[#111113] border-[#1f1f23]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Clock className="w-5 h-5 text-amber-400" />
              Key Alert Threshold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label className="text-slate-300">Alert after key is checked out for (minutes)</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min="5"
                  max="1440"
                  value={form.alert_minutes}
                  onChange={(e) => setForm({ ...form, alert_minutes: parseInt(e.target.value) || 30 })}
                  className="w-32 bg-white/5 border-white/10 text-white text-center"
                  data-testid="alert-minutes-input"
                />
                <span className="text-slate-400">minutes</span>
              </div>
              <p className="text-xs text-slate-500">
                Keys checked out longer than this will show in the "Overdue" section
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-8"
            data-testid="save-settings-btn"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
