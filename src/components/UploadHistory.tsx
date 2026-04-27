import { History, ChevronRight } from 'lucide-react';
import type { CallUpload } from '../lib/supabase';

type Props = {
  uploads: CallUpload[];
  activeUploadId: string | null;
  onSelect: (upload: CallUpload) => void;
};

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function UploadHistory({ uploads, activeUploadId, onSelect }: Props) {
  if (uploads.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2">
        <History size={16} className="text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-600">Historial de cargas</h3>
      </div>
      <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
        {uploads.map(upload => (
          <button
            key={upload.id}
            onClick={() => onSelect(upload)}
            className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
              activeUploadId === upload.id ? 'bg-sky-50 border-l-2 border-sky-400' : ''
            }`}
          >
            <div>
              <p className={`text-sm font-medium ${activeUploadId === upload.id ? 'text-sky-700' : 'text-slate-700'}`}>
                {upload.filename}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatDate(upload.uploaded_at)} &middot;{' '}
                {upload.record_count.toLocaleString('es-CL')} registros
              </p>
            </div>
            <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
