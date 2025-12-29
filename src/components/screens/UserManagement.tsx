import React, { useState } from 'react';
import { 
  UsersIcon, 
  PlusIcon, 
  ChevronLeftIcon,
  XIcon,
  UserIcon,
  CheckIcon,
  LockIcon,
  TrashIcon,
  AlertCircleIcon
} from '../ui/Icons';
import type { Dealership, User, UserRole } from '@/types';

interface UserManagementProps {
  dealership: Dealership;
  users: User[];
  onBack: () => void;
  onCreateUser: (data: Partial<User>) => Promise<boolean>;
  onToggleActive: (userId: string, isActive: boolean) => Promise<boolean>;
  onDeleteUser: (userId: string) => Promise<boolean>;
  loading: boolean;
  logoUrl: string;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  dealership,
  users,
  onBack,
  onCreateUser,
  onToggleActive,
  onDeleteUser,
  loading,
  logoUrl
}) => {

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    pin_hash: '',
    role: 'USER' as UserRole
  });

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      username: '',
      pin_hash: '',
      role: 'USER'
    });
  };

  const handleCreate = async () => {
    const success = await onCreateUser(formData);
    if (success) {
      setShowCreateModal(false);
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    const success = await onDeleteUser(showDeleteConfirm.id);
    if (success) {
      setShowDeleteConfirm(null);
    }
  };

  const activeUsers = users.filter(u => u.is_active);
  const inactiveUsers = users.filter(u => !u.is_active);

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: dealership.secondary_color }}>
      {/* Header with Dealership Branding */}
      <header 
        className="sticky top-0 z-40 shadow-lg"
        style={{ backgroundColor: dealership.primary_color }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-white/80 hover:text-white">
            <ChevronLeftIcon size={24} />
          </button>
          <img 
            src={dealership.logo_url || logoUrl} 
            alt={dealership.name} 
            className="w-10 h-10 rounded-xl bg-white/20 object-contain"
          />
          <div className="flex-1">
            <h1 className="text-white font-bold">{dealership.name}</h1>
            <p className="text-white/70 text-xs">User Management • {users.length} users</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white"
          >
            <PlusIcon size={20} />
          </button>
        </div>
      </header>


      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Active Users */}
        <div>
          <h2 className="text-white/80 font-semibold mb-3 flex items-center gap-2">
            <CheckIcon className="text-green-400" size={18} />
            Active Users ({activeUsers.length})
          </h2>
          <div className="space-y-3">
            {activeUsers.map(user => (
              <div
                key={user.id}
                className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      user.role === 'ADMIN' ? 'bg-purple-500/20' : 'bg-blue-500/20'
                    }`}>
                      <UserIcon className={user.role === 'ADMIN' ? 'text-purple-400' : 'text-blue-400'} size={20} />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-white/60 text-sm flex items-center gap-2">
                        @{user.username}
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          user.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {user.role}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleActive(user.id, false)}
                    disabled={loading}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-lg transition-colors"
                  >
                    Disable
                  </button>
                </div>
              </div>
            ))}
            {activeUsers.length === 0 && (
              <div className="text-center py-8 text-white/60">
                <p>No active users</p>
              </div>
            )}
          </div>
        </div>

        {/* Inactive Users */}
        {inactiveUsers.length > 0 && (
          <div>
            <h2 className="text-white/80 font-semibold mb-3 flex items-center gap-2">
              <LockIcon className="text-gray-400" size={18} />
              Disabled Users ({inactiveUsers.length})
            </h2>
            <div className="space-y-3">
              {inactiveUsers.map(user => (
                <div
                  key={user.id}
                  className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/5 opacity-75"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center">
                        <UserIcon className="text-gray-400" size={20} />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-white/60 text-sm">@{user.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onToggleActive(user.id, true)}
                        disabled={loading}
                        className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-medium rounded-lg transition-colors"
                      >
                        Enable
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(user)}
                        disabled={loading}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                        title="Delete User Permanently"
                      >
                        <TrashIcon size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Add New User</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-white/60 hover:text-white">
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm mb-1">First Name *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  placeholder="jdoe"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">PIN *</label>
                <input
                  type="password"
                  value={formData.pin_hash}
                  onChange={(e) => setFormData({ ...formData, pin_hash: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center tracking-widest"
                  placeholder="1234"
                  maxLength={6}
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Role *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'USER' })}
                    className={`flex-1 py-2 rounded-lg ${
                      formData.role === 'USER' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'
                    }`}
                  >
                    User
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'ADMIN' })}
                    className={`flex-1 py-2 rounded-lg ${
                      formData.role === 'ADMIN' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/60'
                    }`}
                  >
                    Admin
                  </button>
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
                disabled={!formData.first_name || !formData.last_name || !formData.username || !formData.pin_hash || loading}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md">
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircleIcon className="text-red-400" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Delete User</h2>
                <p className="text-white/60 text-sm">This action cannot be undone</p>
              </div>
            </div>
            <div className="p-4">
              <p className="text-white/80">
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold text-white">
                  {showDeleteConfirm.first_name} {showDeleteConfirm.last_name}
                </span>{' '}
                (@{showDeleteConfirm.username})?
              </p>
              <p className="text-red-400/80 text-sm mt-2">
                This will remove all their data and cannot be recovered.
              </p>
            </div>
            <div className="p-4 border-t border-white/10 flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2"
              >
                <TrashIcon size={18} />
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
