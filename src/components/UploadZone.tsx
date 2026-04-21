import React, { useState, useCallback } from 'react';
import { Upload, File, X, Loader2 } from 'lucide-react';

interface UploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  loading: boolean;
  isSmall?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUpload, loading, isSmall }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      for (const file of files) {
        await onUpload(file);
      }
    }
  }, [onUpload]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      for (const file of files) {
        await onUpload(file);
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative"
    >
      <input
        type="file"
        multiple
        onChange={handleFileSelect}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        disabled={loading}
      />
      
      <button
        disabled={loading}
        className={`flex items-center gap-2 rounded-xl font-bold text-xs transition-all shadow-sm border-2 border-dashed ${
          isSmall ? 'px-4 py-2' : 'px-6 py-3 text-sm'
        } ${
          isDragging
            ? 'border-amber-500 bg-amber-50 text-amber-700 scale-105'
            : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400 hover:bg-slate-50'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
        ) : (
          <Upload className={`w-3.5 h-3.5 ${isDragging ? 'text-amber-500' : 'text-slate-400'}`} />
        )}
        <span>{loading ? 'Uploading...' : 'Upload Files'}</span>
      </button>

      {isDragging && (
        <div className="absolute -inset-2 bg-amber-500/10 border-2 border-amber-500 border-dashed rounded-2xl pointer-events-none z-0 animate-pulse" />
      )}
    </div>
  );
};
