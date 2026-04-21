import { useState, useCallback } from 'react';

export const ROOT_FOLDER_ID = '1MWfdDx8uR55IKsgo9Y741BuxR-EJoesU';

export const useGoogleDrive = (
  currentFolderId: string = ROOT_FOLDER_ID
) => {
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
      const healthData = await healthResponse.json();
      setServiceStatus({
        detected: healthData.google_drive_key_detected,
        email: healthData.service_account_email
      });

      const response = await fetch(`/api/drive/files?folderId=${currentFolderId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch files');
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

      const response = await fetch('/api/drive/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
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
      const response = await fetch(`/api/drive/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
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
      const response = await fetch(`/api/drive/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Rename failed');
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
