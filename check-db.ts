import postgres from 'postgres';
import { config } from 'dotenv';

config();

const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
});

async function checkDatabase() {
  try {
    console.log('Checking database...');

    // Check if review_queue has any data
    const reviewQueueCount = await sql`SELECT COUNT(*) FROM review_queue`;
    console.log('review_queue rows:', reviewQueueCount[0].count);

    // Check if audit_log has any data
    const auditLogCount = await sql`SELECT COUNT(*) FROM audit_log`;
    console.log('audit_log rows:', auditLogCount[0].count);

    // Check existing enums
    const enums = await sql`
      SELECT t.typname as enum_name, e.enumlabel as enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname IN ('priority', 'review_status')
      ORDER BY t.typname, e.enumsortorder;
    `;
    console.log('\nExisting enums:');
    enums.forEach(e => console.log(`  ${e.enum_name}: ${e.enum_value}`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

checkDatabase();
