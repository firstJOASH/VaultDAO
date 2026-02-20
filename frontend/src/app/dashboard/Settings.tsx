import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Bell } from 'lucide-react';
import NotificationSettings from '../../components/NotificationSettings';

const Settings: React.FC = () => {
  const [notificationsExpanded, setNotificationsExpanded] = useState(true);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Settings</h2>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <p className="text-gray-400">Configuration options will appear here.</p>
      </div>

      {/* Collapsible Notifications section */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <button
          type="button"
          onClick={() => setNotificationsExpanded((e) => !e)}
          className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 sm:p-6 text-left hover:bg-gray-700/50 transition-colors min-h-[44px] sm:min-h-0 touch-manipulation"
          aria-expanded={notificationsExpanded}
          aria-controls="notifications-content"
        >
          <div className="flex items-center gap-3">
            <Bell size={24} className="text-purple-400 shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              <p className="text-sm text-gray-400">Configure event, method, frequency, and DND preferences.</p>
            </div>
          </div>
          <span className="text-gray-400 shrink-0" aria-hidden>
            {notificationsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </span>
        </button>
        <div
          id="notifications-content"
          role="region"
          aria-label="Notification settings"
          className={notificationsExpanded ? 'block' : 'hidden'}
        >
          <div className="px-4 pb-6 pt-0 sm:px-6 sm:pt-0 sm:pb-6 border-t border-gray-700">
            <NotificationSettings />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
