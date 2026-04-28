import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://cwifoielwavuhurtgwja.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aWZvaWVsd2F2dWh1cnRnd2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDAxNjUsImV4cCI6MjA5Mjg3NjE2NX0.qL3AY3KM60RF6Yueln5NhSnm8YuVcYXjDHrCxcRB_Lw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`\nExecuting: ${file}`);

    try {
      const { error } = await supabase.rpc('exec', { sql });

      if (error) {
        console.error(`❌ Error in ${file}:`, error.message);
      } else {
        console.log(`✅ ${file} executed successfully`);
      }
    } catch (err) {
      console.error(`❌ Error executing ${file}:`, err.message);
    }
  }
}

runMigrations().catch(console.error);
