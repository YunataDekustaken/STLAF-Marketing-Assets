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

      const response = await fetch(`/api/drive/files?folderId=${currentFolderId}&t=${Date.now()}`);
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
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`Upload failed (${response.status}): ${text.substring(0, 50)}`);
        }
        
        if (response.status === 401 || response.status === 403 || data.needsReauth) {
          throw new Error('Your Google session has expired or has insufficient permissions. Please log out and sign in again, ensuring you check the Google Drive access box.');
        }

        throw new Error(data.error || `Upload failed (${response.status})`);
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
          throw new Error(`Delete failed (${response.status}): ${text.substring(0, 100)}`);
        }
        
        // Custom handling for authentication errors
        if (response.status === 401 || (data.error && data.error.includes('authentication'))) {
          throw new Error('Your Google session has expired. Please log out and sign in again to refresh your permissions.');
        }
        
        throw new Error(data.details || data.error || `Delete failed (${response.status})`);
      }
      await fetchFiles();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const renameFile = async (fileId: string, newName: string) => {
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
          throw new Error(`Rename failed (${response.status}): ${text.substring(0, 50)}`);
        }

        if (response.status === 401 || response.status === 403 || data.needsReauth) {
          throw new Error('Your Google session has expired or has insufficient permissions. Please log out and sign in again, ensuring you check the Google Drive access box.');
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
