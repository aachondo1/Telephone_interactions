import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY no están configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDatabase() {
  console.log('🧹 Iniciando limpieza de base de datos...\n');

  try {
    // Delete from child tables first (due to foreign keys)
    console.log('Eliminando registros de llamadas...');
    const { error: callError } = await supabase
      .from('call_records')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (callError) throw callError;

    console.log('Eliminando historial de carga de llamadas...');
    const { error: uploadError } = await supabase
      .from('call_uploads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (uploadError) throw uploadError;

    console.log('Eliminando firmas de deduplicación...');
    const { error: sigError } = await supabase
      .from('processed_call_signatures')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (sigError) throw sigError;

    console.log('Eliminando registros de estado de agentes...');
    const { error: agentRecError } = await supabase
      .from('agent_status_records')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (agentRecError) throw agentRecError;

    console.log('Eliminando historial de carga de estado de agentes...');
    const { error: agentUploadError } = await supabase
      .from('agent_status_uploads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (agentUploadError) throw agentUploadError;

    console.log('\n✅ Base de datos limpiada exitosamente\n');
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  }
}

cleanDatabase();
