import pg from 'pg';

const { Client } = pg;

async function test(url, name) {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    console.log(`[${name}] OK!`);
    const res = await client.query('SELECT 1 as val');
    console.log(`[${name}] query ok`, res.rows);
    await client.end();
  } catch (err) {
    console.error(`[${name}] ERROR:`, err.message);
  }
}

async function run() {
  const pass = '%23Sr1510%401986$';
  const proj = 'trgxnfpqhwiqwhbkpibb';
  
  // Test direct domain
  await test(`postgresql://postgres:${pass}@db.${proj}.supabase.co:5432/postgres`, 'DB_DOMAIN 5432 NO_TENANT');
  
  // Test pooler with and without tenant
  await test(`postgresql://postgres.${proj}:${pass}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`, 'POOLER 6543 WITH_TENANT');
  await test(`postgresql://postgres:${pass}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`, 'POOLER 6543 NO_TENANT');
  await test(`postgresql://postgres.${proj}:${pass}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`, 'POOLER 5432 WITH_TENANT');
  await test(`postgresql://postgres:${pass}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`, 'POOLER 5432 NO_TENANT');
}

run();
