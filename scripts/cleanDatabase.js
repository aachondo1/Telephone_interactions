import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY no están configuradas');
  console.error('\nAsegúrate de:');
  console.error('1. Crear un archivo .env.local en la raíz del proyecto');
  console.error('2. Agregar:');
  console.error('   VITE_SUPABASE_URL=tu_url');
  console.error('   VITE_SUPABASE_ANON_KEY=tu_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDatabase() {
  console.log('\n🧹 Iniciando limpieza de base de datos...\n');

  try {
    // Delete from child tables first (due to foreign keys)
    console.log('  ⏳ Eliminando registros de llamadas...');
    const { count: callCount, error: callError } = await supabase
      .from('call_records')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (callError) throw callError;
    console.log(`     ✓ Eliminados ${callCount} registros de llamadas`);

    console.log('  ⏳ Eliminando historial de carga de llamadas...');
    const { count: uploadCount, error: uploadError } = await supabase
      .from('call_uploads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (uploadError) throw uploadError;
    console.log(`     ✓ Eliminados ${uploadCount} historiales de carga`);

    console.log('  ⏳ Eliminando firmas de deduplicación...');
    const { count: sigCount, error: sigError } = await supabase
      .from('processed_call_signatures')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (sigError) throw sigError;
    console.log(`     ✓ Eliminadas ${sigCount} firmas`);

    console.log('  ⏳ Eliminando registros de estado de agentes...');
    const { count: agentRecCount, error: agentRecError } = await supabase
      .from('agent_status_records')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (agentRecError) throw agentRecError;
    console.log(`     ✓ Eliminados ${agentRecCount} registros de agentes`);

    console.log('  ⏳ Eliminando historial de carga de estado de agentes...');
    const { count: agentUploadCount, error: agentUploadError } = await supabase
      .from('agent_status_uploads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (agentUploadError) throw agentUploadError;
    console.log(`     ✓ Eliminados ${agentUploadCount} historiales de agentes`);

    console.log('\n✅ Base de datos limpiada exitosamente\n');
  } catch (error) {
    console.error('\n❌ Error durante la limpieza:', error.message);
    process.exit(1);
  }
}

cleanDatabase();
