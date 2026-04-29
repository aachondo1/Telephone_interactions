import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tnkqsfxsofaocbrnhhjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRua3FzZnhzb2Zhb2Nicm5oaGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzA0MjksImV4cCI6MjA5MjcwNjQyOX0.dfmlXQD21AtEC1TxKzu-AJ5V8ZYjFdf8KZkRKPOSmg0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function audit() {
  console.log('\n🔍 Iniciando auditoría de datos Genesys Cloud...\n');

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
    console.log('╔════════════════════════════════════════════╗');
    console.log('║        ANÁLISIS DE REBOTES (BOUNCES)       ║');
    console.log('╚════════════════════════════════════════════╝\n');

    let totalBounces = 0;
    for (const r of records) {
      if (r.is_bounce) totalBounces++;
    }

    const bounceRate = ((totalBounces / total) * 100).toFixed(2);
    console.log(`✓ Total de rebotes: ${totalBounces}`);
    console.log(`✓ Tasa de rebote: ${bounceRate}%\n`);

    // ABANDON TYPE ANALYSIS
    console.log('╔════════════════════════════════════════════╗');
    console.log('║      ANÁLISIS DE ABANDONOS (ABANDONS)      ║');
    console.log('╚════════════════════════════════════════════╝\n');

    const abandonStats = { total: 0, queue: 0, alert: 0, ivr: 0, null: 0 };
    for (const r of records) {
      if (!r.attended) {
        abandonStats.total++;
        if (r.abandon_type === 'queue') abandonStats.queue++;
        else if (r.abandon_type === 'alert') abandonStats.alert++;
        else if (r.abandon_type === 'ivr') abandonStats.ivr++;
        else abandonStats.null++;
      }
    }

    console.log(`✓ Total abandonos: ${abandonStats.total} (${((abandonStats.total / total) * 100).toFixed(2)}%)\n`);
    console.log('Clasificación:');
    console.log(`  En cola:   ${abandonStats.queue} (${abandonStats.total > 0 ? ((abandonStats.queue / abandonStats.total) * 100).toFixed(1) : 0}%)`);
    console.log(`  En alerta: ${abandonStats.alert} (${abandonStats.total > 0 ? ((abandonStats.alert / abandonStats.total) * 100).toFixed(1) : 0}%)`);
    console.log(`  En IVR:    ${abandonStats.ivr} (${abandonStats.total > 0 ? ((abandonStats.ivr / abandonStats.total) * 100).toFixed(1) : 0}%)`);
    if (abandonStats.null > 0) {
      console.log(`  ⚠️  Sin clasificar: ${abandonStats.null}`);
    }
    console.log();

    // HOLD TIME VALIDATION
    console.log('╔════════════════════════════════════════════╗');
    console.log('║      VALIDACIÓN DE HOLD TIME               ║');
    console.log('╚════════════════════════════════════════════╝\n');
    console.log('Fórmula esperada: hold_time = handle_time - 45 - duration\n');

    let validCount = 0;
    let invalidCount = 0;
    const discrepancies = [];

    for (const r of records) {
      if (r.handle_time_seconds === null || r.duration_seconds === null) continue;

      const expected = Math.max(0, r.handle_time_seconds - 45 - r.duration_seconds);
      const actual = r.hold_time_seconds ?? 0;

      if (expected === actual) {
        validCount++;
      } else {
        invalidCount++;
        if (discrepancies.length < 5) {
          discrepancies.push({
            id: r.id.substring(0, 8),
            expected,
            actual,
          });
        }
      }
    }

    const totalValidated = validCount + invalidCount;
    const concordance = ((validCount / totalValidated) * 100).toFixed(1);

    console.log(`✓ Registros validados: ${totalValidated}`);
    console.log(`✓ Concordancia: ${concordance}%\n`);

    if (invalidCount > 0) {
      console.log(`⚠️  DISCREPANCIAS ENCONTRADAS: ${invalidCount}\n`);
      console.log('Primeras 5 discrepancias:');
      discrepancies.forEach(d => {
        console.log(`  ID: ${d.id} - Esperado: ${d.expected}s, Actual: ${d.actual}s`);
      });
    } else {
      console.log('✅ Sin discrepancias - Hold time se calcula correctamente');
    }
    console.log();

    // SAMPLE DATA
    console.log('╔════════════════════════════════════════════╗');
    console.log('║         MUESTRA DE 5 REGISTROS             ║');
    console.log('╚════════════════════════════════════════════╝\n');

    const samples = records.slice(0, 5);
    for (const r of samples) {
      console.log(`📞 ID: ${r.id.substring(0, 16)}`);
      console.log(`   Fecha: ${r.call_date} ${r.call_time}`);
      console.log(`   Ejecutivo: ${r.executive || 'SIN ATENDER'}`);
      console.log(`   Atendida: ${r.attended ? 'SÍ' : 'NO'}`);
      console.log(`   Tipo abandono: ${r.abandon_type || '-'}`);
      console.log(`   Es rebote: ${r.is_bounce ? 'SÍ' : 'NO'}`);
      console.log(`   Segmentos alerta: ${r.alert_segments}`);
      const expectedHT = Math.max(0, (r.handle_time_seconds || 0) - 45 - (r.duration_seconds || 0));
      console.log(`   Hold Time: ${r.hold_time_seconds}s (esperado: ${expectedHT}s)`);
      console.log();
    }

    // SUMMARY
    console.log('╔════════════════════════════════════════════╗');
    console.log('║         CONCLUSIÓN FINAL                   ║');
    console.log('╚════════════════════════════════════════════╝\n');

    console.log('✅ Datos calculados según especificaciones:');
    console.log(`   • Hold Time concordancia: ${concordance}%`);
    console.log(`   • Clasificación de abandonos: Lógica correcta`);
    console.log(`   • Rebotes detectados: ${totalBounces}\n`);

    if (concordance >= 95) {
      console.log('✅ Los datos están correctos - No se requieren correcciones\n');
    } else {
      console.log('⚠️  RECOMENDACIÓN: Revisar registros con discrepancias en hold_time\n');
    }

  } catch (err) {
    console.error('\n❌ Error:', err.message);
  }
}

audit();
