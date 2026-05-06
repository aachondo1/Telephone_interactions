import { useState, useEffect, useCallback, useMemo } from 'react';
import { PhoneCall, UploadCloud } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { Sidebar } from './components/Sidebar';
import type { Section } from './components/Sidebar';
import { UploadModal } from './components/UploadModal';
import { parseCSVText, detectColumns, validateColumns, transformRows, calculateDateRangeFromRecords } from './lib/csvParser';
import { parseAgentStatusCSV } from './lib/agentStatusParser';
import { saveUpload, getAllUploads, getAllCallRecords, saveAgentStatusUpload, getAllAgentStatusUploads, combineAgentStatusRecords } from './lib/supabaseService';
import { getDataQualityReport } from './lib/kpi';
import type { CallRecord, CallUpload, AgentStatusRecord } from './lib/supabase';
import type { DataQualityReport } from './lib/kpi';

type DataState =
  | { phase: 'loading' }
  | { phase: 'empty' }
  | { phase: 'ready'; records: CallRecord[]; upload: CallUpload };

export default function App() {
  const [dataState, setDataState] = useState<DataState>({ phase: 'loading' });
  const [_uploads, setUploads] = useState<CallUpload[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');

  // Agent status state
  const [agentStatusRecords, setAgentStatusRecords] = useState<AgentStatusRecord[]>([]);
  const [agentStatusModalOpen, setAgentStatusModalOpen] = useState(false);
  const [agentStatusProcessing, setAgentStatusProcessing] = useState(false);
  const [agentStatusError, setAgentStatusError] = useState<string | null>(null);
  const [agentStatusProgress, setAgentStatusProgress] = useState('');

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
      .then(([allUploads, allAgentStatusUploads, records]) => {
        // Combine records from ALL agent status uploads (April + May + June, etc.)
        const combinedAgentRecords = combineAgentStatusRecords(allAgentStatusUploads);
        if (combinedAgentRecords.length > 0) {
          setAgentStatusRecords(combinedAgentRecords);
        }
        setUploads(allUploads);

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
      const { records: parsed } = await transformRows(rows, columnMap);

      setProgress(`Guardando ${parsed.length.toLocaleString('es-CL')} registros...`);
      const { upload, savedCount, stats } = await saveUpload(file.name, parsed);

      let successMessage = `✓ Se guardaron ${savedCount.toLocaleString('es-CL')} registros`;
      if (stats.canceledOverlappingCalls > 0) {
        successMessage += ` (${stats.canceledOverlappingCalls} llamadas superpuestas detectadas)`;
      }
      setProgress(successMessage);

      setProgress(`Recargando histórico completo...`);
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

      setUploads(prev => [upload, ...prev.filter(u => u.id !== upload.id)]);
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
      await saveAgentStatusUpload(file.name, rows);

      // Reload ALL agent status uploads (cumulative across multiple files)
      setAgentStatusProgress('Reloading all agent data...');
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
              onUploadAgentStatus={openAgentStatusModal}
              dataQuality={dataQuality}
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
