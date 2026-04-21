/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  AlertCircle, 
  Edit2, 
  Trash2, 
  ExternalLink,
  X,
  Loader2,
  Copy,
  Check,
  Lock,
  Bell,
  User as UserIcon,
  ShieldCheck,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
  FolderOpen,
  Folder,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ViewMode, RequestItem, INITIAL_REQUESTS } from './types';
import { auth, db, googleProvider, isFirebaseConfigured } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
} from 'firebase/firestore';
import { persistenceService } from './services/persistenceService';

import { AdminView } from './components/AdminView';
import { AssetsView } from './components/AssetsView';
import { RequestsView } from './components/RequestsView';
import { ROOT_FOLDER_ID } from './hooks/useGoogleDrive';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  console.error('Firestore Error: ', error, operationType, path);
};

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('assets');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [assetRequests, setAssetRequests] = useState<RequestItem[]>(INITIAL_REQUESTS);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [toasts, setToasts] = useState<{id: string, message: string, type: 'success' | 'info' | 'error'}[]>([]);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<any | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<any | null>(null);
  const [homeResetToken, setHomeResetToken] = useState(0);
  const [quickLinks, setQuickLinks] = useState<{id: string, name: string, url: string}[]>([
    { id: '1', name: 'Marketing Guidelines', url: '#' },
    { id: '2', name: 'Brand Voice Guide', url: '#' },
    { id: '3', name: 'Support Desk', url: '#' }
  ]);
  const [pinnedAssets, setPinnedAssets] = useState<any[]>([]);

  const [notificationSettings, setNotificationSettings] = useState({
    driveUploads: true,
    fileDownloads: true,
    connectivityIssues: true,
    storageQuota: false,
    systemMaintenance: true,
    assetRequests: true
  });

  const addNotification = (
    title: string,
    message: string, 
    type: 'info' | 'success' | 'warning' = 'info', 
    settingKey?: keyof typeof notificationSettings,
    file?: any
  ) => {
    // If settingKey is provided, check if it's enabled in settings
    const isEnabled = !settingKey || (notificationSettings as any)[settingKey] !== false;

    if (isEnabled) {
      const newNotification = {
        id: Date.now().toString(),
        title,
        message,
        type,
        time: 'Just now',
        read: false,
        file
      };
      setNotifications(prev => [newNotification, ...prev]);
    }
    
    // Toasts are always shown for immediate feedback regardless of history settings
    const toastId = Date.now().toString();
    setToasts(prev => [...prev, { id: toastId, message, type: type === 'warning' ? 'error' : type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toastId));
    }, 4000);
  };
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    const token = localStorage.getItem('drive_token');
    const expiresAt = localStorage.getItem('drive_expires_at');
    if (token && expiresAt && Date.now() < parseInt(expiresAt)) {
      return token;
    }
    return null;
  });

  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsAuthReady(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      addNotification('Welcome back!', 'You have signed in successfully.', 'success');
    } catch (err) {
      console.error("Login failed:", err);
      addNotification('Auth Error', 'Sign in failed. Please try again.', 'warning');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setViewMode('assets');
      addNotification('Account', 'You have been signed out successfully.', 'info');
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleGoogleAuthSuccess = (token: string, expiresAt: number) => {
    setGoogleAccessToken(token);
    localStorage.setItem('drive_token', token);
    localStorage.setItem('drive_expires_at', expiresAt.toString());
    addNotification('Google Drive', 'Shared marketing drive connected successfully.', 'success');
  };

  const handleGoogleLogout = () => {
    setGoogleAccessToken(null);
    localStorage.removeItem('drive_token');
    localStorage.removeItem('drive_expires_at');
    addNotification('Google Drive', 'Shared marketing drive has been disconnected.', 'info');
  };

  const updateRequestStatus = (id: string, newStatus: 'pending' | 'approved' | 'rejected') => {
    setAssetRequests(prev => prev.map(req => req.id === id ? { ...req, status: newStatus } : req));
    addNotification('Status Updated', `Request status changed to ${newStatus}.`, 'success', 'assetRequests');
  };

  const handleUpdateNotificationSettings = (settings: any) => {
    setNotificationSettings(settings);
    // In a real app, we would save this to Firestore user settings
  };

  const togglePinAsset = (asset: any) => {
    const isPinned = pinnedAssets.some(p => p.id === asset.id);
    if (isPinned) {
      setPinnedAssets(prev => prev.filter(p => p.id !== asset.id));
      addNotification('Unpinned', `${asset.name} removed from quick access.`, 'info');
    } else {
      setPinnedAssets(prev => [asset, ...prev]);
      addNotification('Pinned', `${asset.name} added to quick access.`, 'success');
    }
  };

  const updateQuickLinks = (links: {id: string, name: string, url: string}[]) => {
    setQuickLinks(links);
    addNotification('Links Updated', 'Sidebar quick links have been updated.', 'success');
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg-main font-sans text-slate-900">
      {/* Sidebar */}
      <aside 
        onMouseEnter={() => isSidebarCollapsed && setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`flex flex-col shrink-0 bg-primary-dark text-slate-300 relative z-30 shadow-2xl transition-[width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isSidebarCollapsed && !isSidebarHovered ? 'w-20' : 'w-64'}`}
      >
        <div className={`px-4 pt-4 flex ${isSidebarCollapsed && !isSidebarHovered ? 'justify-center' : 'justify-start'}`}>
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>

        <div 
          onClick={() => {
            setViewMode('assets');
            setHomeResetToken(prev => prev + 1);
          }}
          className={`p-6 pt-2 flex items-center transition-all duration-500 cursor-pointer hover:opacity-80 ${isSidebarCollapsed && !isSidebarHovered ? 'justify-center' : 'gap-3'}`}
        >
          <div className="relative shrink-0">
            {/* Main Square Logo */}
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-xs tracking-tighter shadow-lg shadow-amber-500/20">
              STLAF
            </div>
            
            {/* Star Icon Overlay */}
            <div className="absolute -right-1.5 -top-1.5 bg-white rounded-lg p-1 shadow-sm border border-slate-100">
              <Sparkles className="w-3 h-3 text-amber-500" />
            </div>
          </div>
          <AnimatePresence mode="wait">
            {(!isSidebarCollapsed || isSidebarHovered) && (
              <motion.div 
                key="logo-text"
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h2 className="text-sm font-bold text-white leading-tight">Assets Portal</h2>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Marketing Dept</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto no-scrollbar overflow-x-hidden">
          <button 
            onClick={() => setViewMode('assets')}
            className={`w-full flex items-center ${isSidebarCollapsed && !isSidebarHovered ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl font-semibold transition-all duration-300 ease-in-out ${viewMode === 'assets' ? 'bg-slate-700/50 text-amber-500 border-l-4 border-amber-500' : 'hover:bg-white/10 hover:text-white text-slate-400'}`}
          >
            <FolderOpen className="w-5 h-5 shrink-0" />
            <AnimatePresence>
              {(!isSidebarCollapsed || isSidebarHovered) && (
                <motion.span 
                  key="assets-text"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Assets Library
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button 
            onClick={() => setViewMode('requests')}
            className={`w-full flex items-center ${isSidebarCollapsed && !isSidebarHovered ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl font-semibold transition-all duration-300 ease-in-out ${viewMode === 'requests' ? 'bg-slate-700/50 text-amber-500 border-l-4 border-amber-500' : 'hover:bg-white/10 hover:text-white text-slate-400'}`}
          >
            <ClipboardList className="w-5 h-5 shrink-0" />
            <AnimatePresence>
              {(!isSidebarCollapsed || isSidebarHovered) && (
                <motion.span 
                  key="requests-text"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Asset Requests
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          
          <div className="pt-4 mt-4 border-t border-slate-700/50">
            <button 
              onClick={() => setViewMode('admin')}
              className={`w-full flex items-center ${isSidebarCollapsed && !isSidebarHovered ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl font-semibold transition-all duration-300 ease-in-out ${viewMode === 'admin' ? 'bg-slate-700/50 text-amber-500 border-l-4 border-amber-500' : 'hover:bg-white/10 hover:text-white text-slate-400'}`}
            >
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <AnimatePresence>
                {(!isSidebarCollapsed || isSidebarHovered) && (
                  <motion.span 
                    key="admin-text"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {googleAccessToken ? 'Admin Center' : 'Admin Login'}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

          <AnimatePresence>
            {(!isSidebarCollapsed || isSidebarHovered) && (
              <motion.div 
                key="quick-links"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-8 px-4 overflow-hidden"
              >
                <div className="space-y-6">
                  {pinnedAssets.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        Pinned Assets
                      </h3>
                      <div className="space-y-2">
                        {pinnedAssets.map(asset => {
                          const isFolder = asset.mimeType === 'application/vnd.google-apps.folder';
                          return (
                            <button
                              key={asset.id}
                              onClick={() => {
                                if (isFolder) {
                                  setSelectedFolder(asset);
                                } else {
                                  setSelectedPreviewFile(asset);
                                }
                                setViewMode('assets');
                              }}
                              className="w-full flex items-center gap-3 text-xs text-slate-400 hover:text-white transition-all group py-1"
                            >
                              {isFolder ? (
                                <Folder className="w-3 h-3 shrink-0 group-hover:text-amber-500 transition-colors" />
                              ) : (
                                <ExternalLink className="w-3 h-3 shrink-0 group-hover:text-amber-500 transition-colors" />
                              )}
                              <span className="truncate">{asset.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Quick Links</h3>
                    <div className="space-y-3">
                      {quickLinks.map(link => (
                        <a 
                          key={link.id} 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-xs text-slate-400 hover:text-white transition-all group py-1"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0 group-hover:text-amber-500 transition-colors" />
                          <span>{link.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {isFirebaseConfigured && (
          <div className="p-4 border-t border-slate-700/50">
            {user ? (
              <div className={`flex items-center ${isSidebarCollapsed && !isSidebarHovered ? 'justify-center' : 'gap-3'}`}>
                {user.photoURL && <img src={user.photoURL} className="w-8 h-8 rounded-full border border-slate-600 shrink-0" alt="Profile" referrerPolicy="no-referrer" />}
                {(!isSidebarCollapsed || isSidebarHovered) && (
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
                    <button onClick={handleLogout} className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors">Sign Out</button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className={`w-full flex items-center justify-center ${isSidebarCollapsed && !isSidebarHovered ? 'p-2' : 'gap-2 px-4 py-2'} bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all`}
              >
                <Lock className="w-3.5 h-3.5 shrink-0" />
                {(!isSidebarCollapsed || isSidebarHovered) && <span>Sign In</span>}
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
          <h1 className="text-lg font-bold text-slate-800">
            {viewMode === 'assets' ? 'Marketing Assets' : viewMode === 'requests' ? 'Asset Requests' : 'Admin Center'}
          </h1>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Request Asset
            </button>
            
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative p-2 rounded-full transition-all ${showNotifications ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                  <Bell className="w-5 h-5" />
                  {notifications.some(n => !n.read) && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                  )}
                </button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-[400px] bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col"
                    >
                      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
                        <h3 className="text-xl font-bold text-slate-900">Notifications</h3>
                        <button 
                          onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                          className="text-[11px] text-amber-600 hover:text-amber-700 transition-colors uppercase font-bold tracking-wider"
                        >
                          Mark all read
                        </button>
                      </div>
                      <div className="max-h-[460px] overflow-y-auto no-scrollbar">
                        {notifications.length > 0 ? (
                          <div className="divide-y divide-slate-50">
                            {notifications.map(n => (
                              <div 
                                key={n.id} 
                                onClick={() => {
                                  if (n.file) {
                                    setSelectedPreviewFile(n.file);
                                    setViewMode('assets');
                                    setShowNotifications(false);
                                  }
                                  setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, read: true } : notif));
                                }}
                                className={`group relative p-6 transition-all hover:bg-slate-50/80 cursor-pointer ${!n.read ? 'bg-amber-50/20' : ''}`}
                              >
                                {!n.read && (
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
                                )}
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="text-[15px] font-bold text-slate-900 pr-8">{n.title}</h4>
                                  <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">{n.time}</span>
                                </div>
                                <p className="text-[13px] text-slate-500 leading-relaxed pr-6">{n.message}</p>
                                
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNotifications(prev => prev.filter(notif => notif.id !== n.id));
                                  }}
                                  className="absolute right-4 top-6 p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-rose-50"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-20 text-center flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                              <Bell className="w-8 h-8 text-slate-200" />
                            </div>
                            <p className="text-sm font-medium text-slate-400">No new notifications</p>
                          </div>
                        )}
                      </div>
                      
                      {notifications.length > 0 && (
                        <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                          <button 
                            onClick={() => setNotifications([])}
                            className="w-full py-3 text-[11px] text-slate-500 hover:text-rose-600 transition-colors uppercase font-bold tracking-widest text-center"
                          >
                            Clear all notifications
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="w-full mx-auto max-w-[1600px]">
            {viewMode === 'assets' ? (
              <AssetsView 
                key={`assets-view-${homeResetToken}`}
                googleAccessToken={googleAccessToken}
                onGoogleLogout={handleGoogleLogout}
                addNotification={addNotification}
                initialPreviewFile={selectedPreviewFile}
                onClearInitialPreview={() => setSelectedPreviewFile(null)}
                initialFolder={selectedFolder}
                onClearInitialFolder={() => setSelectedFolder(null)}
                pinnedAssets={pinnedAssets}
                onTogglePin={togglePinAsset}
              />
            ) : viewMode === 'requests' ? (
              <RequestsView 
                requests={assetRequests} 
                hasAdminAccess={!!googleAccessToken}
                onStatusChange={updateRequestStatus}
              />
            ) : (
              <AdminView 
                notificationSettings={notificationSettings}
                onUpdateNotificationSettings={handleUpdateNotificationSettings}
                googleAccessToken={googleAccessToken}
                onGoogleAuthSuccess={handleGoogleAuthSuccess}
                onGoogleLogout={handleGoogleLogout}
                addNotification={addNotification}
                quickLinks={quickLinks}
                onUpdateQuickLinks={updateQuickLinks}
              />
            )}
          </div>
        </main>

        {/* Toast Notifications */}
        <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-3 pointer-events-none">
          <AnimatePresence>
            {toasts.map(toast => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${
                  toast.type === 'success' 
                    ? 'bg-emerald-500 text-white border-emerald-400' 
                    : toast.type === 'error'
                      ? 'bg-rose-500 text-white border-rose-400'
                      : 'bg-indigo-600 text-white border-indigo-500'
                }`}
              >
                {toast.type === 'success' ? <Check className="w-5 h-5" /> : 
                 toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                <p className="text-sm font-bold truncate max-w-[250px]">{toast.message}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Request Asset Modal */}
      <AnimatePresence>
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary-dark/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900">Request an Asset</h2>
                <button onClick={() => setIsRequestModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  
                  const formData = new FormData(e.currentTarget);
                  const newRequest: RequestItem = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: formData.get('name') as string,
                    department: formData.get('department') as string,
                    asset: formData.get('asset') as string,
                    status: 'pending',
                    date: new Date().toISOString().split('T')[0]
                  };
                  
                  setAssetRequests(prev => [newRequest, ...prev]);
                  addNotification('Request Submitted', 'Marketing team will review and add the asset soon.', 'success', 'assetRequests');
                  setIsRequestModalOpen(false);
                }}
              >
                <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Your Name</label>
                    <input 
                      required
                      name="name"
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Department</label>
                    <select 
                      required
                      name="department"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                    >
                      <option value="">Select...</option>
                      <option value="Sales">Sales</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Customer Success">Customer Success</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Requested Asset</label>
                    <input 
                      required
                      name="asset"
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                      placeholder="e.g. Holiday campaign banner"
                    />
                  </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsRequestModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancel</button>
                  <button 
                    type="submit"
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-primary-dark text-sm font-bold rounded-lg transition-colors shadow-sm"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
