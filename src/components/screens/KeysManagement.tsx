import React, { useState, useMemo, useRef } from 'react';
import { 
  KeyIcon, 
  PlusIcon, 
  SearchIcon, 
  ChevronLeftIcon,
  XIcon,
  ClockIcon,
  CheckIcon,
  EditIcon,
  TrashIcon,
  UserIcon,
  AlertCircleIcon,
  MapPinIcon,
  WrenchIcon,
  BoxIcon,
  MoveIcon,
  MoreHorizontalIcon,
  UploadIcon,
  FileTextIcon,
  InfoIcon,
  DownloadIcon
} from '../ui/Icons';
import type { Dealership, User, KeyWithCheckout, KeyUnit, KeyStatus, KeyCategory, CheckoutReason } from '@/types';
import { 
  AUTO_STATUSES, 
  RV_STATUSES, 
  getStatusLabel, 
  getStatusColor,
  AUTO_CHECKOUT_REASONS,
  RV_CHECKOUT_REASONS,
  getCheckoutReasonLabel,
  getCheckoutReasonColor,
  KEY_BOX_VALUE,
  getLocationLabel
} from '@/types';

interface KeysManagementProps {
  dealership: Dealership;
  user: User;
  keys: KeyWithCheckout[];
  users: User[];
  onBack: () => void;
  onCreateKey: (data: Partial<KeyUnit>) => Promise<boolean>;
  onUpdateKey: (id: string, data: Partial<KeyUnit>) => Promise<boolean>;
  onUpdateStatus: (id: string, status: KeyStatus) => Promise<boolean>;
  onDeleteKey: (id: string) => Promise<boolean>;
  onCheckout: (keyId: string, reason: CheckoutReason, bayNumber?: string) => Promise<boolean>;
  onReturn: (keyId: string) => Promise<boolean>;
  onUpdateLocation: (keyId: string, location: string) => Promise<boolean>;
  onSelectKey: (key: KeyWithCheckout) => void;
  loading: boolean;
  error?: string | null;
  onClearError?: () => void;
}

type FilterType = 'all' | 'available' | 'checked-out' | 'overdue' | 'sold' | 'deleted';
type CategoryFilter = 'all' | 'NEW' | 'USED';

interface ImportRow {
  stock_number: string;
  category: KeyCategory;
  year?: number;
  make?: string;
  model?: string;
  color?: string;
  isValid: boolean;
  error?: string;
}

export const KeysManagement: React.FC<KeysManagementProps> = ({
  dealership,
  user,
  keys,
  users,
  onBack,
  onCreateKey,
  onUpdateKey,
  onUpdateStatus,
  onDeleteKey,
  onCheckout,
  onReturn,
  onUpdateLocation,
  onSelectKey,
  loading,
  error,
  onClearError
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<KeyWithCheckout | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<KeyWithCheckout | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState<KeyWithCheckout | null>(null);
  const [showLocationModal, setShowLocationModal] = useState<KeyWithCheckout | null>(null);
  const [stockNumberError, setStockNumberError] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<CheckoutReason | null>(null);
  const [selectedBay, setSelectedBay] = useState<string>('');
  const [locationInput, setLocationInput] = useState<string>('');
  
  // Bulk Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    stock_number: '',
    category: 'NEW' as KeyCategory,
    year: '',
    make: '',
    model: '',
    color: ''
  });

  const isAdmin = user.role === 'ADMIN';
  const availableStatuses = dealership.dealer_type === 'AUTO' ? AUTO_STATUSES : RV_STATUSES;
  const checkoutReasons = dealership.dealer_type === 'AUTO' ? AUTO_CHECKOUT_REASONS : RV_CHECKOUT_REASONS;

  const resetForm = () => {
    setFormData({
      stock_number: '',
      category: 'NEW',
      year: '',
      make: '',
      model: '',
      color: ''
    });
    setStockNumberError(null);
    if (onClearError) onClearError();
  };

  const resetImport = () => {
    setImportData([]);
    setImportStep('upload');
    setImportProgress({ current: 0, total: 0, success: 0, failed: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Check for duplicate stock number in real-time
  const checkDuplicateStockNumber = (stockNumber: string) => {
    if (!stockNumber.trim()) {
      setStockNumberError(null);
      return;
    }
    
    const normalizedInput = stockNumber.toUpperCase().trim();
    const existingKey = keys.find(
      k => k.stock_number.toUpperCase() === normalizedInput && k.status !== 'DELETED'
    );
    
    if (existingKey) {
      setStockNumberError(`Stock number "${normalizedInput}" already exists`);
    } else {
      setStockNumberError(null);
    }
  };

  // Handle stock number change with validation
  const handleStockNumberChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setFormData({ ...formData, stock_number: upperValue });
    checkDuplicateStockNumber(upperValue);
  };

  // Parse CSV content
  const parseCSV = (content: string): ImportRow[] => {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length < 2) return [];

    // Parse header
    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Find column indices
    const stockIdx = headers.findIndex(h => h.includes('stock') || h === 'stock_number' || h === 'stocknumber');
    const categoryIdx = headers.findIndex(h => h.includes('category') || h.includes('type') || h === 'new_used');
    const yearIdx = headers.findIndex(h => h.includes('year'));
    const makeIdx = headers.findIndex(h => h.includes('make') || h.includes('brand'));
    const modelIdx = headers.findIndex(h => h.includes('model'));
    const colorIdx = headers.findIndex(h => h.includes('color') || h.includes('colour'));

    if (stockIdx === -1) {
      return [{
        stock_number: '',
        category: 'NEW',
        isValid: false,
        error: 'CSV must have a "stock_number" or "stock" column'
      }];
    }

    const existingStockNumbers = new Set(
      keys.filter(k => k.status !== 'DELETED').map(k => k.stock_number.toUpperCase())
    );
    const importedStockNumbers = new Set<string>();

    const rows: ImportRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      const stockNumber = (values[stockIdx] || '').toUpperCase().trim();
      
      if (!stockNumber) continue;

      let category: KeyCategory = 'NEW';
      if (categoryIdx !== -1) {
        const catValue = (values[categoryIdx] || '').toUpperCase().trim();
        if (catValue === 'USED' || catValue === 'U' || catValue === 'PRE-OWNED') {
          category = 'USED';
        }
      }

      const year = yearIdx !== -1 ? parseInt(values[yearIdx]) || undefined : undefined;
      const make = makeIdx !== -1 ? values[makeIdx]?.trim() : undefined;
      const model = modelIdx !== -1 ? values[modelIdx]?.trim() : undefined;
      const color = colorIdx !== -1 ? values[colorIdx]?.trim() : undefined;

      let isValid = true;
      let errorMsg: string | undefined;

      if (existingStockNumbers.has(stockNumber)) {
        isValid = false;
        errorMsg = 'Stock number already exists in system';
      } else if (importedStockNumbers.has(stockNumber)) {
        isValid = false;
        errorMsg = 'Duplicate stock number in import file';
      }

      importedStockNumbers.add(stockNumber);

      rows.push({
        stock_number: stockNumber,
        category,
        year,
        make,
        model,
        color,
        isValid,
        error: errorMsg
      });
    }

    return rows;
  };

  // Parse a single CSV line handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    
    return result;
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = parseCSV(content);
      setImportData(parsed);
      setImportStep('preview');
    };
    reader.readAsText(file);
  };

  // Execute bulk import
  const executeBulkImport = async () => {
    const validRows = importData.filter(row => row.isValid);
    if (validRows.length === 0) return;

    setImportStep('importing');
    setImportProgress({ current: 0, total: validRows.length, success: 0, failed: 0 });

    let success = 0;
    let failed = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      
      try {
        const result = await onCreateKey({
          stock_number: row.stock_number,
          category: row.category,
          year: row.year,
          make: row.make,
          model: row.model,
          color: row.color
        });

        if (result) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }

      setImportProgress({
        current: i + 1,
        total: validRows.length,
        success,
        failed
      });
    }

    setImportStep('complete');
  };

  // Download sample CSV template
  const downloadTemplate = () => {
    const template = `stock_number,category,year,make,model,color
A1001,NEW,2024,Toyota,Camry,Silver
A1002,NEW,2024,Honda,Accord,Black
U5001,USED,2022,Ford,F-150,White
U5002,USED,2021,Chevrolet,Silverado,Red`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'key_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get user display name with multiple fallback options
  const getUserDisplayName = (key: KeyWithCheckout): string => {
    if (key.checked_out_by?.first_name || key.checked_out_by?.last_name) {
      return `${key.checked_out_by.first_name || ''} ${key.checked_out_by.last_name || ''}`.trim();
    }
    
    const sessionUser = key.checkout_session?.user;
    if (sessionUser?.first_name || sessionUser?.last_name) {
      return `${sessionUser.first_name || ''} ${sessionUser.last_name || ''}`.trim();
    }
    
    if (key.checkout_session?.checked_out_by_user_id && users.length > 0) {
      const foundUser = users.find(u => u.id === key.checkout_session?.checked_out_by_user_id);
      if (foundUser) {
        return `${foundUser.first_name || ''} ${foundUser.last_name || ''}`.trim();
      }
    }
    
    return 'Unknown User';
  };

  const filteredKeys = useMemo(() => {
    let result = keys;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(k => 
        k.stock_number.toLowerCase().includes(query) ||
        k.make?.toLowerCase().includes(query) ||
        k.model?.toLowerCase().includes(query) ||
        k.color?.toLowerCase().includes(query) ||
        k.checked_out_by?.first_name?.toLowerCase().includes(query) ||
        k.checked_out_by?.last_name?.toLowerCase().includes(query) ||
        (k.checkout_session?.checked_out_by_user_id && users.find(u => 
          u.id === k.checkout_session?.checked_out_by_user_id &&
          (`${u.first_name} ${u.last_name}`.toLowerCase().includes(query))
        ))
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter(k => k.category === categoryFilter);
    }

    switch (filter) {
      case 'available':
        result = result.filter(k => k.status === 'ACTIVE' && !k.checkout_session?.is_open);
        break;
      case 'checked-out':
        result = result.filter(k => k.checkout_session?.is_open);
        break;
      case 'overdue':
        result = result.filter(k => 
          k.checkout_session?.alert_state === 'YELLOW' || 
          k.checkout_session?.alert_state === 'RED'
        );
        break;
      case 'sold':
        result = result.filter(k => k.status === 'SOLD');
        break;
      case 'deleted':
        result = result.filter(k => k.status === 'DELETED');
        break;
      default:
        result = result.filter(k => k.status !== 'DELETED');
    }

    return result;
  }, [keys, searchQuery, filter, categoryFilter, users]);

  const handleCreate = async () => {
    const success = await onCreateKey({
      stock_number: formData.stock_number,
      category: formData.category,
      year: formData.year ? parseInt(formData.year) : undefined,
      make: formData.make || undefined,
      model: formData.model || undefined,
      color: formData.color || undefined
    });
    if (success) {
      setShowCreateModal(false);
      resetForm();
    }
  };

  const handleEdit = (key: KeyWithCheckout) => {
    setFormData({
      stock_number: key.stock_number,
      category: key.category,
      year: key.year?.toString() || '',
      make: key.make || '',
      model: key.model || '',
      color: key.color || ''
    });
    setShowEditModal(key);
  };

  const handleUpdate = async () => {
    if (!showEditModal) return;
    const success = await onUpdateKey(showEditModal.id, {
      category: formData.category,
      year: formData.year ? parseInt(formData.year) : null,
      make: formData.make || null,
      model: formData.model || null,
      color: formData.color || null
    });
    if (success) {
      setShowEditModal(null);
      resetForm();
    }
  };

  const handleCheckoutWithReason = async (reason: CheckoutReason) => {
    if (reason === 'SERVICE') {
      setSelectedReason(reason);
      return;
    }
    
    if (!showCheckoutModal) return;
    const success = await onCheckout(showCheckoutModal.id, reason);
    if (success) {
      setShowCheckoutModal(null);
      setSelectedReason(null);
      setSelectedBay('');
    }
  };

  const handleServiceCheckout = async () => {
    if (!showCheckoutModal || !selectedBay) return;
    const success = await onCheckout(showCheckoutModal.id, 'SERVICE', selectedBay);
    if (success) {
      setShowCheckoutModal(null);
      setSelectedReason(null);
      setSelectedBay('');
    }
  };

  const handleLocationUpdate = async (location: string) => {
    if (!showLocationModal) return;
    const success = await onUpdateLocation(showLocationModal.id, location);
    if (success) {
      setShowLocationModal(null);
    }
  };

  const formatElapsed = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const filters: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'available', label: 'Available' },
    { value: 'checked-out', label: 'Checked Out' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'sold', label: 'Sold' },
    { value: 'deleted', label: 'Deleted' },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: dealership.secondary_color }}>
      {/* Header */}
      <header 
        className="sticky top-0 z-40 shadow-lg"
        style={{ backgroundColor: dealership.primary_color }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-white/80 hover:text-white">
            <ChevronLeftIcon size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-bold">Keys Management</h1>
            <p className="text-white/70 text-xs">{filteredKeys.length} keys</p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInstructionsModal(true)}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white"
                title="Import Instructions"
              >
                <InfoIcon size={20} />
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white"
                title="Bulk Import Keys"
              >
                <UploadIcon size={20} />
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white"
                title="Add Single Key"
              >
                <PlusIcon size={20} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Search & Filter */}
      <div className="max-w-6xl mx-auto px-4 py-4 space-y-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by stock #, make, model, user..."
            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>

        {/* Category Filter (New/Used) */}
        <div className="flex gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === 'all'
                ? 'bg-white text-gray-900'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setCategoryFilter('NEW')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === 'NEW'
                ? 'bg-green-500 text-white'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
          >
            New
          </button>
          <button
            onClick={() => setCategoryFilter('USED')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              categoryFilter === 'USED'
                ? 'bg-blue-500 text-white'
                : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
            }`}
          >
            Used
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f.value
                  ? 'bg-white text-gray-900'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Keys List */}
      <div className="max-w-6xl mx-auto px-4 space-y-3">
        {filteredKeys.map(key => {
          const isCheckedOut = key.checkout_session?.is_open;
          const canCheckout = !isCheckedOut && key.status === 'ACTIVE';
          const userName = getUserDisplayName(key);
          const alertState = key.checkout_session?.alert_state;
          const currentLocation = key.checkout_session?.current_location;
          const isServiceCheckout = key.checkout_session?.checkout_reason === 'SERVICE';

          return (
            <div
              key={key.id}
              className={`bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10 ${
                alertState === 'RED' ? 'ring-2 ring-red-500' :
                alertState === 'YELLOW' ? 'ring-2 ring-yellow-500' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0" onClick={() => onSelectKey(key)}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold text-lg">{key.stock_number}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      key.category === 'NEW' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {key.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(key.status)}`}>
                      {getStatusLabel(key.status)}
                    </span>
                  </div>
                  <p className="text-white/70 text-sm">
                    {[key.year, key.make, key.model].filter(Boolean).join(' ') || 'No details'}
                    {key.color && <span className="text-white/50"> • {key.color}</span>}
                  </p>
                  
                  {/* Checked Out Info */}
                  {isCheckedOut && (
                    <div className={`mt-3 p-4 rounded-lg border-2 ${
                      alertState === 'RED' ? 'bg-red-500/20 border-red-500/50' :
                      alertState === 'YELLOW' ? 'bg-yellow-500/20 border-yellow-500/50' :
                      'bg-blue-500/20 border-blue-500/50'
                    }`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          alertState === 'RED' ? 'bg-red-500' :
                          alertState === 'YELLOW' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}>
                          <UserIcon size={20} className="text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-white/60 uppercase tracking-wide">Checked Out By</p>
                          <p className="text-white font-bold text-lg">{userName}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${getCheckoutReasonColor(key.checkout_session?.checkout_reason)}`}>
                          {getCheckoutReasonLabel(key.checkout_session?.checkout_reason)}
                        </span>
                        <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg">
                          <ClockIcon size={16} className={
                            alertState === 'RED' ? 'text-red-400' :
                            alertState === 'YELLOW' ? 'text-yellow-400' :
                            'text-green-400'
                          } />
                          <span className="text-white/70 text-sm">Out for:</span>
                          <span className={`font-bold text-lg ${
                            alertState === 'RED' ? 'text-red-400' :
                            alertState === 'YELLOW' ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {formatElapsed(key.checkout_session?.elapsed_minutes || 0)}
                          </span>
                        </div>
                      </div>

                      {isServiceCheckout && currentLocation && (
                        <div className="mt-3 flex items-center gap-2 bg-amber-500/20 px-3 py-2 rounded-lg">
                          <MapPinIcon size={16} className="text-amber-400" />
                          <span className="text-amber-400 font-medium">
                            Location: {getLocationLabel(currentLocation)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {canCheckout && (
                    <button
                      onClick={() => setShowCheckoutModal(key)}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Check Out
                    </button>
                  )}
                  {isCheckedOut && (
                    <>
                      <button
                        onClick={() => onReturn(key.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Return
                      </button>
                      <button
                        onClick={() => setShowLocationModal(key)}
                        disabled={loading}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1 justify-center"
                      >
                        <MapPinIcon size={14} />
                        Location
                      </button>
                    </>
                  )}
                  {isAdmin && key.status === 'SOLD' && !isCheckedOut && (
                    <button
                      onClick={() => onUpdateStatus(key.id, 'ACTIVE')}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1 justify-center"
                    >
                      <CheckIcon size={14} />
                      Reactivate
                    </button>
                  )}
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => setShowStatusModal(key)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/80"
                        title="Change Status"
                      >
                        <CheckIcon size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(key)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/80"
                        title="Edit"
                      >
                        <EditIcon size={16} />
                      </button>
                      {key.status !== 'DELETED' && (
                        <button
                          onClick={() => onDeleteKey(key.id)}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400"
                          title="Delete"
                        >
                          <TrashIcon size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredKeys.length === 0 && (
          <div className="text-center py-12 text-white/60">
            <KeyIcon className="mx-auto mb-4 opacity-50" size={48} />
            <p>No keys found</p>
          </div>
        )}
      </div>

      {/* Import Instructions Modal */}
      {showInstructionsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-800">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileTextIcon size={20} />
                Bulk Import Instructions
              </h2>
              <button onClick={() => setShowInstructionsModal(false)} className="text-white/60 hover:text-white">
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Overview */}
              <div>
                <h3 className="text-white font-semibold mb-2">Overview</h3>
                <p className="text-white/70 text-sm">
                  The bulk import feature allows you to add multiple keys at once using a CSV (Comma-Separated Values) file. 
                  This is useful when setting up a new dealership or adding inventory from another system.
                </p>
              </div>

              {/* Step by Step */}
              <div>
                <h3 className="text-white font-semibold mb-3">Step-by-Step Guide</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">1</div>
                    <div>
                      <p className="text-white font-medium">Prepare Your CSV File</p>
                      <p className="text-white/60 text-sm mt-1">
                        Create a CSV file with your key inventory. You can use Excel, Google Sheets, or any spreadsheet program and export as CSV.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">2</div>
                    <div>
                      <p className="text-white font-medium">Include Required Columns</p>
                      <p className="text-white/60 text-sm mt-1">
                        Your file must have a <code className="bg-white/10 px-1 rounded">stock_number</code> column. Other columns are optional but recommended.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">3</div>
                    <div>
                      <p className="text-white font-medium">Upload and Preview</p>
                      <p className="text-white/60 text-sm mt-1">
                        Click the upload button, select your file, and review the preview. Invalid entries will be highlighted.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">4</div>
                    <div>
                      <p className="text-white font-medium">Confirm Import</p>
                      <p className="text-white/60 text-sm mt-1">
                        Review the summary and click "Import" to add all valid keys to your system.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column Reference */}
              <div>
                <h3 className="text-white font-semibold mb-3">CSV Column Reference</h3>
                <div className="bg-white/5 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left p-3 text-white/80">Column Name</th>
                        <th className="text-left p-3 text-white/80">Required</th>
                        <th className="text-left p-3 text-white/80">Description</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/60">
                      <tr className="border-b border-white/5">
                        <td className="p-3"><code className="bg-white/10 px-1 rounded">stock_number</code></td>
                        <td className="p-3"><span className="text-green-400">Yes</span></td>
                        <td className="p-3">Unique identifier for the key (e.g., A1001, U5002)</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="p-3"><code className="bg-white/10 px-1 rounded">category</code></td>
                        <td className="p-3"><span className="text-white/40">No</span></td>
                        <td className="p-3">NEW or USED (defaults to NEW)</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="p-3"><code className="bg-white/10 px-1 rounded">year</code></td>
                        <td className="p-3"><span className="text-white/40">No</span></td>
                        <td className="p-3">Vehicle year (e.g., 2024)</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="p-3"><code className="bg-white/10 px-1 rounded">make</code></td>
                        <td className="p-3"><span className="text-white/40">No</span></td>
                        <td className="p-3">Vehicle manufacturer (e.g., Toyota, Ford)</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="p-3"><code className="bg-white/10 px-1 rounded">model</code></td>
                        <td className="p-3"><span className="text-white/40">No</span></td>
                        <td className="p-3">Vehicle model (e.g., Camry, F-150)</td>
                      </tr>
                      <tr>
                        <td className="p-3"><code className="bg-white/10 px-1 rounded">color</code></td>
                        <td className="p-3"><span className="text-white/40">No</span></td>
                        <td className="p-3">Vehicle color (e.g., Silver, Black)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Example */}
              <div>
                <h3 className="text-white font-semibold mb-3">Example CSV Content</h3>
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-white/70 overflow-x-auto">
                  <pre>{`stock_number,category,year,make,model,color
A1001,NEW,2024,Toyota,Camry,Silver
A1002,NEW,2024,Honda,Accord,Black
U5001,USED,2022,Ford,F-150,White
U5002,USED,2021,Chevrolet,Silverado,Red`}</pre>
                </div>
              </div>

              {/* Tips */}
              <div>
                <h3 className="text-white font-semibold mb-3">Tips for Success</h3>
                <ul className="space-y-2 text-white/70 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckIcon size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Stock numbers must be unique - duplicates will be flagged and skipped</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Column headers are case-insensitive (STOCK_NUMBER, stock_number, Stock_Number all work)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span>For category, you can use: NEW, N, USED, U, or PRE-OWNED</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Empty rows are automatically skipped</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Download the template to get started quickly</span>
                  </li>
                </ul>
              </div>

              {/* Download Template Button */}
              <div className="pt-4 border-t border-white/10">
                <button
                  onClick={downloadTemplate}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <DownloadIcon size={18} />
                  Download CSV Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-800">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <UploadIcon size={20} />
                Bulk Import Keys
              </h2>
              <button 
                onClick={() => { setShowImportModal(false); resetImport(); }} 
                className="text-white/60 hover:text-white"
              >
                <XIcon size={20} />
              </button>
            </div>
            
            <div className="p-6">
              {importStep === 'upload' && (
                <div className="space-y-6">
                  <div className="text-center py-8 border-2 border-dashed border-white/20 rounded-xl">
                    <UploadIcon size={48} className="mx-auto text-white/40 mb-4" />
                    <p className="text-white/70 mb-4">Upload a CSV file with your key inventory</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium cursor-pointer transition-colors"
                    >
                      Choose CSV File
                    </label>
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={downloadTemplate}
                      className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <DownloadIcon size={18} />
                      Download Template
                    </button>
                    <button
                      onClick={() => setShowInstructionsModal(true)}
                      className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <InfoIcon size={18} />
                      View Instructions
                    </button>
                  </div>
                </div>
              )}

              {importStep === 'preview' && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-white">{importData.length}</p>
                      <p className="text-white/60 text-sm">Total Rows</p>
                    </div>
                    <div className="bg-green-500/20 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-400">{importData.filter(r => r.isValid).length}</p>
                      <p className="text-green-400/70 text-sm">Valid</p>
                    </div>
                    <div className="bg-red-500/20 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-red-400">{importData.filter(r => !r.isValid).length}</p>
                      <p className="text-red-400/70 text-sm">Invalid</p>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="bg-white/5 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-700">
                        <tr>
                          <th className="text-left p-3 text-white/80">Status</th>
                          <th className="text-left p-3 text-white/80">Stock #</th>
                          <th className="text-left p-3 text-white/80">Category</th>
                          <th className="text-left p-3 text-white/80">Year</th>
                          <th className="text-left p-3 text-white/80">Make</th>
                          <th className="text-left p-3 text-white/80">Model</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.map((row, idx) => (
                          <tr key={idx} className={`border-t border-white/5 ${!row.isValid ? 'bg-red-500/10' : ''}`}>
                            <td className="p-3">
                              {row.isValid ? (
                                <CheckIcon size={16} className="text-green-400" />
                              ) : (
                                <span className="text-red-400 text-xs">{row.error}</span>
                              )}
                            </td>
                            <td className="p-3 text-white font-medium">{row.stock_number}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                row.category === 'NEW' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                              }`}>
                                {row.category}
                              </span>
                            </td>
                            <td className="p-3 text-white/60">{row.year || '-'}</td>
                            <td className="p-3 text-white/60">{row.make || '-'}</td>
                            <td className="p-3 text-white/60">{row.model || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={resetImport}
                      className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeBulkImport}
                      disabled={importData.filter(r => r.isValid).length === 0}
                      className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      Import {importData.filter(r => r.isValid).length} Keys
                    </button>
                  </div>
                </div>
              )}

              {importStep === 'importing' && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white font-medium mb-2">Importing Keys...</p>
                  <p className="text-white/60">
                    {importProgress.current} of {importProgress.total} processed
                  </p>
                  <div className="mt-4 bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {importStep === 'complete' && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckIcon size={32} className="text-white" />
                  </div>
                  <p className="text-white font-medium text-xl mb-2">Import Complete!</p>
                  <div className="flex justify-center gap-8 mt-4">
                    <div>
                      <p className="text-3xl font-bold text-green-400">{importProgress.success}</p>
                      <p className="text-white/60 text-sm">Successful</p>
                    </div>
                    {importProgress.failed > 0 && (
                      <div>
                        <p className="text-3xl font-bold text-red-400">{importProgress.failed}</p>
                        <p className="text-white/60 text-sm">Failed</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setShowImportModal(false); resetImport(); }}
                    className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout Reason Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {selectedReason === 'SERVICE' ? 'Enter Bay Number' : 'Select Reason'}
              </h2>
              <button 
                onClick={() => {
                  setShowCheckoutModal(null);
                  setSelectedReason(null);
                  setSelectedBay('');
                }} 
                className="text-white/60 hover:text-white"
              >
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-4">
              {selectedReason === 'SERVICE' ? (
                <>
                  <p className="text-white/60 text-sm mb-4">
                    Enter the bay number for <span className="text-white font-medium">{showCheckoutModal.stock_number}</span>
                  </p>
                  <div className="mb-4">
                    <label className="block text-white/60 text-sm mb-2">Bay Number</label>
                    <input
                      type="text"
                      value={selectedBay}
                      onChange={(e) => setSelectedBay(e.target.value)}
                      placeholder="Enter bay number (e.g., 1, 2A, Shop 3)"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={handleServiceCheckout}
                    disabled={!selectedBay.trim() || loading}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium"
                  >
                    {loading ? 'Processing...' : 'Confirm Checkout'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-white/60 text-sm mb-4">
                    Why are you checking out <span className="text-white font-medium">{showCheckoutModal.stock_number}</span>?
                  </p>
                  <div className="space-y-2">
                    {checkoutReasons.map(reason => (
                      <button
                        key={reason.value}
                        onClick={() => handleCheckoutWithReason(reason.value)}
                        disabled={loading}
                        className={`w-full py-3 rounded-lg text-left px-4 transition-colors flex items-center gap-3 ${getCheckoutReasonColor(reason.value)} hover:opacity-80`}
                      >
                        {reason.value === 'SERVICE' && <WrenchIcon size={18} />}
                        {reason.value === 'MOVE' && <MoveIcon size={18} />}
                        {reason.value === 'MISCELLANEOUS' && <MoreHorizontalIcon size={18} />}
                        {reason.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Update Location</h2>
              <button 
                onClick={() => {
                  setShowLocationModal(null);
                  setLocationInput('');
                }} 
                className="text-white/60 hover:text-white"
              >
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-white/60 text-sm mb-4">
                Where is <span className="text-white font-medium">{showLocationModal.stock_number}</span> now?
              </p>
              
              {showLocationModal.checkout_session?.current_location && (
                <div className="mb-4 p-3 bg-white/5 rounded-lg">
                  <p className="text-white/60 text-xs mb-1">Current Location</p>
                  <p className="text-white font-medium flex items-center gap-2">
                    <MapPinIcon size={16} className="text-amber-400" />
                    {getLocationLabel(showLocationModal.checkout_session.current_location)}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-sm mb-2">
                    <WrenchIcon size={14} className="inline mr-1" />
                    Move to Bay
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="Enter bay number (e.g., 1, 2A, Shop 3)"
                      className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                    />
                    <button
                      onClick={async () => {
                        if (locationInput.trim()) {
                          const success = await handleLocationUpdate(locationInput.trim());
                          if (success !== false) {
                            setLocationInput('');
                          }
                        }
                      }}
                      disabled={!locationInput.trim() || loading}
                      className="px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium"
                    >
                      Update
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10"></div>
                  <span className="text-white/40 text-xs uppercase">or</span>
                  <div className="flex-1 h-px bg-white/10"></div>
                </div>

                <button
                  onClick={() => handleLocationUpdate(KEY_BOX_VALUE)}
                  disabled={loading}
                  className="w-full py-3 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <BoxIcon size={18} />
                  Return to Key Box
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Add New Key</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-white/60 hover:text-white">
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {(error || stockNumberError) && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircleIcon size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 text-sm font-medium">
                      {stockNumberError || error}
                    </p>
                    <p className="text-red-400/70 text-xs mt-1">
                      Please enter a unique stock number that doesn't already exist in the system.
                    </p>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-white/80 text-sm mb-1">Stock Number *</label>
                <input
                  type="text"
                  value={formData.stock_number}
                  onChange={(e) => handleStockNumberChange(e.target.value)}
                  className={`w-full px-4 py-2 bg-white/10 border rounded-lg text-white uppercase ${
                    stockNumberError 
                      ? 'border-red-500 focus:ring-red-500/50' 
                      : 'border-white/20 focus:ring-white/30'
                  } focus:outline-none focus:ring-2`}
                  placeholder="A1001"
                />
                {stockNumberError && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircleIcon size={12} />
                    {stockNumberError}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Category *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, category: 'NEW' })}
                    className={`flex-1 py-2 rounded-lg ${
                      formData.category === 'NEW' ? 'bg-green-600 text-white' : 'bg-white/10 text-white/60'
                    }`}
                  >
                    NEW
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, category: 'USED' })}
                    className={`flex-1 py-2 rounded-lg ${
                      formData.category === 'USED' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'
                    }`}
                  >
                    USED
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm mb-1">Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    placeholder="2024"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-1">Color</label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    placeholder="Silver"
                  />
                </div>
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Make</label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  placeholder="Toyota"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Model</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  placeholder="Camry"
                />
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
                disabled={!formData.stock_number || !!stockNumberError || loading}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg"
              >
                {loading ? 'Adding...' : 'Add Key'}
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
              <h2 className="text-lg font-semibold text-white">Edit Key: {showEditModal.stock_number}</h2>
              <button onClick={() => { setShowEditModal(null); resetForm(); }} className="text-white/60 hover:text-white">
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-white/80 text-sm mb-1">Category</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, category: 'NEW' })}
                    className={`flex-1 py-2 rounded-lg ${
                      formData.category === 'NEW' ? 'bg-green-600 text-white' : 'bg-white/10 text-white/60'
                    }`}
                  >
                    NEW
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, category: 'USED' })}
                    className={`flex-1 py-2 rounded-lg ${
                      formData.category === 'USED' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'
                    }`}
                  >
                    USED
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm mb-1">Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-1">Color</label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Make</label>
                <input
                  type="text"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-white/80 text-sm mb-1">Model</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                />
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

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Change Status</h2>
              <button onClick={() => setShowStatusModal(null)} className="text-white/60 hover:text-white">
                <XIcon size={20} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-white/60 text-sm mb-4">
                Key: <span className="text-white font-medium">{showStatusModal.stock_number}</span>
              </p>
              {availableStatuses.filter(s => s !== 'DELETED').map(status => (
                <button
                  key={status}
                  onClick={async () => {
                    await onUpdateStatus(showStatusModal.id, status);
                    setShowStatusModal(null);
                  }}
                  disabled={showStatusModal.status === status}
                  className={`w-full py-3 rounded-lg text-left px-4 transition-colors ${
                    showStatusModal.status === status
                      ? 'bg-white/20 text-white cursor-default'
                      : 'bg-white/10 hover:bg-white/20 text-white/80'
                  }`}
                >
                  <span className={`inline-block px-2 py-0.5 rounded text-xs mr-2 ${getStatusColor(status)}`}>
                    {getStatusLabel(status)}
                  </span>
                  {showStatusModal.status === status && (
                    <span className="text-green-400 text-xs">(Current)</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
