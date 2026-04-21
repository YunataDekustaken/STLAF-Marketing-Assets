import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  FileText, 
  FolderOpen, 
  Cloud, 
  RefreshCw, 
  ExternalLink, 
  LayoutGrid, 
  List, 
  ChevronRight, 
  Home,
  Grid2X2,
  Square,
  Upload,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Asset, ASSET_CATEGORIES } from '../types';
import { GoogleAuth } from './GoogleAuth';
import { AssetGallery } from './AssetGallery';
import { UploadZone } from './UploadZone';
import { useGoogleDrive, ROOT_FOLDER_ID } from '../hooks/useGoogleDrive';

export const AssetsView = ({ 
  googleAccessToken,
  onGoogleLogout,
  addNotification,
  initialPreviewFile,
  onClearInitialPreview,
  initialFolder,
  onClearInitialFolder,
  pinnedAssets = [],
  onTogglePin
}: { 
  key?: React.Key;
  googleAccessToken: string | null;
  onGoogleLogout: () => void;
  addNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning', settingKey?: string, file?: any) => void;
  initialPreviewFile?: any | null;
  onClearInitialPreview?: () => void;
  initialFolder?: any | null;
  onClearInitialFolder?: () => void;
  pinnedAssets?: any[];
  onTogglePin?: (asset: any) => void;
}) => {
  const [gridSize, setGridSize] = useState<'list' | 'small' | 'medium' | 'large'>('medium');
  const [folderStack, setFolderStack] = useState<{id: string, name: string}[]>([{id: ROOT_FOLDER_ID, name: 'Root'}]);
  const [sortOption, setSortOption] = useState<string>('name-asc');
  
  useEffect(() => {
    if (initialFolder) {
      setFolderStack([{id: ROOT_FOLDER_ID, name: 'Root'}, {id: initialFolder.id, name: initialFolder.name}]);
      onClearInitialFolder?.();
    }
  }, [initialFolder, onClearInitialFolder]);

  const currentFolder = folderStack[folderStack.length - 1];
  const { files, loading, fetchFiles, uploadFile: originalUpload, deleteFile: originalDelete } = useGoogleDrive(googleAccessToken, currentFolder.id, onGoogleLogout);

  const sortedFiles = React.useMemo(() => {
    return [...files].sort((a, b) => {
      // Always put folders first, regardless of sort option
      const isAFolder = a.mimeType === 'application/vnd.google-apps.folder';
      const isBFolder = b.mimeType === 'application/vnd.google-apps.folder';
      if (isAFolder && !isBFolder) return -1;
      if (!isAFolder && isBFolder) return 1;

      switch (sortOption) {
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'date-desc':
          return new Date(b.modifiedTime || 0).getTime() - new Date(a.modifiedTime || 0).getTime();
        case 'date-asc':
          return new Date(a.modifiedTime || 0).getTime() - new Date(b.modifiedTime || 0).getTime();
        case 'size-desc':
          return (parseInt(b.size) || 0) - (parseInt(a.size) || 0);
        case 'size-asc':
          return (parseInt(a.size) || 0) - (parseInt(b.size) || 0);
        default:
          return 0;
      }
    });
  }, [files, sortOption]);


  const uploadFile = async (file: File) => {
    try {
      addNotification('Upload Started', `Uploading ${file.name}...`, 'info', 'driveUploads');
      await originalUpload(file);
      addNotification('Upload Successful', `Successfully uploaded ${file.name}`, 'success', 'driveUploads');
    } catch (err: any) {
      addNotification('Upload Failed', `Failed to upload ${file.name}: ${err.message}`, 'warning', 'driveUploads');
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      await originalDelete(fileId);
      addNotification('Deleted', `Item deleted successfully`, 'success');
    } catch (err: any) {
      addNotification('Delete Error', `Failed to delete item: ${err.message}`, 'warning');
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles, currentFolder.id]);

  const handleFolderClick = (folderId: string, folderName: string) => {
    setFolderStack(prev => [...prev, { id: folderId, name: folderName }]);
  };

  const navigateToBreadcrumb = (index: number) => {
    setFolderStack(prev => prev.slice(0, index + 1));
  };

  const gridSizeIcons = {
    list: <List className="w-4 h-4" />,
    small: <Grid2X2 className="w-4 h-4" />,
    medium: <LayoutGrid className="w-4 h-4" />,
    large: <Square className="w-4 h-4" />
  };

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        <motion.div
          key="drive"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            
            {/* Left side: Heading, Subtitle, and Breadcrumbs */}
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-900 whitespace-nowrap">Google Drive Assets</h2>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => fetchFiles()}
                      disabled={loading}
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all disabled:opacity-50"
                      title="Refresh files"
                    >
                      <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <a 
                      href={`https://drive.google.com/drive/folders/1MWfdDx8uR55IKsgo9Y741BuxR-EJoesU`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                      title="Open Folder in Drive"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>
                <p className="text-slate-500 text-sm">Manage files directly in your shared marketing folder.</p>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {folderStack.map((folder, index) => (
                  <React.Fragment key={folder.id}>
                    {index > 0 && <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                    <button
                      onClick={() => navigateToBreadcrumb(index)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                        index === folderStack.length - 1
                          ? 'bg-amber-50 text-amber-700'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {index === 0 ? <Home className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
                      {folder.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Right side: Upload and view controls */}
            <div className="flex flex-col items-end gap-3 shrink-0">
              {googleAccessToken && <UploadZone onUpload={uploadFile} loading={loading} isSmall />}
              <div className="flex flex-row items-center gap-3 w-fit">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl text-sm font-medium text-slate-600 focus-within:ring-2 focus-within:ring-amber-500/50 transition-all w-fit">
                  <ArrowUpDown className="w-4 h-4 text-slate-400" />
                  <select 
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer appearance-none pr-4"
                  >
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="size-desc">Largest First</option>
                    <option value="size-asc">Smallest First</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                  {(['list', 'small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setGridSize(size)}
                      className={`p-2 rounded-lg transition-all relative group ${
                        gridSize === size 
                          ? 'bg-white text-slate-900 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {gridSizeIcons[size]}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        {size.charAt(0).toUpperCase() + size.slice(1)} View
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <AssetGallery 
              files={sortedFiles} 
              loading={loading} 
              onDelete={deleteFile} 
              onFolderClick={handleFolderClick}
              gridSize={gridSize}
              addNotification={addNotification}
              initialPreviewFile={initialPreviewFile}
              onClearInitialPreview={onClearInitialPreview}
              pinnedAssets={pinnedAssets}
              onTogglePin={onTogglePin}
              hasAdminAccess={!!googleAccessToken}
            />
          </div>
          </motion.div>
      </AnimatePresence>
    </div>
  );
};

