import React, { useState } from 'react';
import { 
  HelpIcon, 
  ChevronLeftIcon,
  ChevronRightIcon,
  KeyIcon,
  UserIcon,
  UsersIcon,
  SettingsIcon,
  BuildingIcon
} from '../ui/Icons';
import type { Dealership, User } from '@/types';

interface HelpScreenProps {
  dealership: Dealership | null;
  user: User | null;
  isOwnerMode: boolean;
  onBack: () => void;
}

interface HelpSection {
  id: string;
  title: string;
  icon: React.FC<{ className?: string; size?: number }>;
  content: React.ReactNode;
}

export const HelpScreen: React.FC<HelpScreenProps> = ({
  dealership,
  user,
  isOwnerMode,
  onBack
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const ownerSections: HelpSection[] = [
    {
      id: 'create-dealer',
      title: 'Creating a New Dealership',
      icon: BuildingIcon,
      content: (
        <div className="space-y-3 text-white/80">
          <p>To create a new dealership:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Click the <strong>"Create New Dealership"</strong> button on the Owner Dashboard</li>
            <li>Enter the dealership name (e.g., "Metro Auto Sales")</li>
            <li>Create a unique code (e.g., "METRO") - this is what users will enter to access the dealership</li>
            <li>Select the dealer type: <strong>AUTO</strong> or <strong>RV</strong>
              <ul className="list-disc list-inside ml-4 mt-1 text-white/60">
                <li>AUTO dealers have Extended Test Drive and Service Loaner status options</li>
                <li>RV dealers have simplified status options (Active, Sold, Deleted only)</li>
              </ul>
            </li>
            <li>Set the initial admin PIN (4-6 digits)</li>
            <li>Configure alert thresholds (when timers turn yellow and red)</li>
            <li>Optionally customize branding colors</li>
            <li>Click "Create" to finish</li>
          </ol>
        </div>
      )
    },
    {
      id: 'manage-dealers',
      title: 'Managing Dealerships',
      icon: SettingsIcon,
      content: (
        <div className="space-y-3 text-white/80">
          <p>From the Owner Dashboard, you can:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong>Edit:</strong> Change name, PIN, alert thresholds, and colors</li>
            <li><strong>Switch Type:</strong> Change between AUTO and RV (with confirmation)</li>
            <li><strong>Suspend:</strong> Temporarily disable a dealership - users cannot log in</li>
            <li><strong>Delete:</strong> Permanently remove a dealership and all its data</li>
          </ul>
          <p className="text-yellow-400 mt-4">
            Note: Deleting a dealership cannot be undone and removes all keys, users, and logs.
          </p>
        </div>
      )
    }
  ];

  const adminSections: HelpSection[] = [
    {
      id: 'add-keys',
      title: 'Adding & Managing Keys',
      icon: KeyIcon,
      content: (
        <div className="space-y-3 text-white/80">
          <p>To add a new key:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Go to <strong>Keys Management</strong></li>
            <li>Click the <strong>+</strong> button</li>
            <li>Enter the stock number (required, must be unique)</li>
            <li>Select NEW or USED category</li>
            <li>Optionally add year, make, model, and color</li>
            <li>Click "Add Key"</li>
          </ol>
          <p className="mt-4">To change a key's status:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Find the key in the list</li>
            <li>Click the checkmark icon to open status options</li>
            <li>Select the new status</li>
          </ul>
          {dealership?.dealer_type === 'AUTO' && (
            <p className="text-blue-400 mt-4">
              AUTO dealers can use: Active, Sold, Extended Test Drive, Service Loaner, and Deleted
            </p>
          )}
          {dealership?.dealer_type === 'RV' && (
            <p className="text-green-400 mt-4">
              RV dealers can use: Active, Sold, and Deleted
            </p>
          )}
        </div>
      )
    },
    {
      id: 'add-users',
      title: 'Adding & Managing Users',
      icon: UsersIcon,
      content: (
        <div className="space-y-3 text-white/80">
          <p>To add a new user:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Go to <strong>User Management</strong></li>
            <li>Click the <strong>+</strong> button</li>
            <li>Enter first name, last name, and username</li>
            <li>Set a PIN (4-6 digits)</li>
            <li>Select role: User or Admin</li>
            <li>Click "Add User"</li>
          </ol>
          <p className="mt-4">User roles:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong>User:</strong> Can check out/return keys and view the key list</li>
            <li><strong>Admin:</strong> Full access to keys, users, logs, and settings</li>
          </ul>
          <p className="mt-4">To disable a user, click "Disable" on their card. They won't be able to log in until re-enabled.</p>
        </div>
      )
    },
    {
      id: 'alerts',
      title: 'Alert Thresholds',
      icon: SettingsIcon,
      content: (
        <div className="space-y-3 text-white/80">
          <p>Alert thresholds control when checkout timers change color:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><span className="text-green-400">Green:</span> Under the yellow threshold</li>
            <li><span className="text-yellow-400">Yellow:</span> Between yellow and red thresholds (warning)</li>
            <li><span className="text-red-400">Red:</span> Over the red threshold (overdue)</li>
          </ul>
          <p className="mt-4">Current thresholds for {dealership?.name}:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Yellow at: <strong>{dealership?.alert_yellow_minutes} minutes</strong></li>
            <li>Red at: <strong>{dealership?.alert_red_minutes} minutes</strong></li>
          </ul>
          <p className="mt-4">Change these in <strong>Settings</strong>.</p>
        </div>
      )
    }
  ];

  const userSections: HelpSection[] = [
    {
      id: 'checkout',
      title: 'Checking Out a Key',
      icon: KeyIcon,
      content: (
        <div className="space-y-3 text-white/80">
          <p>To check out a key:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Find the key you need (use search or filters)</li>
            <li>Look for keys with the green "Check Out" button</li>
            <li>Click "Check Out"</li>
            <li>The key is now assigned to you with a running timer</li>
          </ol>
          <p className="mt-4 text-yellow-400">
            Only one person can have a key checked out at a time.
          </p>
        </div>
      )
    },
    {
      id: 'return',
      title: 'Returning a Key',
      icon: KeyIcon,
      content: (
        <div className="space-y-3 text-white/80">
          <p>To return a key:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Find the key you checked out</li>
            <li>Click the blue "Return" button</li>
            <li>The timer stops and the key becomes available</li>
          </ol>
          <p className="mt-4">
            You can only return keys that <strong>you</strong> checked out. Admins can return any key.
          </p>
        </div>
      )
    },
    {
      id: 'filters',
      title: 'Using Filters',
      icon: KeyIcon,
      content: (
        <div className="space-y-3 text-white/80">
          <p>Use filters to quickly find keys:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li><strong>All:</strong> Show all keys (except deleted)</li>
            <li><strong>Available:</strong> Keys ready to check out</li>
            <li><strong>Checked Out:</strong> Keys currently in use</li>
            <li><strong>Overdue:</strong> Keys with yellow or red timers</li>
            <li><strong>Sold:</strong> Keys marked as sold</li>
          </ul>
          <p className="mt-4">
            You can also search by stock number, make, model, or color.
          </p>
        </div>
      )
    }
  ];

  let sections: HelpSection[] = [];
  if (isOwnerMode) {
    sections = ownerSections;
  } else if (user?.role === 'ADMIN') {
    sections = [...adminSections, ...userSections];
  } else {
    sections = userSections;
  }

  const bgColor = dealership?.secondary_color || '#1e1b4b';
  const headerColor = dealership?.primary_color || '#4f46e5';

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: bgColor }}>
      {/* Header */}
      <header 
        className="sticky top-0 z-40 shadow-lg"
        style={{ backgroundColor: headerColor }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 text-white/80 hover:text-white">
            <ChevronLeftIcon size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-bold">Help & Guide</h1>
            <p className="text-white/70 text-xs">
              {isOwnerMode ? 'Owner Guide' : user?.role === 'ADMIN' ? 'Admin Guide' : 'User Guide'}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
          <h2 className="text-white font-semibold mb-2">Welcome to KeyFlow</h2>
          <p className="text-white/70 text-sm">
            KeyFlow is a key management system for dealerships. 
            {isOwnerMode 
              ? ' As an owner, you can create and manage multiple dealerships.'
              : user?.role === 'ADMIN'
                ? ' As an admin, you can manage keys, users, and settings for your dealership.'
                : ' As a user, you can check out and return keys.'}
          </p>
        </div>

        {sections.map(section => (
          <div 
            key={section.id}
            className="bg-white/10 backdrop-blur rounded-xl border border-white/10 overflow-hidden"
          >
            <button
              onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <section.icon className="text-white/80" size={20} />
                </div>
                <span className="text-white font-medium">{section.title}</span>
              </div>
              <ChevronRightIcon 
                className={`text-white/60 transition-transform ${
                  expandedSection === section.id ? 'rotate-90' : ''
                }`} 
                size={20} 
              />
            </button>
            {expandedSection === section.id && (
              <div className="px-4 pb-4 pt-0">
                <div className="border-t border-white/10 pt-4">
                  {section.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Contact */}
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
          <h2 className="text-white font-semibold mb-2">Need More Help?</h2>
          <p className="text-white/70 text-sm">
            Contact your dealership administrator or system owner for additional assistance.
          </p>
        </div>
      </div>
    </div>
  );
};
