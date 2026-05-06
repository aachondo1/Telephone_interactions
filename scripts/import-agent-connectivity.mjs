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
 * Parse CSV file and import agent connectivity data
 * Expected columns in CSV:
 * - "Nombre del agente" or "Agent Name" → agent_name
 * - "Hora de inicio" or "Start Time" → start_time
 * - "Hora de finalización" or "End Time" → end_time
 * - "Estado principal" or "Primary Status" → status
 * - "Duración" or "Duration" → duration_raw (in seconds)
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
      delimiter: ',',
      quote: '"',
      relax_column_count: true,
    });

    console.log(`✓ Archivo leído: ${records.length} registros encontrados\n`);

    // Normalize column names and filter out "Desconectado" records
    const normalizedRecords = records
      .map(row => {
        const agentName = row['Nombre del agente'] || row['Agent Name'] || '';
        const agentId = row['ID del agente'] || row['Agent ID'] || row['ID'] || '';
        const startTime = row['Hora de inicio'] || row['Start Time'] || '';
        const endTime = row['Hora de finalización'] || row['End Time'] || '';
        const status = row['Estado principal'] || row['Primary Status'] || 'Disponible';
        const durationStr = row['Duración'] || row['Duration'] || '0';

        return {
          agent_id: String(agentId).trim(),
          agent_name: String(agentName).trim(),
          start_time: String(startTime).trim(),
          end_time: String(endTime).trim(),
          status: String(status).trim(),
          duration_seconds: parseInt(durationStr, 10) || 0,
        };
      })
      .filter(row => {
        // Filter out "Desconectado" status as per requirements
        if (row.status === 'Desconectado') return false;
        // Ensure required fields
        if (!row.agent_name || !row.start_time || !row.end_time) return false;
        return true;
      });

    console.log(`✓ Registros válidos después de filtrado: ${normalizedRecords.length}\n`);

    // Upload metadata
    const dateRanges = normalizedRecords
      .map(r => new Date(r.start_time))
      .filter(d => !isNaN(d.getTime()));

    if (dateRanges.length === 0) {
      console.error('❌ No valid dates found in records');
      process.exit(1);
    }

    const dateRangeStart = new Date(Math.min(...dateRanges.map(d => d.getTime())));
    const dateRangeEnd = new Date(Math.max(...dateRanges.map(d => d.getTime())));

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
      start_time: new Date(row.start_time).toISOString(),
      end_time: new Date(row.end_time).toISOString(),
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
      const startTime = new Date(record.start_time);
      const endTime = new Date(record.end_time);

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        console.warn(`⚠️  Saltando registro con timestamp inválido: ${record.agent_name}`);
        continue;
      }

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
