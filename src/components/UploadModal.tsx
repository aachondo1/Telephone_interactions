import { useEffect } from 'react';
import { X, UploadCloud } from 'lucide-react';
import { CSVUploader } from './CSVUploader';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
  error: string | null;
  progress: string;
  title?: string;
  description?: string;
};

export function UploadModal({ isOpen, onClose, onFileSelected, isProcessing, error, progress, title, description }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={() => !isProcessing && onClose()}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-[fadeSlideIn_0.2s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
              <UploadCloud size={16} className="text-sky-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">{title ?? 'Cargar nuevo CSV'}</h2>
              <p className="text-xs text-slate-400">{description ?? 'Formato delimitado por ; en UTF-8'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <CSVUploader
            onFileSelected={onFileSelected}
            isProcessing={isProcessing}
            error={error}
          />

          {isProcessing && progress && (
            <p className="text-center text-sm text-sky-600 animate-pulse">{progress}</p>
          )}

          {error && (
            <p className="text-center text-xs text-slate-400">
              Arrastra otro archivo o haz clic en el área para reintentar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
