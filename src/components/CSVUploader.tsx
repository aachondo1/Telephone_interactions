import { useRef, useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';

type Props = {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
  error: string | null;
};

export function CSVUploader({ onFileSelected, isProcessing, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => !isProcessing && inputRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
        transition-all duration-200 select-none
        ${isProcessing ? 'cursor-not-allowed opacity-70' : ''}
        ${isDragging
          ? 'border-bice-cyan bg-bice-cyan-tint scale-[1.01]'
          : 'border-slate-300 bg-slate-50 hover:border-bice-cyan hover:bg-bice-cyan-tint'
        }
        ${error ? 'border-bice-alert bg-bice-alert-bg' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={onInputChange}
        disabled={isProcessing}
      />

      <div className="flex flex-col items-center gap-3">
        {isProcessing ? (
          <Loader2 size={40} className="text-bice-cyan animate-spin" />
        ) : error ? (
          <AlertCircle size={40} className="text-bice-alert" />
        ) : isDragging ? (
          <FileText size={40} className="text-bice-cyan" />
        ) : (
          <Upload size={40} className="text-slate-400" />
        )}

        <div>
          {isProcessing ? (
            <p className="text-bice-navy font-semibold text-base">Procesando archivo...</p>
          ) : error ? (
            <>
              <p className="text-bice-alert font-semibold text-base">Error al procesar</p>
              <p className="text-bice-alert text-sm mt-1 max-w-md mx-auto">{error}</p>
            </>
          ) : (
            <>
              <p className="text-slate-700 font-semibold text-base">
                {isDragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo CSV o haz clic para seleccionar'}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Formato: delimitado por ; con codificación UTF-8
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}