import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://tnkqsfxsofaocbrnhhjr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRua3FzZnhzb2Zhb2Nicm5oaGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNjM0MjksImV4cCI6MjA5MjkzOTQyOX0.dfmlXQD21AtEC1TxKzu-AJ5V8ZYjFdf8KZkRKPOSmg0';

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
