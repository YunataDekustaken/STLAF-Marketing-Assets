import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Trash2, 
  ExternalLink, 
  Loader2, 
  FileCode, 
  FileImage, 
  FileVideo, 
  FileAudio, 
  FileSpreadsheet, 
  FileArchive,
  Eye,
  Pin,
  X,
  Folder,
  File as FileIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AssetGalleryProps {
  files: any[];
  loading: boolean;
  onDelete: (id: string) => void;
  onFolderClick: (folderId: string, folderName: string) => void;
  gridSize: 'list' | 'small' | 'medium' | 'large';
  addNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning', settingKey?: string, file?: any) => void;
  initialPreviewFile?: any | null;
  onClearInitialPreview?: () => void;
  pinnedAssets?: any[];
  onTogglePin?: (asset: any) => void;
  hasAdminAccess?: boolean;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType === 'application/vnd.google-apps.folder') return <Folder className="w-10 h-10 text-amber-400" />;
  if (mimeType.includes('image')) return <FileImage className="w-10 h-10 text-blue-400" />;
  if (mimeType.includes('video')) return <FileVideo className="w-10 h-10 text-purple-400" />;
  if (mimeType.includes('audio')) return <FileAudio className="w-10 h-10 text-pink-400" />;
  if (mimeType.includes('pdf')) return <FileText className="w-10 h-10 text-rose-400" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="w-10 h-10 text-emerald-400" />;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <FileText className="w-10 h-10 text-orange-400" />;
  if (mimeType.includes('word') || mimeType.includes('document') || mimeType.includes('docx')) return <FileText className="w-10 h-10 text-blue-500" />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return <FileArchive className="w-10 h-10 text-amber-600" />;
  if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css')) return <FileCode className="w-10 h-10 text-slate-600" />;
  return <FileIcon className="w-10 h-10 text-slate-400" />;
};

export const AssetGallery: React.FC<AssetGalleryProps> = ({ 
  files, 
  loading, 
  onDelete, 
  onFolderClick, 
  gridSize,
  addNotification,
  initialPreviewFile,
  onClearInitialPreview,
  pinnedAssets = [],
  onTogglePin,
  hasAdminAccess
}) => {
  const [previewFile, setPreviewFile] = useState<any | null>(null);

  useEffect(() => {
    if (initialPreviewFile) {
      setPreviewFile(initialPreviewFile);
      onClearInitialPreview?.();
    }
  }, [initialPreviewFile, onClearInitialPreview]);

  if (loading && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Loading Drive assets...</p>
      </div>
    );
  }

  const gridClasses = {
    list: "flex flex-col gap-2",
    small: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4",
    medium: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6",
    large: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8"
  };

  const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
  const standardFiles = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

  const renderListItem = (file: any, isFolder: boolean) => (
    <motion.div
      key={file.id}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={`bg-white p-3 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex items-center justify-between group ${isFolder ? 'cursor-pointer' : ''}`}
      onClick={() => isFolder && onFolderClick(file.id, file.name)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div 
          className={`w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0 ${!isFolder ? 'cursor-pointer hover:bg-slate-100 transition-colors' : ''}`}
          onClick={(e) => {
            if (!isFolder) {
              e.stopPropagation();
              setPreviewFile(file);
            }
          }}
        >
          {isFolder ? <Folder className="w-5 h-5 text-amber-400" /> : getFileIcon(file.mimeType)}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 truncate" title={file.name}>{file.name}</h3>
          <p className="text-[10px] text-slate-500 uppercase font-medium">
            {isFolder ? 'Folder' : (file.name.split('.').pop() || file.mimeType.split('/').pop() || 'File')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onTogglePin?.(file)}
          className={`p-1.5 transition-all rounded-lg ${pinnedAssets.some(p => p.id === file.id) ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}
          title={pinnedAssets.some(p => p.id === file.id) ? "Unpin from sidebar" : "Pin to sidebar"}
        >
          <Pin className={`w-4 h-4 ${pinnedAssets.some(p => p.id === file.id) ? 'fill-current' : ''}`} />
        </button>
        {!isFolder && (
          <button
            onClick={() => setPreviewFile(file)}
            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        {!isFolder && (
          <a
            href={file.webContentLink || file.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
            title="Download"
            onClick={(e) => {
              e.stopPropagation();
              addNotification('Download Started', `Started downloading: ${file.name}`, 'success', 'fileDownloads', file);
            }}
          >
            <Download className="w-4 h-4" />
          </a>
        )}
        <a
          href={file.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
          title="View in Drive"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        {hasAdminAccess && (
          <button
            onClick={() => onDelete(file.id)}
            className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );

  const renderFolderGridItem = (folder: any) => (
    <motion.div
      key={folder.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
      onClick={() => onFolderClick(folder.id, folder.name)}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Folder className="w-6 h-6 text-amber-500 fill-current flex-shrink-0" />
        <h3 className="text-sm font-bold text-slate-700 truncate" title={folder.name}>{folder.name}</h3>
      </div>
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
         <button
          onClick={() => onTogglePin?.(folder)}
          className={`p-1.5 transition-all rounded-lg ${pinnedAssets.some(p => p.id === folder.id) ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}
          title={pinnedAssets.some(p => p.id === folder.id) ? "Unpin from sidebar" : "Pin to sidebar"}
        >
          <Pin className={`w-3.5 h-3.5 ${pinnedAssets.some(p => p.id === folder.id) ? 'fill-current' : ''}`} />
        </button>
        {hasAdminAccess && (
          <button
            onClick={() => onDelete(folder.id)}
            className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );

  const renderFileGridItem = (file: any) => (
    <motion.div
      key={file.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white p-2 pb-3 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group flex flex-col"
    >
      <div 
        className={`w-full bg-slate-50 rounded-xl mb-2 overflow-hidden flex items-center justify-center relative flex-shrink-0 cursor-pointer ${
          gridSize === 'small' ? 'h-24' : 'aspect-video'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          setPreviewFile(file);
        }}
      >
        {file.thumbnailLink ? (
          <img
            src={file.thumbnailLink.replace('=s220', gridSize === 'large' ? '=s800' : '=s400')}
            alt={file.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            {getFileIcon(file.mimeType)}
          </div>
        )}
        
        {/* Overlay */}
        <div 
          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10" 
          onClick={(e) => {
            e.stopPropagation();
            setPreviewFile(file);
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin?.(file);
            }}
            className={`bg-white rounded-lg hover:bg-amber-500 transition-colors flex items-center justify-center ${
              gridSize === 'small' ? 'p-1.5' : 'p-2'
            } ${pinnedAssets.some(p => p.id === file.id) ? 'text-amber-500' : 'text-slate-900'}`}
            title={pinnedAssets.some(p => p.id === file.id) ? "Unpin from sidebar" : "Pin to sidebar"}
          >
            <Pin className={(gridSize === 'small' ? 'w-3.5 h-3.5 ' : 'w-4 h-4 ') + (pinnedAssets.some(p => p.id === file.id) ? 'fill-current' : '')} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPreviewFile(file);
            }}
            className={`bg-white rounded-lg text-slate-900 hover:bg-amber-500 transition-colors flex items-center justify-center ${
              gridSize === 'small' ? 'p-1.5' : 'p-2'
            }`}
            title="Preview"
          >
            <Eye className={gridSize === 'small' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          </button>
          <a
            href={file.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`bg-white rounded-lg text-slate-900 hover:bg-amber-500 transition-colors flex items-center justify-center ${
              gridSize === 'small' ? 'p-1.5' : 'p-2'
            }`}
            title="View in Drive"
          >
            <ExternalLink className={gridSize === 'small' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          </a>
          {hasAdminAccess && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(file.id);
              }}
              className={`bg-white rounded-lg text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center ${
                gridSize === 'small' ? 'p-1.5' : 'p-2'
              }`}
              title="Delete"
            >
              <Trash2 className={gridSize === 'small' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-start justify-between gap-2 px-2">
        <div className="min-w-0">
          <h3 className={`font-bold text-slate-900 truncate ${gridSize === 'small' ? 'text-xs' : 'text-sm'}`} title={file.name}>
            {file.name}
          </h3>
          <p className="text-[10px] text-slate-500 uppercase font-medium">
            {file.name.split('.').pop() || file.mimeType.split('/').pop() || 'File'}
          </p>
        </div>
        {gridSize !== 'small' && (
          <a
            href={file.webContentLink || file.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all flex-shrink-0"
            title="Download"
            onClick={(e) => {
              e.stopPropagation();
              addNotification('Download Started', `Started downloading: ${file.name}`, 'success', 'fileDownloads', file);
            }}
          >
            <Download className="w-4 h-4" />
          </a>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-8">
      {gridSize === 'list' && files.length > 0 && (
        <div className={gridClasses['list']}>
          <AnimatePresence mode="popLayout">
            {files.map(file => renderListItem(file, file.mimeType === 'application/vnd.google-apps.folder'))}
          </AnimatePresence>
        </div>
      )}

      {gridSize !== 'list' && folders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-1">Folders</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            <AnimatePresence mode="popLayout">
              {folders.map(folder => renderFolderGridItem(folder))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {gridSize !== 'list' && standardFiles.length > 0 && (
        <div className="space-y-3">
          {folders.length > 0 && <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-1">Files</h3>}
          <div className={gridClasses[gridSize]}>
            <AnimatePresence mode="popLayout">
              {standardFiles.map(file => renderFileGridItem(file))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {files.length === 0 && !loading && (
        <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-medium">No files found in this folder.</p>
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 truncate">{previewFile.name}</h2>
                </div>
                <div className="flex items-center gap-2">
                  {previewFile.mimeType !== 'application/vnd.google-apps.folder' && (
                    <button
                      onClick={() => onTogglePin?.(previewFile)}
                      className={`p-2 rounded-xl border transition-all ${
                        pinnedAssets.some(p => p.id === previewFile.id)
                          ? 'bg-amber-50 border-amber-200 text-amber-600'
                          : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                      }`}
                      title={pinnedAssets.some(p => p.id === previewFile.id) ? "Unpin from sidebar" : "Pin to sidebar"}
                    >
                      <Pin className={`w-4 h-4 ${pinnedAssets.some(p => p.id === previewFile.id) ? 'fill-current' : ''}`} />
                    </button>
                  )}
                  <button 
                    onClick={() => setPreviewFile(null)} 
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-slate-500" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 bg-slate-100 relative">
                <iframe
                  src={`https://drive.google.com/file/d/${previewFile.id}/preview`}
                  className="w-full h-full border-none"
                  allow="autoplay"
                />
              </div>

              <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Type: <span className="font-bold text-slate-700 uppercase">{previewFile.mimeType.split('/').pop()}</span>
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href={previewFile.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in Drive
                  </a>
                  <a
                    href={previewFile.webContentLink || previewFile.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => addNotification('Download Started', `Started downloading: ${previewFile.name}`, 'success', 'fileDownloads', previewFile)}
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl text-sm font-bold transition-all shadow-lg shadow-amber-100 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
