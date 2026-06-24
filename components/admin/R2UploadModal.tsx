import React, { useState, useRef } from 'react';
import { Upload, X, Music, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadResult {
  fileName: string;
  publicUrl: string;
  size: number;
  success: boolean;
  error?: string;
}

interface R2UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: 'songs' | 'reels' | 'covers';
  onUploadComplete?: (results: UploadResult[]) => void;
}

const R2UploadModal: React.FC<R2UploadModalProps> = ({
  isOpen, onClose, folder, onUploadComplete
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [results, setResults] = useState<UploadResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File): Promise<UploadResult> => {
    return new Promise((resolve) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        const xhr = new XMLHttpRequest();
        xhr.timeout = 5 * 60 * 1000; // 5 minutes max

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            setProgress(p => ({ ...p, [file.name]: percent }));
          }
        });

        xhr.addEventListener('load', () => {
          console.log('[Upload] Load event fired, status:', xhr.status);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              console.log('[Upload] Success:', result);
              resolve({
                fileName: file.name,
                publicUrl: result.secure_url,
                size: file.size,
                success: true,
              });
            } catch {
              resolve({
                fileName: file.name,
                publicUrl: '',
                size: file.size,
                success: false,
                error: 'Invalid server response',
              });
            }
          } else {
            resolve({
              fileName: file.name,
              publicUrl: '',
              size: file.size,
              success: false,
              error: `HTTP ${xhr.status}`,
            });
          }
        });

        xhr.addEventListener('error', () => {
          console.error('[Upload] Network error');
          resolve({
            fileName: file.name,
            publicUrl: '',
            size: file.size,
            success: false,
            error: 'Network error',
          });
        });

        xhr.addEventListener('timeout', () => {
          console.error('[Upload] Timeout after 5 minutes');
          resolve({
            fileName: file.name,
            publicUrl: '',
            size: file.size,
            success: false,
            error: 'Upload timed out',
          });
        });

        xhr.addEventListener('abort', () => {
          console.error('[Upload] Aborted');
          resolve({
            fileName: file.name,
            publicUrl: '',
            size: file.size,
            success: false,
            error: 'Upload aborted',
          });
        });

        xhr.open('POST', '/api/r2/upload');
        xhr.send(formData);
      } catch (e: any) {
        resolve({
          fileName: file.name,
          publicUrl: '',
          size: file.size,
          success: false,
          error: e.message,
        });
      }
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setResults([]);
    console.log('[Upload] Starting upload of', files.length, 'file(s)');

    const allResults: UploadResult[] = [];
    for (const file of files) {
      console.log('[Upload] Starting:', file.name);
      const result = await uploadFile(file);
      console.log('[Upload] Result for', file.name, ':', result.success ? 'SUCCESS' : 'FAILED', result.error || '');
      allResults.push(result);
      setResults([...allResults]);
    }

    setUploading(false);
    console.log('[Upload] All done. Results:', allResults.filter(r => r.success).length, 'succeeded,', allResults.filter(r => !r.success).length, 'failed');
    if (onUploadComplete) onUploadComplete(allResults);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
         onClick={onClose}>
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
           onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div>
            <h2 className="text-xl font-bold text-white">
              Upload to Cloudflare R2
            </h2>
            <p className="text-sm text-neutral-400 mt-0.5">
              Folder: <span className="text-[#A8E040]">{folder}</span>
            </p>
          </div>
          <button onClick={onClose}
                  className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-xs text-neutral-500 mb-4 bg-blue-900/20 border border-blue-500/20 rounded-xl p-3">
            Files upload through the server proxy — no CORS issues. After upload, you can add metadata (title/artist) to save to Firestore.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={
              folder === 'songs' ? 'audio/*' :
              folder === 'reels' ? 'video/*,audio/*' :
              'image/*'
            }
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-neutral-700 hover:border-[#A8E040] rounded-xl p-8 transition-colors flex flex-col items-center gap-3"
          >
            <Upload size={32} className="text-neutral-400" />
            <div className="text-center">
              <p className="text-white font-medium">
                Click to select files
              </p>
              <p className="text-sm text-neutral-500 mt-1">
                {folder === 'songs' && 'MP3, WAV, FLAC, OGG'}
                {folder === 'reels' && 'MP4, WebM, MOV'}
                {folder === 'covers' && 'JPG, PNG, WebP'}
              </p>
            </div>
          </button>

          {files.length > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-sm font-medium text-neutral-300">
                Files to upload ({files.length})
              </p>
              {files.map((file, i) => {
                const result = results.find(r => r.fileName === file.name);
                const pct = progress[file.name] || 0;

                return (
                  <div key={`${file.name}-${i}`}
                       className="bg-neutral-800 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Music size={16} className="text-neutral-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {formatSize(file.size)}
                        </p>
                      </div>
                      {result?.success && (
                        <CheckCircle size={18} className="text-green-500" />
                      )}
                      {result?.success === false && (
                        <AlertCircle size={18} className="text-red-500" />
                      )}
                      {!result && !uploading && (
                        <button onClick={() => removeFile(i)}
                                className="text-neutral-500 hover:text-white">
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    {uploading && !result && pct > 0 && (
                      <div className="mt-2 h-1 bg-neutral-700 rounded-full overflow-hidden">
                        <div className="h-full bg-[#A8E040] transition-all"
                             style={{ width: `${pct}%` }} />
                      </div>
                    )}

                    {result?.error && (
                      <p className="text-xs text-red-400 mt-1">
                        {result.error}
                      </p>
                    )}

                    {result?.success && (
                      <p className="text-xs text-green-400 mt-1 truncate">
                        ✓ {result.publicUrl}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-neutral-800 flex gap-3">
          <button onClick={onClose} disabled={uploading}
                  className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium disabled:opacity-50">
            {results.length > 0 ? 'Close' : 'Cancel'}
          </button>
          <button onClick={handleUpload}
                  disabled={files.length === 0 || uploading}
                  className="flex-1 py-3 rounded-xl bg-[#A8E040] hover:bg-[#98D030] text-black font-bold disabled:opacity-50">
            {uploading ? 'Uploading...' : `Upload ${files.length} file(s)`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default R2UploadModal;
