import { useState, useEffect, useCallback, useMemo } from 'react';
import { PhoneCall, UploadCloud } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { Sidebar } from './components/Sidebar';
import type { Section } from './components/Sidebar';
import { UploadModal } from './components/UploadModal';
import { calculateDateRangeFromRecords } from './lib/csvParser';
import type { ParsedCallRecord } from './lib/csvParser';
import { parseAgentStatusCSV } from './lib/agentStatusParser';
import { saveUpload, getAllUploads, getAllCallRecords, saveAgentStatusUpload, saveAgentConnectivityUpload, getAllAgentStatusUploads, combineAgentStatusRecords, refreshMetricsCache } from './lib/supabaseService';
import { getDataQualityReport } from './lib/kpi';
import type { CallRecord, CallUpload, AgentStatusRecord } from './lib/supabase';
import type { DataQualityReport } from './lib/kpi';

type ProgressState = { message: string; percent: number };

type DataState =
  | { phase: 'loading' }
  | { phase: 'empty' }
  | { phase: 'ready'; records: CallRecord[]; upload: CallUpload };

export default function App() {
  const [dataState, setDataState] = useState<DataState>({ phase: 'loading' });
  const [modalOpen, setModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState>({ message: '', percent: 0 });

  // Agent status state
  const [agentStatusRecords, setAgentStatusRecords] = useState<AgentStatusRecord[]>([]);
  const [connectivityRefreshKey, setConnectivityRefreshKey] = useState(0);
  const [agentStatusModalOpen, setAgentStatusModalOpen] = useState(false);
  const [agentStatusProcessing, setAgentStatusProcessing] = useState(false);
  const [agentStatusError, setAgentStatusError] = useState<string | null>(null);
  const [agentStatusProgress, setAgentStatusProgress] = useState<ProgressState>({ message: '', percent: 0 });

  // Navigation
  const [activeSection, setActiveSection] = useState<Section>('inicio');

  // Data quality (computed at App level for sidebar footer)
  const dataQuality: DataQualityReport | null = useMemo(() => {
    if (dataState.phase === 'ready') {
      return getDataQualityReport(dataState.records);
    }
    return null;
  }, [dataState]);

  useEffect(() => {
    Promise.all([
      getAllUploads(),
      getAllAgentStatusUploads(),
      getAllCallRecords(),
    ])
      .then(([, allAgentStatusUploads, records]) => {
        const combinedAgentRecords = combineAgentStatusRecords(allAgentStatusUploads);
        if (combinedAgentRecords.length > 0) {
          setAgentStatusRecords(combinedAgentRecords);
        }

        if (records.length === 0) {
          setDataState({ phase: 'empty' });
          setModalOpen(true);
          return;
        }

        const dateRange = calculateDateRangeFromRecords(records);
        const virtualUpload: CallUpload = {
          id: 'all-historical',
          filename: 'Datos históricos combinados',
          uploaded_at: new Date().toISOString(),
          record_count: records.length,
          date_range_start: dateRange.start,
          date_range_end: dateRange.end,
        };

        setDataState({ phase: 'ready', records, upload: virtualUpload });
      })
      .catch(() => setDataState({ phase: 'empty' }));
  }, []);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setUploadError(null);
    setProgress({ message: 'Leyendo archivo...', percent: 0 });
    try {
      const text = await file.text();
      setProgress({ message: 'Iniciando procesamiento en segundo plano...', percent: 2 });

      // Offload CPU-intensive CSV parsing + row transformation to a Web Worker
      const worker = new Worker(
        new URL('./workers/csvWorker.ts', import.meta.url),
        { type: 'module' }
      );

      const parsed = await new Promise<ParsedCallRecord[]>((resolve, reject) => {
        worker.onmessage = (e: MessageEvent) => {
          const msg = e.data as { type: string; message?: string; percent?: number; records?: ParsedCallRecord[] };
          if (msg.type === 'progress') {
            setProgress({ message: msg.message ?? '', percent: msg.percent ?? 0 });
          } else if (msg.type === 'done') {
            worker.terminate();
            resolve(msg.records ?? []);
          } else if (msg.type === 'error') {
            worker.terminate();
            reject(new Error(msg.message ?? 'Error en el worker'));
          }
        };
        worker.onerror = (err: ErrorEvent) => {
          worker.terminate();
          reject(new Error(err.message ?? 'Error desconocido en el worker de procesamiento'));
        };
        worker.postMessage({ type: 'start', text });
      });

      setProgress({ message: `Guardando ${parsed.length.toLocaleString('es-CL')} registros...`, percent: 92 });
      const { savedCount, stats } = await saveUpload(file.name, parsed, (saved, total) => {
        const pct = 92 + Math.round((saved / total) * 4);
        setProgress({
          message: `Guardando lote ${saved.toLocaleString('es-CL')} / ${total.toLocaleString('es-CL')}...`,
          percent: pct,
        });
      });

      setProgress({ message: 'Actualizando caché de métricas...', percent: 97 });
      await refreshMetricsCache();

      const successMsg = `✓ ${savedCount.toLocaleString('es-CL')} registros guardados${
        stats.canceledOverlappingCalls > 0 ? ` (${stats.canceledOverlappingCalls} llamadas superpuestas detectadas)` : ''
      }`;
      setProgress({ message: successMsg, percent: 100 });

      setProgress({ message: 'Recargando histórico completo...', percent: 98 });
      const allRecords = await getAllCallRecords();

      const dateRange = calculateDateRangeFromRecords(allRecords);
      const virtualUpload: CallUpload = {
        id: 'all-historical',
        filename: 'Datos históricos combinados',
        uploaded_at: new Date().toISOString(),
        record_count: allRecords.length,
        date_range_start: dateRange.start,
        date_range_end: dateRange.end,
      };

      setDataState({ phase: 'ready', records: allRecords, upload: virtualUpload });
      setIsProcessing(false);
      setModalOpen(false);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Error desconocido al procesar el archivo.'
      );
      setIsProcessing(false);
    }
  }, []);

  const processAgentStatusFile = useCallback(async (file: File) => {
    setAgentStatusProcessing(true);
    setAgentStatusError(null);
    setAgentStatusProgress({ message: 'Leyendo archivo...', percent: 0 });
    try {
      const text = await file.text();
      setAgentStatusProgress({ message: 'Procesando agentes...', percent: 30 });
      const { rows, errors, rawEvents } = parseAgentStatusCSV(text);
      if (errors.length > 0 && rows.length === 0) {
        setAgentStatusError(errors[0]);
        setAgentStatusProcessing(false);
        return;
      }
      setAgentStatusProgress({ message: `Guardando ${rows.length} agentes...`, percent: 55 });
      await saveAgentStatusUpload(file.name, rows);

      if (rawEvents && rawEvents.length > 0) {
        setAgentStatusProgress({ message: `Guardando ${rawEvents.length} eventos de timeline...`, percent: 70 });
        try {
          await saveAgentConnectivityUpload(file.name, rawEvents);
          setConnectivityRefreshKey(k => k + 1);
        } catch (connErr) {
          console.warn('[App] Error guardando conectividad raw (no crítico):', connErr);
        }
      }

      setAgentStatusProgress({ message: 'Recargando datos de agentes...', percent: 90 });
      const { getAllAgentStatusUploads: getAllUploads } = await import('./lib/supabaseService');
      const allUploads = await getAllUploads();
      const combinedRecords = combineAgentStatusRecords(allUploads);
      setAgentStatusRecords(combinedRecords);
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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar navigation */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        agentStatusCount={agentStatusRecords.length}
        dataQuality={dataQuality}
        onUploadClick={openModal}
        onUploadAgentStatus={openAgentStatusModal}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Simplified header */}
        <header className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm">
          <div className="px-6 py-4">
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
          </div>

          {/* Processing bar */}
          {isProcessing && (
            <div className="h-0.5 bg-slate-100 overflow-hidden">
              <div className="h-full w-1/3 bg-sky-400 animate-[slide_1.5s_ease-in-out_infinite]" />
            </div>
          )}
        </header>

        <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-8">
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
              activeSection={activeSection}
              dataQuality={dataQuality}
              connectivityRefreshKey={connectivityRefreshKey}
            />
          )}
        </main>
      </div>

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
