import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export const ROOT_FOLDER_ID = '1MWfdDx8uR55IKsgo9Y741BuxR-EJoesU';

export const useGoogleDrive = (
  currentFolderId: string = ROOT_FOLDER_ID
) => {
  const { googleAccessToken } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<{detected: boolean, email: string} | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Check health/config first
      const healthResponse = await fetch('/api/health');
      const healthText = await healthResponse.text();
      let healthData;
      try {
        healthData = JSON.parse(healthText);
      } catch (e) {
        console.warn('Health check returned non-JSON', healthText);
        healthData = { google_drive_key_detected: false, service_account_email: 'unknown' };
      }
      
      setServiceStatus({
        detected: healthData.google_drive_key_detected,
        email: healthData.service_account_email
      });

      const response = await fetch(`/api/drive/files?folderId=${currentFolderId}`);
      const text = await response.text();
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Server returned invalid response: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
      }
      
      if (!response.ok) {
        throw new Error(data.error || `Server Error (${response.status})`);
      }
      
      setFiles(data.files || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId]);

  const uploadFile = async (file: File, customName?: string) => {
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', currentFolderId);
      if (customName) {
        formData.append('name', customName);
      }

      const headers: Record<string, string> = {};
      if (googleAccessToken) {
        headers['Authorization'] = `Bearer ${googleAccessToken}`;
      }

      const response = await fetch('/api/drive/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Upload server returned invalid response: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
      }

      if (!response.ok) {
        throw new Error(data.details || data.error || `Upload failed (${response.status})`);
      }
      
      await fetchFiles();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    setError(null);
    // Optimistically remove from UI immediately
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (googleAccessToken) {
        headers['Authorization'] = `Bearer ${googleAccessToken}`;
      }

      const response = await fetch(`/api/drive/files/${fileId}?folderId=${currentFolderId}`, {
        method: 'DELETE',
        headers,
      });

      const text = await response.text();
      if (!response.ok) {
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          await fetchFiles(); // restore correct state on failure
          throw new Error(`Delete failed (${response.status}): ${text.substring(0, 100)}`);
        }

        if (response.status === 401 || (data.error && data.error.includes('authentication'))) {
          await fetchFiles();
          throw new Error('Your Google session has expired. Please log out and sign in again to refresh your permissions.');
        }

        await fetchFiles(); // restore correct state on failure
        throw new Error(data.details || data.error || `Delete failed (${response.status})`);
      }

      // Check which deletion method was used
      let responseData: any = {};
      try { responseData = JSON.parse(text); } catch (_) {}

      const wasRealDelete = 
        responseData.method === 'user_permanent_delete' || 
        responseData.method === 'system_permanent_delete' ||
        responseData.method === 'user_trash' ||
        responseData.method === 'system_trash';
  
      if (!wasRealDelete) {
        // Only for unlink/remove-from-folder: re-fetch after delay
        setTimeout(() => fetchFiles(), 3000);
      }
      // For real deletes and trash: keep optimistic removal, no re-fetch
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const renameFile = async (fileId: string, newName: string) => {
    setError(null);
    setLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (googleAccessToken) {
        headers['Authorization'] = `Bearer ${googleAccessToken}`;
      }

      const response = await fetch(`/api/drive/files/${fileId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ name: newName }),
      });

      const text = await response.text();
      if (!response.ok) {
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`Rename failed (${response.status}): ${text.substring(0, 100)}`);
        }
        throw new Error(data.details || data.error || `Rename failed (${response.status})`);
      }
      await fetchFiles();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { files, loading, error, serviceStatus, fetchFiles, uploadFile, deleteFile, renameFile };
};
