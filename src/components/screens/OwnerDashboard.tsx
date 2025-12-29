import React, { useState } from 'react';
import { 
  BuildingIcon, 
  PlusIcon, 
  LogOutIcon, 
  EditIcon, 
  TrashIcon,
  CarIcon,
  TruckIcon,
  LockIcon,
  UnlockIcon,
  XIcon,
  CheckIcon,
  ShareIcon,
  CopyIcon
} from '../ui/Icons';
import type { Dealership, DealerType } from '@/types';

interface OwnerDashboardProps {
  dealerships: Dealership[];
  onCreateDealership: (data: Partial<Dealership>) => Promise<boolean>;
  onUpdateDealership: (id: string, data: Partial<Dealership>) => Promise<boolean>;
  onToggleSuspension: (id: string, isSuspended: boolean) => Promise<boolean>;
  onDeleteDealership: (id: string) => Promise<boolean>;
  onLogout: () => void;
  loading: boolean;
  logoUrl: string;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  dealerships,
  onCreateDealership,
  onUpdateDealership,
  onToggleSuspension,
  onDeleteDealership,
  onLogout,
  loading,
  logoUrl
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Dealership | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showTypeChangeConfirm, setShowTypeChangeConfirm] = useState<{id: string, newType: DealerType} | null>(null);
  const [showShareModal, setShowShareModal] = useState<Dealership | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    dealer_type: 'AUTO' as DealerType,
    admin_pin_hash: '',
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF',
    alert_yellow_minutes: 30,
    alert_red_minutes: 60
  });

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      dealer_type: 'AUTO',
      admin_pin_hash: '',
      primary_color: '#3B82F6',
      secondary_color: '#1E40AF',
      alert_yellow_minutes: 30,
      alert_red_minutes: 60
    });
  };

  const handleCreate = async () => {
    const success = await onCreateDealership(formData);
    if (success) {
      setShowCreateModal(false);
      resetForm();
    }
  };

  const handleEdit = (dealership: Dealership) => {
    setFormData({
      name: dealership.name,
      code: dealership.code,
      dealer_type: dealership.dealer_type,
      admin_pin_hash: '',
      primary_color: dealership.primary_color,
      secondary_color: dealership.secondary_color,
      alert_yellow_minutes: dealership.alert_yellow_minutes,
      alert_red_minutes: dealership.alert_red_minutes
    });
    setShowEditModal(dealership);
  };

  const handleUpdate = async () => {
    if (!showEditModal) return;
    const updates: Partial<Dealership> = {
      name: formData.name,
      primary_color: formData.primary_color,
      secondary_color: formData.secondary_color,
      alert_yellow_minutes: formData.alert_yellow_minutes,
      alert_red_minutes: formData.alert_red_minutes
    };
    if (formData.admin_pin_hash) {
      updates.admin_pin_hash = formData.admin_pin_hash;
    }
    const success = await onUpdateDealership(showEditModal.id, updates);
    if (success) {
      setShowEditModal(null);
      resetForm();
    }
  };

  const handleTypeChange = async () => {
    if (!showTypeChangeConfirm) return;
    await onUpdateDealership(showTypeChangeConfirm.id, { dealer_type: showTypeChangeConfirm.newType });
    setShowTypeChangeConfirm(null);
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    await onDeleteDealership(showDeleteConfirm);
    setShowDeleteConfirm(null);
  };

  // Get the base URL of the app
  const getBaseUrl = () => {
    return window.location.origin + window.location.pathname;
  };

  // Generate share URL for admin access
  const getAdminShareUrl = (dealership: Dealership) => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}?code=${dealership.code}&role=admin`;
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Share via Web Share API
  const handleShareAdmin = async (dealership: Dealership) => {
    const url = getAdminShareUrl(dealership);
    const title = `KeyFlow Admin - ${dealership.name}`;
    const text = `You've been granted admin access to ${dealership.name} on KeyFlow!\n\nOpen this link in Safari (iPhone) or Chrome (Android) to access the admin dashboard.\n\nDealership Code: ${dealership.code}\n\nAfter opening, tap the share button and select "Add to Home Screen" to install the app.`;

    // Check if Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback: copy to clipboard
      await copyToClipboard(url, `admin-${dealership.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="KeyFlow" className="w-10 h-10 rounded-xl" />
            <div>
              <h1 className="text-white font-bold">KeyFlow</h1>
              <p className="text-purple-300 text-xs">Owner Dashboard</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <LogOutIcon size={20} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/60 text-sm">Total Dealerships</p>
            <p className="text-3xl font-bold text-white">{dealerships.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/60 text-sm">Auto Dealers</p>
            <p className="text-3xl font-bold text-blue-400">
              {dealerships.filter(d => d.dealer_type === 'AUTO').length}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/60 text-sm">RV Dealers</p>
            <p className="text-3xl font-bold text-green-400">
              {dealerships.filter(d => d.dealer_type === 'RV').length}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/60 text-sm">Suspended</p>
            <p className="text-3xl font-bold text-red-400">
              {dealerships.filter(d => d.is_suspended).length}
            </p>
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full md:w-auto mb-6 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <PlusIcon size={20} />
          Create New Dealership
        </button>

        {/* Dealerships List */}
        <div className="space-y-4">
          {dealerships.map(dealership => (
            <div
              key={dealership.id}
              className={`bg-white/10 backdrop-blur rounded-xl p-4 border-l-4 ${
                dealership.is_suspended ? 'border-red-500 opacity-60' : 'border-transparent'
              }`}
              style={{ borderLeftColor: dealership.is_suspended ? undefined : dealership.primary_color }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: dealership.primary_color }}
                  >
                    {dealership.dealer_type === 'AUTO' ? (
                      <CarIcon className="text-white" size={24} />
                    ) : (
                      <TruckIcon className="text-white" size={24} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      {dealership.name}
                      {dealership.is_suspended && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded-full">
                          Suspended
                        </span>
                      )}
                    </h3>
                    <p className="text-white/60 text-sm">
                      Code: <span className="font-mono">{dealership.code}</span>
                      <span className="mx-2">•</span>
                      <span className={dealership.dealer_type === 'AUTO' ? 'text-blue-400' : 'text-green-400'}>
                        {dealership.dealer_type}
                      </span>
                    </p>
                    <p className="text-white/40 text-xs mt-1">
                      Alerts: Yellow at {dealership.alert_yellow_minutes}min, Red at {dealership.alert_red_minutes}min
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Share Admin Access */}
                  <button
                    onClick={() => setShowShareModal(dealership)}
                    className="px-3 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition-colors flex items-center gap-2"
                    title="Share Admin Access"
                  >
                    <ShareIcon size={18} />
                    <span className="text-sm hidden sm:inline">Share</span>
                  </button>

                  {/* Type Toggle */}
                  <button
                    onClick={() => setShowTypeChangeConfirm({
                      id: dealership.id,
                      newType: dealership.dealer_type === 'AUTO' ? 'RV' : 'AUTO'
                    })}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 text-sm transition-colors"
                  >
                    Switch to {dealership.dealer_type === 'AUTO' ? 'RV' : 'AUTO'}
                  </button>

                  {/* Suspend/Unsuspend */}
                  <button
                    onClick={() => onToggleSuspension(dealership.id, !dealership.is_suspended)}
                    className={`p-2 rounded-lg transition-colors ${
                      dealership.is_suspended 
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                    }`}
                    title={dealership.is_suspended ? 'Unsuspend' : 'Suspend'}
                  >
                    {dealership.is_suspended ? <UnlockIcon size={18} /> : <LockIcon size={18} />}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(dealership)}
                    className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
                  >
                    <EditIcon size={18} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setShowDeleteConfirm(dealership.id)}
                    className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {dealerships.length === 0 && (
            <div className="text-center py-12 text-white/60">
              <BuildingIcon className="mx-auto mb-4 opacity-50" size={48} />
              <p>No dealerships yet. Create your first one!</p>
            </div>
          )}
        </div>
      </main>

      {/* Share Admin Access Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Share Admin Access</h2>
              <button onClick={() => setShowShareModal(null)} className="text-white/60 hover:text-white">
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: showShareModal.primary_color }}
                >
                  {showShareModal.dealer_type === 'AUTO' ? (
                    <CarIcon className="text-white" size={20} />
                  ) : (
                    <TruckIcon className="text-white" size={20} />
                  )}
                </div>
                <div>
                  <p className="text-white font-medium">{showShareModal.name}</p>
                  <p className="text-white/60 text-sm">Code: {showShareModal.code}</p>
                </div>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <p className="text-purple-300 text-sm mb-2 font-medium">Admin Login Credentials</p>
                <p className="text-white/80 text-sm">
                  After sharing, provide the admin with:
                </p>
                <ul className="text-white/60 text-sm mt-2 space-y-1">
                  <li>• Dealership Code: <span className="font-mono text-white">{showShareModal.code}</span></li>
                  <li>• Admin PIN: <span className="text-yellow-400">(the PIN you set)</span></li>
                </ul>
              </div>

              <div>
                <p className="text-white/60 text-sm mb-2">Share URL:</p>
                <div className="bg-black/30 rounded-lg p-3">
                  <p className="text-white font-mono text-sm break-all">{getAdminShareUrl(showShareModal)}</p>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-300 text-sm font-medium mb-2">Instructions for Admin</p>
                <ol className="text-white/70 text-sm list-decimal list-inside space-y-1">
                  <li>Open link in Safari (iPhone) or Chrome (Android)</li>
                  <li>Enter dealership code and admin PIN</li>
                  <li>Tap Share → "Add to Home Screen"</li>
                </ol>
              </div>
            </div>
            <div className="p-4 border-t border-white/10 flex gap-2">
              <button
                onClick={() => copyToClipboard(getAdminShareUrl(showShareModal), `admin-${showShareModal.id}`)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center justify-center gap-2"
              >
                {copied === `admin-${showShareModal.id}` ? (
                  <>
                    <CheckIcon size={18} className="text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <CopyIcon size={18} />
                    Copy Link
                  </>
                )}
              </button>
              <button
                onClick={() => handleShareAdmin(showShareModal)}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-2"
              >
                <ShareIcon size={18} />
                {shareSuccess ? 'Shared!' : 'Share'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Create Dealership</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-white/60 hover:text-white">
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-white/80 text-sm mb-1">Dealership Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  placeholder="Metro Auto Sales"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white uppercase"
                  placeholder="METRO"
                  maxLength={20}
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Type *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, dealer_type: 'AUTO' })}
                    className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 ${
                      formData.dealer_type === 'AUTO' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    <CarIcon size={18} /> AUTO
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, dealer_type: 'RV' })}
                    className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 ${
                      formData.dealer_type === 'RV' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    <TruckIcon size={18} /> RV
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Admin PIN *</label>
                <input
                  type="password"
                  value={formData.admin_pin_hash}
                  onChange={(e) => setFormData({ ...formData, admin_pin_hash: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center tracking-widest"
                  placeholder="1234"
                  maxLength={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm mb-1">Yellow Alert (min)</label>
                  <input
                    type="number"
                    value={formData.alert_yellow_minutes}
                    onChange={(e) => setFormData({ ...formData, alert_yellow_minutes: parseInt(e.target.value) || 30 })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-1">Red Alert (min)</label>
                  <input
                    type="number"
                    value={formData.alert_red_minutes}
                    onChange={(e) => setFormData({ ...formData, alert_red_minutes: parseInt(e.target.value) || 60 })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm mb-1">Primary Color</label>
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-1">Secondary Color</label>
                  <input
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-white/10 flex gap-2">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!formData.name || !formData.code || !formData.admin_pin_hash || loading}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Edit Dealership</h2>
              <button onClick={() => { setShowEditModal(null); resetForm(); }} className="text-white/60 hover:text-white">
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-white/80 text-sm mb-1">Dealership Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">New Admin PIN (leave blank to keep current)</label>
                <input
                  type="password"
                  value={formData.admin_pin_hash}
                  onChange={(e) => setFormData({ ...formData, admin_pin_hash: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center tracking-widest"
                  placeholder="••••"
                  maxLength={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm mb-1">Yellow Alert (min)</label>
                  <input
                    type="number"
                    value={formData.alert_yellow_minutes}
                    onChange={(e) => setFormData({ ...formData, alert_yellow_minutes: parseInt(e.target.value) || 30 })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-1">Red Alert (min)</label>
                  <input
                    type="number"
                    value={formData.alert_red_minutes}
                    onChange={(e) => setFormData({ ...formData, alert_red_minutes: parseInt(e.target.value) || 60 })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm mb-1">Primary Color</label>
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-1">Secondary Color</label>
                  <input
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-white/10 flex gap-2">
              <button
                onClick={() => { setShowEditModal(null); resetForm(); }}
                className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Type Change Confirmation */}
      {showTypeChangeConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Change Dealer Type?</h3>
            <p className="text-white/60 text-sm mb-4">
              Changing from {showTypeChangeConfirm.newType === 'RV' ? 'AUTO to RV' : 'RV to AUTO'} will affect available status options.
              {showTypeChangeConfirm.newType === 'RV' && (
                <span className="block mt-2 text-yellow-400">
                  Note: Extended Test Drive and Service Loaner statuses will no longer be available.
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTypeChangeConfirm(null)}
                className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleTypeChange}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Dealership?</h3>
            <p className="text-white/60 text-sm mb-4">
              This will permanently delete the dealership and all associated data including keys, users, and logs.
              This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
