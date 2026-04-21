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
import { Cloud, RefreshCw } from 'lucide-react';

export const AdminView = ({ 
  notificationSettings,
  onUpdateNotificationSettings,
  googleAccessToken,
  onGoogleAuthSuccess,
  onGoogleLogout,
  addNotification,
  quickLinks,
  onUpdateQuickLinks
}: { 
  notificationSettings: { 
    driveUploads: boolean, 
    fileDownloads: boolean,
    connectivityIssues: boolean, 
    storageQuota: boolean, 
    systemMaintenance: boolean,
    assetRequests: boolean 
  },
  onUpdateNotificationSettings: (settings: any) => void,
  googleAccessToken: string | null,
  onGoogleAuthSuccess: (token: string, expiresAt: number) => void,
  onGoogleLogout: () => void,
  addNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning', settingKey?: string, file?: any) => void,
  quickLinks?: {id: string, name: string, url: string}[],
  onUpdateQuickLinks: (links: {id: string, name: string, url: string}[]) => void
}) => {
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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row gap-6 items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Cloud className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Google Drive Connectivity</h3>
              <p className="text-xs text-slate-500">Connect or disconnect the marketing shared drive.</p>
            </div>
          </div>
          <GoogleAuth 
            accessToken={googleAccessToken} 
            onAuthSuccess={onGoogleAuthSuccess} 
            onLogout={onGoogleLogout} 
          />
        </div>

        {googleAccessToken && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-sm font-medium text-slate-700">Connected to Google Drive</p>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Session</p>
          </div>
        )}
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

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Cloud className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">New Drive Uploads</p>
                <p className="text-[10px] text-slate-500">Alert team when new materials appear in Drive</p>
              </div>
            </div>
            <button 
              onClick={() => setLocalSettings(prev => ({ ...prev, driveUploads: !prev.driveUploads }))}
              className={`shrink-0 w-11 h-6 p-1 rounded-full transition-colors relative flex items-center ${localSettings.driveUploads ? 'bg-amber-500' : 'bg-slate-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 transform ${localSettings.driveUploads ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

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

        <button 
          onClick={handleSaveSettings}
          className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-primary-dark rounded-xl text-sm font-bold transition-all shadow-sm"
        >
          Save Notification Settings
        </button>
      </div>

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
