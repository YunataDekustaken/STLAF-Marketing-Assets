import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { Asset, INITIAL_ASSETS } from '../types';

const LOCAL_STORAGE_KEYS = {
  ASSETS: 'marketing_assets_library',
  NOTIFICATIONS: 'marketing_assets_notifications',
  SETTINGS: 'marketing_assets_settings',
  SOCIAL_LINKS: 'marketing_assets_social_links'
};

export const persistenceService = {
  // Assets
  async saveAsset(asset: Asset) {
    if (isFirebaseConfigured) {
      await setDoc(doc(db, 'assets', asset.id), asset);
    } else {
      const assets = this.getLocalAssets();
      const index = assets.findIndex(a => a.id === asset.id);
      if (index >= 0) {
        assets[index] = asset;
      } else {
        assets.unshift(asset);
      }
      localStorage.setItem(LOCAL_STORAGE_KEYS.ASSETS, JSON.stringify(assets));
      window.dispatchEvent(new Event('storage_assets'));
    }
  },

  async deleteAsset(id: string) {
    if (isFirebaseConfigured) {
      await deleteDoc(doc(db, 'assets', id));
    } else {
      const assets = this.getLocalAssets();
      const filtered = assets.filter(a => a.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEYS.ASSETS, JSON.stringify(filtered));
      window.dispatchEvent(new Event('storage_assets'));
    }
  },

  getLocalAssets(): Asset[] {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.ASSETS);
    return stored ? JSON.parse(stored) : INITIAL_ASSETS;
  },

  subscribeToAssets(callback: (assets: Asset[]) => void) {
    if (isFirebaseConfigured) {
      const assetsRef = collection(db, 'assets');
      return onSnapshot(assetsRef, (snapshot) => {
        const assets = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Asset[];
        callback(assets);
      });
    } else {
      callback(this.getLocalAssets());
      const handleStorage = () => callback(this.getLocalAssets());
      window.addEventListener('storage_assets', handleStorage);
      return () => window.removeEventListener('storage_assets', handleStorage);
    }
  },

  // Notifications
  async addNotification(notification: any) {
    if (isFirebaseConfigured) {
      await addDoc(collection(db, 'notifications'), {
        ...notification,
        createdAt: serverTimestamp()
      });
    } else {
      const notifs = this.getLocalNotifications();
      const newNotif = {
        ...notification,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        read: false
      };
      notifs.unshift(newNotif);
      localStorage.setItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs.slice(0, 50)));
      window.dispatchEvent(new Event('storage_notifications'));
    }
  },

  async updateNotification(id: string, updates: any) {
    if (isFirebaseConfigured) {
      await setDoc(doc(db, 'notifications', id), updates, { merge: true });
    } else {
      const notifs = this.getLocalNotifications();
      const index = notifs.findIndex(n => n.id === id);
      if (index !== -1) {
        notifs[index] = { ...notifs[index], ...updates };
        localStorage.setItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
        window.dispatchEvent(new Event('storage_notifications'));
      }
    }
  },

  async deleteNotification(id: string) {
    if (isFirebaseConfigured) {
      await deleteDoc(doc(db, 'notifications', id));
    } else {
      const notifs = this.getLocalNotifications();
      const filtered = notifs.filter(n => n.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(filtered));
      window.dispatchEvent(new Event('storage_notifications'));
    }
  },

  async clearAllNotifications(userId: string) {
    if (isFirebaseConfigured) {
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      const notifs = await persistenceService.getLocalNotificationsForUserOnce(userId);
      await Promise.all(notifs.map(n => deleteDoc(doc(db, 'notifications', n.id))));
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
      window.dispatchEvent(new Event('storage_notifications'));
    }
  },

  async getLocalNotificationsForUserOnce(userId: string): Promise<any[]> {
    // Helper for clearing
    if (isFirebaseConfigured) {
      const { getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return [];
  },

  getLocalNotifications(): any[] {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS);
    return stored ? JSON.parse(stored) : [];
  },

  // In persistenceService.ts
  async notifySupervisors(notification: any) {
    if (isFirebaseConfigured) {
      console.log('Starting supervisor notification process...');
      try {
        const { getDocs, query, collection, where } = await import('firebase/firestore');
        const supervisorsQuery = query(
          collection(db, 'users'), 
          where('role', '==', 'marketing_supervisor'),
          where('status', '==', 'active')
        );
        const snapshot = await getDocs(supervisorsQuery);
        console.log(`Found ${snapshot.size} active supervisors to notify.`);
        
        const promises = snapshot.docs.map(supervisorDoc => {
          const supervisorData = supervisorDoc.data();
          // Only notify if they have the setting enabled (default to true)
          const settings = supervisorData.notificationSettings || {};
          console.log(`Checking settings for supervisor ${supervisorDoc.id}:`, settings);
          
          if (settings.memberUploads !== false) {
            console.log(`Sending notification to supervisor: ${supervisorDoc.id}`);
            return addDoc(collection(db, 'notifications'), {
              ...notification,
              userId: supervisorDoc.id,
              createdAt: serverTimestamp()
            });
          }
          console.log(`Supervisor ${supervisorDoc.id} has disabled member upload notifications.`);
          return Promise.resolve();
        });
        await Promise.all(promises);
        console.log('Supervisor notification process complete.');
      } catch (error) {
        console.error('Error notifying supervisors:', error);
      }
    } else {
      console.log('Firebase not configured, skipping supervisor notifications.');
    }
  },

  subscribeToNotifications(userId: string | null, callback: (notifs: any[]) => void) {
    if (isFirebaseConfigured) {
      const targetUserId = userId || 'guest_user';
      // Simplified query to avoid immediate index requirement
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', targetUserId),
        limit(100)
      );
      return onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a: any, b: any) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return timeB.getTime() - timeA.getTime();
          });
        callback(notifs.slice(0, 50));
      });
    } else {
      callback(this.getLocalNotifications());
      const handleNotifUpdate = () => callback(this.getLocalNotifications());
      window.addEventListener('storage_notifications', handleNotifUpdate);
      return () => window.removeEventListener('storage_notifications', handleNotifUpdate);
    }
  },

  // Settings & Social Links
  async saveSocialLinks(links: any) {
    if (isFirebaseConfigured) {
      await setDoc(doc(db, 'settings', 'social_links'), links);
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEYS.SOCIAL_LINKS, JSON.stringify(links));
      window.dispatchEvent(new Event('storage_settings'));
    }
  },

  subscribeToSocialLinks(callback: (links: any) => void) {
    if (isFirebaseConfigured) {
      return onSnapshot(doc(db, 'settings', 'social_links'), (snapshot) => {
        if (snapshot.exists()) callback(snapshot.data());
      });
    } else {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.SOCIAL_LINKS);
      if (stored) callback(JSON.parse(stored));
      const handleSettingsUpdate = () => {
        const s = localStorage.getItem(LOCAL_STORAGE_KEYS.SOCIAL_LINKS);
        if (s) callback(JSON.parse(s));
      };
      window.addEventListener('storage_settings', handleSettingsUpdate);
      return () => window.removeEventListener('storage_settings', handleSettingsUpdate);
    }
  },

  // Pinned Assets
  subscribeToPinnedAssets(userId: string, callback: (pins: any[]) => void) {
    if (isFirebaseConfigured) {
      const q = query(
        collection(db, 'pinnedAssets'),
        where('userId', '==', userId)
      );
      return onSnapshot(q, (snapshot) => {
        const pins = snapshot.docs.map(doc => ({ 
          ...doc.data(), 
          id: doc.id,
          assetId: doc.data().assetId
        }))
        .sort((a: any, b: any) => {
          const timeA = a.pinnedAt?.toMillis ? a.pinnedAt.toMillis() : (a.pinnedAt || 0);
          const timeB = b.pinnedAt?.toMillis ? b.pinnedAt.toMillis() : (b.pinnedAt || 0);
          return timeB - timeA;
        });
        callback(pins);
      });
    }
    return () => {};
  },

  async togglePinnedAsset(userId: string, asset: any) {
    if (!isFirebaseConfigured) return;
    
    const q = query(
      collection(db, 'pinnedAssets'),
      where('userId', '==', userId),
      where('assetId', '==', asset.id)
    );
    
    const { getDocs } = await import('firebase/firestore');
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      // Unpin
      await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, 'pinnedAssets', d.id))));
      return false; // Removed
    } else {
      // Pin
      await addDoc(collection(db, 'pinnedAssets'), {
        userId,
        assetId: asset.id,
        name: asset.name,
        mimeType: asset.mimeType,
        pinnedAt: serverTimestamp()
      });
      return true; // Added
    }
  },

  // User Settings (Notification preferences etc)
  async saveUserSettings(userId: string, settings: any) {
    if (isFirebaseConfigured) {
      await setDoc(doc(db, 'users', userId), { notificationSettings: settings }, { merge: true });
    }
  },

  subscribeToUserSettings(userId: string, callback: (settings: any) => void) {
    if (isFirebaseConfigured) {
      return onSnapshot(doc(db, 'users', userId), (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data()?.notificationSettings || {});
        }
      });
    }
    return () => {};
  },

  // Global Settings (Quick Links etc)
  async saveQuickLinks(links: any[]) {
    if (isFirebaseConfigured) {
      await setDoc(doc(db, 'settings', 'navigation'), { quickLinks: links }, { merge: true });
    }
  },

  subscribeToQuickLinks(callback: (links: any[]) => void) {
    if (isFirebaseConfigured) {
      return onSnapshot(doc(db, 'settings', 'navigation'), (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data()?.quickLinks || []);
        }
      });
    }
    return () => {};
  }
};
