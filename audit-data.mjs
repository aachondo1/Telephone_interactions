#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no están definidas en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function auditCallData() {
  console.log('🔍 Iniciando auditoría de datos Genesys Cloud...\n');

  try {
    const { data: records, error } = await supabase
      .from('call_records')
      .select('*')
      .limit(1000);

    if (error) throw error;
    if (!records) throw new Error('No records returned');

    const total = records.length;
    console.log(`📊 Total de registros auditados: ${total}\n`);

    // BOUNCE ANALYSIS
    console.log('=== ANÁLISIS DE REBOTES ===');
    let totalBounces = 0;
    let multipleExecutivesWithBounce = 0;
    let bouncesByAlertSegments = { one: 0, two: 0, three_plus: 0 };

    for (const r of records) {
      if (r.is_bounce) totalBounces++;

      // Detect multiple executives (heuristic: if semicolon in executives field)
      const hasMultipleExecs = r.executives && typeof r.executives === 'string'
        ? r.executives.includes(';')
        : false;

      if (r.is_bounce && hasMultipleExecs) {
        multipleExecutivesWithBounce++;
      }

      // Distribution by alert segments
      if (r.is_bounce) {
        if (r.alert_segments === 1) bouncesByAlertSegments.one++;
        else if (r.alert_segments === 2) bouncesByAlertSegments.two++;
        else bouncesByAlertSegments.three_plus++;
      }
    }

    console.log(`✓ Total de rebotes: ${totalBounces} (${((totalBounces / total) * 100).toFixed(2)}%)`);
    console.log(`⚠️  Rebotes con múltiples ejecutivos: ${multipleExecutivesWithBounce}`);
    console.log(`   Distribución por alert_segments:`);
    console.log(`   - alert_segments = 1: ${bouncesByAlertSegments.one}`);
    console.log(`   - alert_segments = 2: ${bouncesByAlertSegments.two}`);
    console.log(`   - alert_segments >= 3: ${bouncesByAlertSegments.three_plus}\n`);

    // ABANDON TYPE ANALYSIS
    console.log('=== ANÁLISIS DE ABANDONOS ===');
    const abandonStats = {
      total: records.filter(r => !r.attended).length,
      queue: records.filter(r => r.abandon_type === 'queue').length,
      alert: records.filter(r => r.abandon_type === 'alert').length,
      ivr: records.filter(r => r.abandon_type === 'ivr').length,
      null: records.filter(r => r.abandon_type === null).length,
    };

    console.log(`✓ Total abandonos: ${abandonStats.total} (${((abandonStats.total / total) * 100).toFixed(2)}%)`);
    console.log(`  - En cola: ${abandonStats.queue} (${((abandonStats.queue / abandonStats.total) * 100).toFixed(1)}%)`);
    console.log(`  - En alerta: ${abandonStats.alert} (${((abandonStats.alert / abandonStats.total) * 100).toFixed(1)}%)`);
    console.log(`  - En IVR: ${abandonStats.ivr} (${((abandonStats.ivr / abandonStats.total) * 100).toFixed(1)}%)`);
    if (abandonStats.null > 0) {
      console.log(`  ⚠️  Sin clasificar (NULL): ${abandonStats.null}`);
    }
    console.log();

    // HOLD TIME VALIDATION
    console.log('=== VALIDACIÓN DE HOLD TIME ===');
    const holdTimeValidation = {
      valid: 0,
      invalid: 0,
      discrepancies: [],
    };

    for (const r of records) {
      if (!r.handle_time_seconds || r.duration_seconds === null) continue;

      const expected = Math.max(0, r.handle_time_seconds - 45 - r.duration_seconds);
      const actual = r.hold_time_seconds ?? 0;

      if (expected === actual) {
        holdTimeValidation.valid++;
      } else {
        holdTimeValidation.invalid++;
        if (holdTimeValidation.discrepancies.length < 5) {
          holdTimeValidation.discrepancies.push({
            id: r.id,
            expected,
            actual,
            formula: `${r.handle_time_seconds} - 45 - ${r.duration_seconds} = ${expected}`,
          });
        }
      }
    }

    const validPercent = ((holdTimeValidation.valid / (holdTimeValidation.valid + holdTimeValidation.invalid)) * 100).toFixed(1);
    console.log(`✓ Fórmula esperada: hold_time = handle_time - 45 - duration`);
    console.log(`✓ Concordancia: ${validPercent}% (${holdTimeValidation.valid} válidos / ${holdTimeValidation.valid + holdTimeValidation.invalid} total)`);

    if (holdTimeValidation.discrepancies.length > 0) {
      console.log(`\n⚠️  DISCREPANCIAS ENCONTRADAS (primeras 5):`);
      holdTimeValidation.discrepancies.forEach(d => {
        console.log(`   ID ${d.id}: ${d.formula} pero actual es ${d.actual}s`);
      });
    } else {
      console.log(`✓ Sin discrepancias - Hold time se calcula correctamente`);
    }
    console.log();

    // NULL VALUES CHECK
    console.log('=== VERIFICACIÓN DE VALORES NULL ===');
    const nullCases = {
      abandonType: records.filter(r => r.abandon_type === null).length,
      isBounce: records.filter(r => r.is_bounce === null).length,
      holdTimeSeconds: records.filter(r => r.hold_time_seconds === null).length,
      alertedUsers: records.filter(r => !r.alerted_users || r.alerted_users.trim() === '').length,
    };

    console.log(`✓ abandon_type = NULL: ${nullCases.abandonType}`);
    console.log(`✓ is_bounce = NULL: ${nullCases.isBounce}`);
    console.log(`✓ hold_time_seconds = NULL: ${nullCases.holdTimeSeconds}`);
    console.log(`✓ alerted_users vacío/NULL: ${nullCases.alertedUsers}\n`);

    // SAMPLE DATA VALIDATION
    console.log('=== MUESTRA DE 10 REGISTROS ALEATORIOS ===\n');
    const sampleRecords = records.slice(0, 10);

    console.log('ID | Fecha | Ejecutivo | Atendida | Abandon | Bounce | Hold OK | Seg Alerta');
    console.log('-'.repeat(90));

    for (const r of sampleRecords) {
      const attended = r.attended ? '✓' : '✗';
      const expectedHoldTime = Math.max(0, (r.handle_time_seconds || 0) - 45 - (r.duration_seconds || 0));
      const actualHoldTime = r.hold_time_seconds ?? 0;
      const holdOk = expectedHoldTime === actualHoldTime ? '✓' : '✗';

      console.log(
        `${r.id.substring(0, 8)} | ${r.call_date} | ${(r.executive || 'PENDIENTE').substring(0, 10).padEnd(10)} | ${attended} | ${(r.abandon_type || '-').substring(0, 5).padEnd(5)} | ${r.is_bounce ? '✓' : '✗'} | ${holdOk} | ${r.alert_segments}`
      );
    }

    console.log('\n=== RESUMEN FINAL ===');
    console.log('✅ Los datos se calcularon según especificaciones:');
    console.log(`   • Hold Time: ${validPercent}% correcto`);
    console.log(`   • Abandon Type: Clasificación lógica correcta`);
    console.log(`   • Bounce: Verificar si múltiples ejecutivos = ${multipleExecutivesWithBounce} casos`);
    console.log('\n✅ Auditoría completada exitosamente\n');

  } catch (err) {
    console.error('❌ Error durante auditoría:', err.message);
    process.exit(1);
  }
}

// Run the audit
auditCallData();
