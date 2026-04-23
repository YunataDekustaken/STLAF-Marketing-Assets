import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  AlertCircle, 
  Edit2, 
  Trash2, 
  X,
  FolderOpen,
  Info,
  Bell,
  Mail,
  Zap,
  History,
  ExternalLink,
  Download,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleAuth } from './GoogleAuth';
import { Cloud, RefreshCw, Users as UsersIcon, UserCog, Upload } from 'lucide-react';
import { RoleManager } from './RoleManager';

export const AdminView = ({ 
  notificationSettings,
  onUpdateNotificationSettings,
  addNotification,
  quickLinks,
  onUpdateQuickLinks
}: { 
  notificationSettings: { 
    memberUploads: boolean, 
    fileDownloads: boolean,
    connectivityIssues: boolean, 
    storageQuota: boolean, 
    systemMaintenance: boolean,
    assetRequests: boolean 
  },
  onUpdateNotificationSettings: (settings: any) => void,
  addNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning', settingKey?: string, file?: any) => void,
  quickLinks?: {id: string, name: string, url: string}[],
  onUpdateQuickLinks: (links: {id: string, name: string, url: string}[]) => void
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'links'>('users');
  const [localSettings, setLocalSettings] = useState(notificationSettings);
  const [localQuickLinks, setLocalQuickLinks] = useState(quickLinks || []);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setLocalSettings(notificationSettings);
  }, [notificationSettings]);

  useEffect(() => {
    if (quickLinks) setLocalQuickLinks(quickLinks);
  }, [quickLinks]);

  const handleSaveSettings = () => {
    setShowConfirm(true);
  };

  const confirmSave = () => {
    onUpdateNotificationSettings(localSettings);
    setShowConfirm(false);
    addNotification('Settings Updated', 'Notification settings have been updated successfully.', 'success');
  };

  const tabs = [
    { id: 'users', label: 'User Operations', icon: <UserCog className="w-4 h-4" /> },
    { id: 'links', label: 'Quick Links', icon: <ExternalLink className="w-4 h-4" /> },
    { id: 'settings', label: 'System Settings', icon: <Zap className="w-4 h-4" /> }
  ] as const;

  return (
    <div className="space-y-8">
      {/* Admin Tab Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Admin Center</h2>
            <p className="text-slate-500 font-medium">Control the portal experience and manage user access.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Mobile Tab Selector */}
        <div className="md:hidden flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-amber-500 text-primary-dark shadow-md' 
                  : 'bg-white border border-slate-200 text-slate-500'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          className="space-y-8"
        >
          {activeTab === 'users' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">User Operations</h2>
                  <p className="text-slate-500 font-medium text-sm">Manage access requests and active user profiles.</p>
                </div>
              </div>

              <div className="bg-white rounded-[32px] border border-black/5 shadow-sm overflow-hidden min-h-[600px]">
                <RoleManager addNotification={addNotification} />
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row gap-6 items-start justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <Cloud className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Google Drive Connectivity</h3>
                      <p className="text-xs text-slate-500">System-wide connection via Service Account is active.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 px-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-sm font-bold text-emerald-700">Service Connected</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-slate-700">Storage is being managed automatically by the server.</p>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active System Connection</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-indigo-50 rounded-xl">
                    <Bell className="w-6 h-6 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Notification Settings</h3>
                    <p className="text-xs text-slate-500">Configure how and when you receive portal updates.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* File Downloads */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Download className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">File Downloads</p>
                        <p className="text-[10px] text-slate-500">Track and notify of asset downloads</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setLocalSettings(prev => ({ ...prev, fileDownloads: !prev.fileDownloads }))}
                      className={`shrink-0 w-11 h-6 p-1 rounded-full transition-colors relative flex items-center ${localSettings.fileDownloads ? 'bg-amber-500' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 transform ${localSettings.fileDownloads ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Member Uploads */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Upload className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Member Uploads</p>
                        <p className="text-[10px] text-slate-500">Notify supervisors when members upload new files</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setLocalSettings(prev => ({ ...prev, memberUploads: !prev.memberUploads }))}
                      className={`shrink-0 w-11 h-6 p-1 rounded-full transition-colors relative flex items-center ${localSettings.memberUploads ? 'bg-amber-500' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 transform ${localSettings.memberUploads ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Connectivity Issues */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <RefreshCw className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Connectivity Issues</p>
                        <p className="text-[10px] text-slate-500">Notify when Google Drive token expires</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setLocalSettings(prev => ({ ...prev, connectivityIssues: !prev.connectivityIssues }))}
                      className={`shrink-0 w-11 h-6 p-1 rounded-full transition-colors relative flex items-center ${localSettings.connectivityIssues ? 'bg-amber-500' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 transform ${localSettings.connectivityIssues ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Storage & Quota */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Storage & Quota</p>
                        <p className="text-[10px] text-slate-500">Alert when shared drive storage is low</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setLocalSettings(prev => ({ ...prev, storageQuota: !prev.storageQuota }))}
                      className={`shrink-0 w-11 h-6 p-1 rounded-full transition-colors relative flex items-center ${localSettings.storageQuota ? 'bg-amber-500' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 transform ${localSettings.storageQuota ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* System Maintenance */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Zap className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">System Maintenance</p>
                        <p className="text-[10px] text-slate-500">Maintenance & version updates</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setLocalSettings(prev => ({ ...prev, systemMaintenance: !prev.systemMaintenance }))}
                      className={`shrink-0 w-11 h-6 p-1 rounded-full transition-colors relative flex items-center ${localSettings.systemMaintenance ? 'bg-amber-500' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 transform ${localSettings.systemMaintenance ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Asset Requests */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <ClipboardList className="w-4 h-4 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Asset Requests</p>
                        <p className="text-[10px] text-slate-500">Alerts for new or updated asset requests</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setLocalSettings(prev => ({ ...prev, assetRequests: !prev.assetRequests }))}
                      className={`shrink-0 w-11 h-6 p-1 rounded-full transition-colors relative flex items-center ${localSettings.assetRequests ? 'bg-amber-500' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 transform ${localSettings.assetRequests ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleSaveSettings}
                    className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-primary-dark rounded-xl text-sm font-bold transition-all shadow-sm"
                  >
                    Save Notification Settings
                  </button>
                  
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex-1 flex items-center gap-3">
                    <Info className="w-5 h-5 text-slate-400 shrink-0" />
                    <p className="text-[10px] text-slate-500 font-medium">Administrator changes affect all users in the system.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <Info className="w-6 h-6 text-slate-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">App Info</h3>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Application Name</p>
                      <p className="text-sm font-bold text-slate-900">Marketing Operations Portal</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Google Drive Root ID</p>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-mono font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded inline-block break-all">
                          1MWfdDx8uR55IKsgo9Y741BuxR-EJoesU
                        </p>
                        <a 
                          href="https://drive.google.com/drive/folders/1MWfdDx8uR55IKsgo9Y741BuxR-EJoesU" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1 px-2 text-blue-500 hover:bg-blue-50 rounded transition-colors text-[10px] uppercase font-bold border border-blue-100 flex items-center gap-1 shrink-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open Root
                        </a>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-100">
                    <p className="text-xs italic text-slate-400">Admin Center is only accessible to Marketing Supervisors.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'links' && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <ExternalLink className="w-6 h-6 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Quick Links Management</h3>
              </div>
              
              <div className="space-y-4">
                {localQuickLinks.map((link, index) => (
                  <div key={link.id} className="flex flex-col md:flex-row gap-4 items-end p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex-1 w-full space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Link Name</label>
                      <input 
                        type="text" 
                        value={link.name}
                        onChange={(e) => {
                          const newLinks = [...localQuickLinks];
                          newLinks[index].name = e.target.value;
                          setLocalQuickLinks(newLinks);
                        }}
                        placeholder="e.g. Brand Guidelines"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <div className="flex-[2] w-full space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">URL</label>
                      <input 
                        type="text" 
                        value={link.url}
                        onChange={(e) => {
                          const newLinks = [...localQuickLinks];
                          newLinks[index].url = e.target.value;
                          setLocalQuickLinks(newLinks);
                        }}
                        placeholder="https://..."
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <button 
                      onClick={() => setLocalQuickLinks(prev => prev.filter((_, i) => i !== index))}
                      className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove Link"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                
                <button 
                  onClick={() => setLocalQuickLinks(prev => [...prev, { id: Date.now().toString(), name: '', url: '#' }])}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50/30 transition-all flex items-center justify-center gap-2 group"
                >
                  <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold tracking-tight">Add New Link</span>
                </button>
              </div>
              
              <button 
                onClick={() => onUpdateQuickLinks(localQuickLinks)}
                className="mt-8 px-8 py-3 bg-amber-500 hover:bg-amber-600 text-primary-dark rounded-xl text-sm font-bold transition-all shadow-sm"
              >
                Update Quick Links
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>


      {/* Save Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary-dark/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-amber-50 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Confirm Changes</h3>
                    <p className="text-sm text-slate-500">Are you sure you want to update your notification preferences?</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
                <button onClick={confirmSave} className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-primary-dark text-sm font-bold rounded-lg transition-colors shadow-sm">Confirm & Save</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
