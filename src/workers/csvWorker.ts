import { parseCSVText, detectColumns, validateColumns, transformRows } from '../lib/csvParser';
import type { ParsedCallRecord, AnomalyEntry } from '../lib/csvParser';

type InMessage = { type: 'start'; text: string };
type OutMessage =
  | { type: 'progress'; message: string; percent: number }
  | { type: 'done'; records: ParsedCallRecord[]; anomalies: AnomalyEntry[] }
  | { type: 'error'; message: string };

const post = (msg: OutMessage) => self.postMessage(msg);

self.onmessage = async (e: MessageEvent<InMessage>) => {
  if (e.data.type !== 'start') return;
  const { text } = e.data;

  try {
    post({ type: 'progress', message: 'Detectando columnas...', percent: 5 });
    const { headers, rows } = parseCSVText(text);

    if (headers.length === 0) {
      post({ type: 'error', message: 'El archivo CSV está vacío o no pudo leerse.' });
      return;
    }

    post({
      type: 'progress',
      message: `${rows.length.toLocaleString('es-CL')} filas detectadas. Identificando columnas...`,
      percent: 10,
    });

    const columnMap = detectColumns(headers);
    const missing = validateColumns(columnMap);

    if (missing.length > 0) {
      post({
        type: 'error',
        message: `No se encontraron columnas requeridas: ${missing.join(', ')}. Columnas detectadas: ${headers.join(', ')}`,
      });
      return;
    }

    post({
      type: 'progress',
      message: `Transformando ${rows.length.toLocaleString('es-CL')} registros...`,
      percent: 15,
    });

    const { records, anomalies } = await transformRows(rows, columnMap, (processed, total) => {
      const pct = 15 + Math.round((processed / total) * 75);
      post({
        type: 'progress',
        message: `Procesando ${processed.toLocaleString('es-CL')} / ${total.toLocaleString('es-CL')} registros...`,
        percent: pct,
      });
    });

    post({ type: 'done', records, anomalies });
  } catch (err) {
    post({
      type: 'error',
      message: err instanceof Error ? err.message : 'Error desconocido en el procesamiento.',
    });
  }
};
