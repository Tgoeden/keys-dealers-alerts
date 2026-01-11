import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { dealershipApi, alertApi, authApi } from '../lib/api';
import { Layout } from '../components/layout/Layout';
import {
  Settings as SettingsIcon,
  Upload,
  Palette,
  Clock,
  Save,
  Image,
  Check,
  AlertCircle,
  Lock,
  Users,
  Plus,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import api from '../lib/api';

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

const STANDARD_ROLES = [
  { id: 'sales', name: 'Sales' },
  { id: 'service', name: 'Service' },
  { id: 'delivery', name: 'Delivery' },
  { id: 'porter', name: 'Porter' },
  { id: 'lot_tech', name: 'Lot Tech' },
];

const Settings = () => {
  const { user, isDealershipAdmin, isOwner, isDemo } = useAuth();
  const [dealership, setDealership] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const [showPinChange, setShowPinChange] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  
  const [form, setForm] = useState({
    logo_url: '',
    primary_color: '#22d3ee',
    secondary_color: '#0891b2',
    alert_minutes: 30,
  });

  const [pinForm, setPinForm] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: '',
  });
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [savingPin, setSavingPin] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const dealershipRes = await dealershipApi.getAll();
      
      if (dealershipRes.data.length > 0) {
        const d = dealershipRes.data[0];
        setDealership(d);
        setCustomRoles(d.custom_roles || []);
        // Load settings from dealership data
        setForm({
          logo_url: d.logo_url || '',
          primary_color: d.primary_color || '#22d3ee',
          secondary_color: d.secondary_color || '#0891b2',
          alert_minutes: 30, // Default, will be overridden by alerts
        });
      }
      
      try {
        const alertsRes = await alertApi.getAll();
        if (alertsRes.data.length > 0) {
          setAlerts(alertsRes.data);
          setForm(f => ({ ...f, alert_minutes: alertsRes.data[0].alert_minutes }));
        }
      } catch (alertErr) {
        // Alerts endpoint might not exist yet, that's ok
        console.log('Alerts not available');
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!dealership) {
      toast.error('No dealership found');
      return;
    }

    setSaving(true);
    try {
      // Update dealership with branding settings
      await dealershipApi.update(dealership.id, {
        logo_url: form.logo_url || null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
      });
      
      // Update local state
      setDealership({
        ...dealership,
        logo_url: form.logo_url,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
      });
      
      // Update alert if exists
      try {
        if (alerts.length > 0) {
          await alertApi.update(alerts[0].id, form.alert_minutes, true);
        } else if (dealership) {
          await alertApi.create({
            dealership_id: dealership.id,
            alert_minutes: form.alert_minutes,
            is_active: true,
          });
        }
      } catch (alertErr) {
        console.log('Alert save skipped');
      }
      
      toast.success('Settings saved successfully');
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePinChange = async (e) => {
    e.preventDefault();
    
    if (pinForm.newPin !== pinForm.confirmPin) {
      toast.error('New PINs do not match');
      return;
    }
    
    if (pinForm.newPin.length < 4 || pinForm.newPin.length > 6) {
      toast.error('PIN must be 4-6 digits');
      return;
    }
    
    if (!/^\d+$/.test(pinForm.newPin)) {
      toast.error('PIN must contain only numbers');
      return;
    }

    setSavingPin(true);
    try {
      if (isDealershipAdmin) {
        await authApi.changeAdminPin(pinForm.currentPin, pinForm.newPin);
      } else {
        await authApi.changePin(pinForm.currentPin, pinForm.newPin);
      }
      toast.success('PIN changed successfully');
      setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      setShowPinChange(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change PIN');
    } finally {
      setSavingPin(false);
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;
    
    // Check if role already exists
    const existingStandard = STANDARD_ROLES.find(r => r.name.toLowerCase() === newRoleName.toLowerCase());
    const existingCustom = customRoles.find(r => r.toLowerCase() === newRoleName.toLowerCase());
    
    if (existingStandard || existingCustom) {
      toast.error('This role already exists');
      return;
    }

    try {
      await api.post(`/dealerships/${dealership.id}/roles`, { name: newRoleName.trim() });
      setCustomRoles([...customRoles, newRoleName.trim()]);
      setNewRoleName('');
      toast.success(`Role "${newRoleName}" added`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add role');
    }
  };

  const handleRemoveRole = async (roleName) => {
    if (!window.confirm(`Remove the "${roleName}" role?`)) return;

    try {
      await api.delete(`/dealerships/${dealership.id}/roles/${encodeURIComponent(roleName)}`);
      setCustomRoles(customRoles.filter(r => r !== roleName));
      toast.success(`Role "${roleName}" removed`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove role');
    }
  };

  const handleColorSelect = (color) => {
    setForm({
      ...form,
      primary_color: color.primary,
      secondary_color: color.secondary,
    });
  };

  const handleLogoUrlChange = (url) => {
    setForm({ ...form, logo_url: url });
    setLogoPreviewError(false);
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

  if (!dealership) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white">No Dealership Found</h3>
            <p className="text-slate-500 mt-1">
              Please contact your administrator to set up a dealership.
            </p>
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
          {dealership && (
            <p className="text-sm text-cyan-400 mt-2">
              {dealership.name}
            </p>
          )}
        </div>

        {/* Demo Warning */}
        {isDemo && (
          <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-300">Demo Mode</p>
              <p className="text-xs text-amber-400/70">
                Settings changes will be saved but reset when you log out of demo mode
              </p>
            </div>
          </div>
        )}

        {/* PIN Management Section */}
        {(isDealershipAdmin || user?.role) && (
          <Card className="bg-[#111113] border-[#1f1f23]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Lock className="w-5 h-5 text-cyan-400" />
                PIN Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!showPinChange ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Your login PIN</p>
                    <p className="text-xs text-slate-500">Change your PIN for secure access</p>
                  </div>
                  <Button
                    onClick={() => setShowPinChange(true)}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                    data-testid="change-pin-btn"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Change PIN
                  </Button>
                </div>
              ) : (
                <form onSubmit={handlePinChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Current PIN</Label>
                    <div className="relative">
                      <Input
                        type={showCurrentPin ? 'text' : 'password'}
                        value={pinForm.currentPin}
                        onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                        placeholder="••••••"
                        className="bg-white/5 border-white/10 text-white text-center text-xl tracking-[0.3em] font-mono"
                        maxLength={6}
                        data-testid="current-pin-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPin(!showCurrentPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      >
                        {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">New PIN (4-6 digits)</Label>
                    <div className="relative">
                      <Input
                        type={showNewPin ? 'text' : 'password'}
                        value={pinForm.newPin}
                        onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                        placeholder="••••••"
                        className="bg-white/5 border-white/10 text-white text-center text-xl tracking-[0.3em] font-mono"
                        maxLength={6}
                        data-testid="new-pin-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPin(!showNewPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      >
                        {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Confirm New PIN</Label>
                    <Input
                      type="password"
                      value={pinForm.confirmPin}
                      onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      placeholder="••••••"
                      className="bg-white/5 border-white/10 text-white text-center text-xl tracking-[0.3em] font-mono"
                      maxLength={6}
                      data-testid="confirm-pin-input"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPinChange(false);
                        setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
                      }}
                      className="flex-1 border-white/20 text-white hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={savingPin || pinForm.newPin.length < 4 || pinForm.newPin !== pinForm.confirmPin}
                      className="flex-1 btn-primary"
                      data-testid="save-pin-btn"
                    >
                      {savingPin ? 'Saving...' : 'Save PIN'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* User Roles Section (Admin only) */}
        {(isDealershipAdmin || isOwner) && (
          <Card className="bg-[#111113] border-[#1f1f23]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="w-5 h-5 text-cyan-400" />
                User Roles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-400">
                Manage the roles available when creating users
              </p>
              
              {/* Standard Roles */}
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Standard Roles (cannot be removed)</Label>
                <div className="flex flex-wrap gap-2">
                  {STANDARD_ROLES.map((role) => (
                    <Badge 
                      key={role.id} 
                      className="bg-slate-700/50 text-slate-300 border-slate-600"
                    >
                      {role.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Custom Roles */}
              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Custom Roles</Label>
                <div className="flex flex-wrap gap-2">
                  {customRoles.length === 0 ? (
                    <p className="text-xs text-slate-500">No custom roles added</p>
                  ) : (
                    customRoles.map((role) => (
                      <Badge 
                        key={role} 
                        className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 pr-1"
                      >
                        {role}
                        <button
                          onClick={() => handleRemoveRole(role)}
                          className="ml-2 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              {/* Add New Role */}
              <div className="flex gap-2">
                <Input
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="New role name..."
                  className="bg-white/5 border-white/10 text-white flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
                  data-testid="new-role-input"
                />
                <Button
                  onClick={handleAddRole}
                  disabled={!newRoleName.trim()}
                  className="btn-primary"
                  data-testid="add-role-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Role
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="w-24 h-24 rounded-xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {form.logo_url && !logoPreviewError ? (
                    <img 
                      src={form.logo_url} 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                      onError={() => setLogoPreviewError(true)}
                    />
                  ) : (
                    <Image className="w-8 h-8 text-slate-500" />
                  )}
                </div>
                <div className="flex-1 space-y-2 w-full">
                  <Input
                    value={form.logo_url}
                    onChange={(e) => handleLogoUrlChange(e.target.value)}
                    placeholder="https://example.com/your-logo.png"
                    className="bg-white/5 border-white/10 text-white"
                    data-testid="logo-url-input"
                  />
                  <p className="text-xs text-slate-500">
                    Enter the URL of your dealership logo image (PNG, JPG, or SVG recommended)
                  </p>
                  {logoPreviewError && form.logo_url && (
                    <p className="text-xs text-red-400">
                      Unable to load image. Please check the URL is correct and publicly accessible.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-3">
              <Label className="text-slate-300">Brand Colors</Label>
              <p className="text-xs text-slate-500 mb-2">
                Select a preset or enter custom hex colors below
              </p>
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
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs text-slate-500">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                      className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                    />
                    <Input
                      value={form.primary_color}
                      onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                      className="bg-white/5 border-white/10 text-white font-mono text-sm flex-1"
                      data-testid="primary-color-input"
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs text-slate-500">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.secondary_color}
                      onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                      className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                    />
                    <Input
                      value={form.secondary_color}
                      onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
                      className="bg-white/5 border-white/10 text-white font-mono text-sm flex-1"
                      data-testid="secondary-color-input"
                    />
                  </div>
                </div>
              </div>
              
              {/* Color Preview */}
              <div className="mt-4 p-4 bg-white/5 rounded-xl">
                <Label className="text-xs text-slate-500 mb-3 block">Preview</Label>
                <div className="flex items-center gap-4">
                  <button
                    className="px-4 py-2 rounded-lg text-white font-medium transition-all"
                    style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color})` }}
                  >
                    Primary Button
                  </button>
                  <span className="text-sm" style={{ color: form.primary_color }}>
                    Accent Text
                  </span>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: form.secondary_color }}
                  />
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
              <Label className="text-slate-300">Alert after key is checked out for</Label>
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
                Keys checked out longer than this will be flagged as overdue. Default is 30 minutes.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pb-8">
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
