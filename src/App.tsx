import { useState, useEffect, useCallback } from 'react';
import { PhoneCall, UploadCloud, History, ChevronDown, Users } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { UploadModal } from './components/UploadModal';
import { UploadHistory } from './components/UploadHistory';
import { parseCSVText, detectColumns, validateColumns, transformRows } from './lib/csvParser';
import { parseAgentStatusCSV } from './lib/agentStatusParser';
import { saveUpload, getCallRecords, getAllUploads, getProcessedSignatures, saveAgentStatusUpload, getLatestAgentStatusUpload } from './lib/supabaseService';
import type { CallRecord, CallUpload, AgentStatusRecord } from './lib/supabase';

type DataState =
  | { phase: 'loading' }
  | { phase: 'empty' }
  | { phase: 'ready'; records: CallRecord[]; upload: CallUpload };

export default function App() {
  const [dataState, setDataState] = useState<DataState>({ phase: 'loading' });
  const [uploads, setUploads] = useState<CallUpload[]>([]);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);

  // Agent status state
  const [agentStatusRecords, setAgentStatusRecords] = useState<AgentStatusRecord[]>([]);
  const [agentStatusModalOpen, setAgentStatusModalOpen] = useState(false);
  const [agentStatusProcessing, setAgentStatusProcessing] = useState(false);
  const [agentStatusError, setAgentStatusError] = useState<string | null>(null);
  const [agentStatusProgress, setAgentStatusProgress] = useState('');

  useEffect(() => {
    Promise.all([
      getAllUploads(),
      getLatestAgentStatusUpload(),
    ])
      .then(([allUploads, agentStatus]) => {
        if (agentStatus) {
          setAgentStatusRecords(agentStatus.records);
        }
        setUploads(allUploads);
        if (allUploads.length === 0) {
          setDataState({ phase: 'empty' });
          setModalOpen(true);
          return;
        }
        const latest = allUploads[0];
        setActiveUploadId(latest.id);
        return getCallRecords(latest.id).then(records => {
          setDataState({ phase: 'ready', records, upload: latest });
        });
      })
      .catch(() => setDataState({ phase: 'empty' }));
  }, []);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setUploadError(null);
    setProgress('Leyendo archivo...');
    try {
      const text = await file.text();

      setProgress('Detectando columnas...');
      const { headers, rows } = parseCSVText(text);

      if (headers.length === 0) {
        setUploadError('El archivo CSV está vacío o no pudo leerse.');
        setIsProcessing(false);
        return;
      }

      const columnMap = detectColumns(headers);
      const missingCols = validateColumns(columnMap);

      if (missingCols.length > 0) {
        setUploadError(
          `No se encontraron columnas requeridas: ${missingCols.join(', ')}. Columnas detectadas: ${headers.join(', ')}`
        );
        setIsProcessing(false);
        return;
      }

      setProgress(`Transformando ${rows.length.toLocaleString('es-CL')} registros...`);
      const processedSignatures = await getProcessedSignatures();
      const { records: parsed, duplicateCount } = await transformRows(rows, columnMap, processedSignatures);

      setProgress(`Guardando ${parsed.length.toLocaleString('es-CL')} registros nuevos${duplicateCount > 0 ? ` (${duplicateCount} duplicados omitidos)` : ''}...`);
      const { upload, savedCount } = await saveUpload(file.name, parsed);

      setProgress(`Cargando ${savedCount.toLocaleString('es-CL')} registros...`);
      const records = await getCallRecords(upload.id);

      setUploads(prev => [upload, ...prev.filter(u => u.id !== upload.id)]);
      setActiveUploadId(upload.id);
      setDataState({ phase: 'ready', records, upload });
      setIsProcessing(false);
      setModalOpen(false);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Error desconocido al procesar el archivo.'
      );
      setIsProcessing(false);
    }
  }, []);

  const selectUpload = useCallback(async (upload: CallUpload) => {
    setDataState({ phase: 'loading' });
    try {
      const records = await getCallRecords(upload.id);
      setActiveUploadId(upload.id);
      setDataState({ phase: 'ready', records, upload });
      setHistoryOpen(false);
    } catch (err) {
      setDataState({ phase: 'empty' });
    }
  }, []);

  const processAgentStatusFile = useCallback(async (file: File) => {
    setAgentStatusProcessing(true);
    setAgentStatusError(null);
    setAgentStatusProgress('Leyendo archivo...');
    try {
      const text = await file.text();
      setAgentStatusProgress('Procesando agentes...');
      const { rows, errors } = parseAgentStatusCSV(text);
      if (errors.length > 0 && rows.length === 0) {
        setAgentStatusError(errors[0]);
        setAgentStatusProcessing(false);
        return;
      }
      setAgentStatusProgress(`Guardando ${rows.length} agentes...`);
      const { records } = await saveAgentStatusUpload(file.name, rows).then(async ({ upload }) => {
        const saved = await import('./lib/supabaseService').then(m => m.getAgentStatusRecords(upload.id));
        return { records: saved };
      });
      setAgentStatusRecords(records);
      setAgentStatusProcessing(false);
      setAgentStatusModalOpen(false);
    } catch (err) {
      setAgentStatusError(err instanceof Error ? err.message : 'Error desconocido.');
      setAgentStatusProcessing(false);
    }
  }, []);

  const openModal = () => {
    setUploadError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!isProcessing) {
      setModalOpen(false);
      setUploadError(null);
    }
  };

  const openAgentStatusModal = () => {
    setAgentStatusError(null);
    setAgentStatusModalOpen(true);
  };

  const closeAgentStatusModal = () => {
    if (!agentStatusProcessing) {
      setAgentStatusModalOpen(false);
      setAgentStatusError(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          {/* Logo + title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center flex-shrink-0">
              <PhoneCall size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-none">
                Dashboard de Llamadas
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Análisis de interacciones telefónicas</p>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* History dropdown (when there are multiple uploads) */}
            {uploads.length > 1 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setHistoryOpen(o => !o)}
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300 px-3 py-2 rounded-lg transition-colors bg-white"
                >
                  <History size={15} />
                  <span className="hidden sm:inline">Historial</span>
                  <ChevronDown size={13} className={`transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
                </button>

                {historyOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setHistoryOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-30 w-80">
                      <UploadHistory
                        uploads={uploads}
                        activeUploadId={activeUploadId}
                        onSelect={selectUpload}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Agent status upload button */}
            <button
              type="button"
              onClick={openAgentStatusModal}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors border ${
                agentStatusRecords.length > 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              <Users size={15} />
              <span className="hidden sm:inline">
                {agentStatusRecords.length > 0 ? `${agentStatusRecords.length} agentes` : 'Estado agentes'}
              </span>
            </button>

            {/* Calls upload button */}
            <button
              type="button"
              onClick={openModal}
              className="flex items-center gap-2 text-sm font-medium bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <UploadCloud size={15} />
              <span>Cargar CSV</span>
            </button>
          </div>
        </div>

        {/* Processing bar */}
        {isProcessing && (
          <div className="h-0.5 bg-slate-100 overflow-hidden">
            <div className="h-full w-1/3 bg-sky-400 animate-[slide_1.5s_ease-in-out_infinite]" />
          </div>
        )}
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-8">
        {dataState.phase === 'loading' && (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-sky-300 border-t-sky-600 rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Cargando datos...</p>
            </div>
          </div>
        )}

        {dataState.phase === 'empty' && (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center">
              <UploadCloud size={32} className="text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-700">Bienvenido al Dashboard</h2>
              <p className="text-sm text-slate-400 mt-1">
                Carga tu primer archivo CSV para comenzar el análisis
              </p>
            </div>
            <button
              type="button"
              onClick={openModal}
              className="flex items-center gap-2 text-sm font-medium bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <UploadCloud size={16} />
              Cargar CSV
            </button>
          </div>
        )}

        {dataState.phase === 'ready' && (
          <Dashboard
            records={dataState.records}
            upload={dataState.upload}
            agentStatusRecords={agentStatusRecords}
          />
        )}
      </main>

      {/* Calls upload modal */}
      <UploadModal
        isOpen={modalOpen}
        onClose={closeModal}
        onFileSelected={processFile}
        isProcessing={isProcessing}
        error={uploadError}
        progress={progress}
      />

      {/* Agent status upload modal */}
      <UploadModal
        isOpen={agentStatusModalOpen}
        onClose={closeAgentStatusModal}
        onFileSelected={processAgentStatusFile}
        isProcessing={agentStatusProcessing}
        error={agentStatusError}
        progress={agentStatusProgress}
        title="Cargar Estado de Agentes"
        description='Sube el reporte "Resumen de Estado por Agente" en formato CSV (separado por punto y coma). Solo se usarán las columnas Conectado, En la cola y Fuera de la cola.'
      />
    </div>
  );
}
