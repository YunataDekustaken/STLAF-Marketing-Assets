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

  getLocalNotifications(): any[] {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.NOTIFICATIONS);
    return stored ? JSON.parse(stored) : [];
  },

  subscribeToNotifications(userId: string | null, callback: (notifs: any[]) => void) {
    if (isFirebaseConfigured) {
      const targetUserId = userId || 'guest_user';
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', targetUserId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      return onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(notifs);
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
  }
};
