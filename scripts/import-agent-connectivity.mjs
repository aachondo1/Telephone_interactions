#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY deben estar definidas en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Parse Spanish date format: DD-MM-YYYY HH:MM or DD-MM-YYYY HH:MM:SS
 */
function parseSpanishDateTime(dateStr) {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  const match = trimmed.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) {
    console.warn(`⚠️  Formato de fecha no reconocido: "${trimmed}"`);
    return null;
  }
  const [, day, month, year, hour, minute, second] = match;
  const dateObj = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second || '00'}`);
  if (isNaN(dateObj.getTime())) {
    console.warn(`⚠️  Fecha inválida: "${trimmed}"`);
    return null;
  }
  return dateObj;
}

/**
 * Parse duration string like "3d 20h 1m 26s" to seconds
 */
function parseDurationToSeconds(durationStr) {
  if (!durationStr) return 0;
  const str = String(durationStr).trim().toLowerCase();
  let totalSeconds = 0;

  const dayMatch = str.match(/(\d+)\s*d(?:ía)?/);
  if (dayMatch) totalSeconds += parseInt(dayMatch[1], 10) * 86400;

  const hourMatch = str.match(/(\d+)\s*h(?:ora)?/);
  if (hourMatch) totalSeconds += parseInt(hourMatch[1], 10) * 3600;

  const minMatch = str.match(/(\d+)\s*m(?:in)?/);
  if (minMatch) totalSeconds += parseInt(minMatch[1], 10) * 60;

  const secMatch = str.match(/(\d+)\s*s(?:eg)?/);
  if (secMatch) totalSeconds += parseInt(secMatch[1], 10);

  return totalSeconds;
}

/**
 * Parse CSV file and import agent connectivity data
 * Expected columns in CSV (Spanish):
 * - "ID del agente" → agent_id
 * - "Nombre del agente" → agent_name
 * - "Hora de inicio" → start_time
 * - "Hora de finalización" → end_time
 * - "Estado principal" → status
 * - "Duración" → duration_raw (in seconds)
 */
async function importAgentConnectivity(csvFilePath) {
  try {
    console.log('\n📂 Importando datos de conectividad de agentes...\n');

    if (!fs.existsSync(csvFilePath)) {
      console.error(`❌ Error: archivo no encontrado: ${csvFilePath}`);
      process.exit(1);
    }

    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: '\t',
      quote: '"',
      relax_column_count: true,
      encoding: 'utf-8',
    });

    console.log(`✓ Archivo leído: ${records.length} registros encontrados\n`);

    // Normalize column names (Spanish → English)
    const normalizedRecords = records
      .map((row, idx) => {
        const agentId = row['ID del agente'] || row['ID del agente'] || '';
        const agentName = row['Nombre del agente'] || '';
        const startTimeStr = row['Hora de inicio'] || '';
        const endTimeStr = row['Hora de finalización'] || '';
        const status = row['Estado principal'] || 'Disponible';
        const durationStr = row['Duración'] || '0';

        const startTime = parseSpanishDateTime(startTimeStr);
        const endTime = parseSpanishDateTime(endTimeStr);
        const durationSeconds = parseDurationToSeconds(durationStr);

        if (!startTime || !endTime) {
          console.warn(`⚠️  Saltando fila ${idx + 1}: formato de fecha inválido`);
          return null;
        }

        return {
          agent_id: String(agentId).trim(),
          agent_name: String(agentName).trim(),
          start_time: startTime,
          end_time: endTime,
          status: String(status).trim(),
          duration_seconds: durationSeconds,
        };
      })
      .filter((row) => {
        if (!row) return false;
        // Ensure required fields (all statuses including Desconectado are stored)
        if (!row.agent_name || !row.agent_id || !row.start_time || !row.end_time) return false;
        return true;
      });

    console.log(`✓ Registros válidos después de filtrado: ${normalizedRecords.length}\n`);

    if (normalizedRecords.length === 0) {
      console.error('❌ No valid records to import after filtering');
      process.exit(1);
    }

    // Upload metadata
    const dateRangeStart = new Date(Math.min(...normalizedRecords.map(r => r.start_time.getTime())));
    const dateRangeEnd = new Date(Math.max(...normalizedRecords.map(r => r.end_time.getTime())));

    const { data: uploadRecord, error: uploadError } = await supabase
      .from('agent_connectivity_uploads')
      .insert({
        filename: path.basename(csvFilePath),
        record_count: normalizedRecords.length,
        date_range_start: dateRangeStart.toISOString().split('T')[0],
        date_range_end: dateRangeEnd.toISOString().split('T')[0],
      })
      .select()
      .single();

    if (uploadError) throw uploadError;
    const uploadId = uploadRecord.id;
    console.log(`✓ Upload registrado: ${uploadId}\n`);

    // Insert raw records
    const rawRecordsToInsert = normalizedRecords.map(row => ({
      upload_id: uploadId,
      agent_id: row.agent_id,
      agent_name: row.agent_name,
      start_time: row.start_time.toISOString(),
      end_time: row.end_time.toISOString(),
      status: row.status,
      duration_raw: row.duration_seconds,
    }));

    const { error: rawError } = await supabase
      .from('agent_connectivity_raw')
      .insert(rawRecordsToInsert);

    if (rawError) throw rawError;
    console.log(`✓ ${rawRecordsToInsert.length} registros raw insertados\n`);

    // Perform hourly slicing
    const hourlyMap = new Map();

    for (const record of normalizedRecords) {
      const startTime = record.start_time;
      const endTime = record.end_time;

      // Iterate through each hour bucket
      let currentTime = new Date(startTime);
      currentTime.setMinutes(0);
      currentTime.setSeconds(0);
      currentTime.setMilliseconds(0);

      while (currentTime < endTime) {
        const nextHour = new Date(currentTime);
        nextHour.setHours(nextHour.getHours() + 1);

        const bucketStart = Math.max(startTime.getTime(), currentTime.getTime());
        const bucketEnd = Math.min(endTime.getTime(), nextHour.getTime());
        const secondsInBucket = Math.max(0, (bucketEnd - bucketStart) / 1000);

        if (secondsInBucket > 0) {
          const date = currentTime.toISOString().split('T')[0];
          const hour = currentTime.getHours();
          const key = `${record.agent_id}|${date}|${hour}|${record.status}`;

          if (!hourlyMap.has(key)) {
            hourlyMap.set(key, {
              agent_id: record.agent_id,
              agent_name: record.agent_name,
              date,
              hour,
              status: record.status,
              seconds: 0,
            });
          }

          const entry = hourlyMap.get(key);
          entry.seconds += secondsInBucket;
        }

        currentTime = nextHour;
      }
    }

    // Insert hourly sliced records
    const hourlyRecordsToInsert = Array.from(hourlyMap.values()).map(entry => ({
      upload_id: uploadId,
      agent_id: entry.agent_id,
      agent_name: entry.agent_name,
      date: entry.date,
      hour: entry.hour,
      status: entry.status,
      seconds_in_bucket: Math.round(entry.seconds),
    }));

    const batchSize = 1000;
    for (let i = 0; i < hourlyRecordsToInsert.length; i += batchSize) {
      const batch = hourlyRecordsToInsert.slice(i, i + batchSize);
      const { error: hourlyError } = await supabase
        .from('agent_connectivity_hourly')
        .insert(batch);

      if (hourlyError) throw hourlyError;
      console.log(`✓ Lote ${Math.floor(i / batchSize) + 1}: ${batch.length} registros horarios insertados`);
    }

    console.log(`\n✅ Importación completada exitosamente!`);
    console.log(`   - Total de registros raw: ${rawRecordsToInsert.length}`);
    console.log(`   - Total de registros horarios: ${hourlyRecordsToInsert.length}`);
    console.log(`   - Rango de fechas: ${dateRangeStart.toLocaleDateString()} a ${dateRangeEnd.toLocaleDateString()}\n`);
  } catch (error) {
    console.error('❌ Error durante importación:', error.message);
    process.exit(1);
  }
}

// Find CSV file
const csvFilePath = process.argv[2] || path.join(__dirname, '../Resumen de línea de tiempo de estado de agente.csv');
importAgentConnectivity(csvFilePath);
