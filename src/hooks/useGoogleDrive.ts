import { useState, useCallback } from 'react';

const API_KEY = 'AIzaSyDPmCrFDf9OOl-fGp7aYngSpfZLMA3seNs';
export const ROOT_FOLDER_ID = '1MWfdDx8uR55IKsgo9Y741BuxR-EJoesU';

export const useGoogleDrive = (
  accessToken: string | null, 
  currentFolderId: string = ROOT_FOLDER_ID,
  onUnauthorized?: () => void
) => {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${currentFolderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,thumbnailLink,webViewLink,webContentLink,modifiedTime,size)&key=${API_KEY}`,
        {
          headers,
        }
      );
      
      if (response.status === 401 && accessToken) {
        onUnauthorized?.();
        throw new Error('Session expired. Please reconnect to Google Drive.');
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      setFiles(data.files || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, currentFolderId, onUnauthorized]);

  const uploadFile = async (file: File) => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const metadata = {
        name: file.name,
        parents: [currentFolderId],
      };

      const formData = new FormData();
      formData.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      );
      formData.append('file', file);

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,thumbnailLink,webViewLink,webContentLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      if (response.status === 401) {
        onUnauthorized?.();
        throw new Error('Session expired. Please reconnect to Google Drive.');
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
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
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.status === 401) {
        onUnauthorized?.();
        throw new Error('Session expired. Please reconnect to Google Drive.');
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Delete failed');
      }
      await fetchFiles();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { files, loading, error, fetchFiles, uploadFile, deleteFile };
};
