import React, { useState } from 'react';
import { Save, Webhook, Users, Palette, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettings } from '../contexts/SettingsContext';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import UserInvitationModal from '../components/UserInvitationModal';
import InvitationManagement from '../components/InvitationManagement';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { settings, updateSettings, saveSettings } = useSettings();
  const { getButtonClasses, getFocusClasses } = usePrimaryColor();

  const tabs = [
    { id: 'general', label: 'General', icon: Palette },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'users', label: 'Users', icon: Users },
  ];

  const handleSave = async () => {
    try {
      await saveSettings();
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Brand Name
        </label>
        <input
          type="text"
          value={settings.brandName}
          onChange={(e) => updateSettings({ brandName: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white ${getFocusClasses()}`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Primary Color
        </label>
        <input
          type="color"
          value={settings.primaryColor}
          onChange={(e) => updateSettings({ primaryColor: e.target.value })}
          className="w-20 h-10 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Footer Text
        </label>
        <input
          type="text"
          value={settings.footer}
          onChange={(e) => updateSettings({ footer: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white ${getFocusClasses()}`}
        />
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Notifications
        </h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.notifications.email}
              onChange={(e) => updateSettings({
                notifications: { ...settings.notifications, email: e.target.checked }
              })}
              className={`rounded border-gray-300 ${getFocusClasses()} text-[var(--primary-color)]`}
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Email notifications
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.notifications.slack}
              onChange={(e) => updateSettings({
                notifications: { ...settings.notifications, slack: e.target.checked }
              })}
              className={`rounded border-gray-300 ${getFocusClasses()} text-[var(--primary-color)]`}
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Slack notifications
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderWebhookSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Webhook Endpoints
        </h3>
        <button className={`px-4 py-2 rounded-md transition-colors duration-200 ${getButtonClasses()}`}>
          Add Webhook
        </button>
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          No webhooks configured yet. Add your first webhook to receive real-time notifications.
        </p>
      </div>
    </div>
  );

  const renderUserSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          User Management
        </h3>
        <button 
          onClick={() => setShowInviteModal(true)}
          className={`px-4 py-2 rounded-md transition-colors duration-200 ${getButtonClasses()} flex items-center space-x-2`}
        >
          <Plus className="w-4 h-4" />
          <span>Invite User</span>
        </button>
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-md">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">admin</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">admin@testreport.com</p>
            </div>
            <span className="px-2 py-1 bg-[var(--primary-100)] text-[var(--primary-700)] dark:bg-[var(--primary-900)] dark:text-[var(--primary-color)] text-xs rounded-md">
              Admin
            </span>
          </div>
        </div>
      </div>

      {/* Invitations Management */}
      <div>
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Pending Invitations
        </h4>
        <InvitationManagement />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure your test reporting preferences and integrations
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'general' && renderGeneralSettings()}
          {activeTab === 'webhooks' && renderWebhookSettings()}
          {activeTab === 'users' && renderUserSettings()}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <button
            onClick={handleSave}
            className={`inline-flex items-center px-4 py-2 rounded-md transition-colors duration-200 ${getButtonClasses()}`}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </button>
        </div>
      </div>

      {/* User Invitation Modal */}
      <UserInvitationModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvitationSent={() => {
          // Refresh the invitations list if on users tab
          if (activeTab === 'users') {
            // The InvitationManagement component will automatically refresh
          }
        }}
      />
    </div>
  );
};

export default Settings;