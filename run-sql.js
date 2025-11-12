import postgres from 'postgres';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });

const sqlScript = readFileSync('./drizzle/0002_fix_enums_manual.sql', 'utf-8');

async function runScript() {
  try {
    console.log('Running SQL script...');
    await sql.unsafe(sqlScript);
    console.log('✓ Script executed successfully');
  } catch (error) {
    console.error('Error executing script:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runScript();
