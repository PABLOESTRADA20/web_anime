const { Client } = require('pg');
const fs = require('fs');

const key = process.env.SUPABASE_DB_PASSWORD;
if (!key) { console.error('Set SUPABASE_DB_PASSWORD env var'); process.exit(1); }
const projectRef = 'szcpihgltvewnlrzydpe';
const regions = [
  'us-west-1', 'us-east-1', 'us-east-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3',
  'eu-central-1', 'eu-central-2',
  'eu-north-1', 'eu-south-1', 'eu-south-2',
  'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
  'ap-southeast-1', 'ap-southeast-2', 'ap-southeast-3',
  'ap-south-1', 'ap-south-2',
  'sa-east-1',
  'ca-central-1',
  'me-south-1', 'me-central-1',
  'af-south-1',
];

const sql = fs.readFileSync('./supabase/migrations/00006_anime_lists.sql', 'utf8');

async function tryRegion(region) {
  const c = new Client({
    host: `aws-0-${region}.pooler.supabase.com`,
    port: 6543,
    database: 'postgres',
    user: `postgres.${projectRef}`,
    password: key,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await c.connect();
    console.log(`Connected via ${region}!`);
    return c;
  } catch (e) {
    return null;
  }
}

async function run() {
  for (const r of regions) {
    const c = await tryRegion(r);
    if (c) {
      await c.query(sql);
      console.log('Migration 00006_anime_lists.sql executed successfully!');
      await c.end();
      return;
    }
  }
  console.log('Could not connect to any region. Try direct connection...');
  const c = new Client({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: key,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await c.connect();
    console.log('Connected directly!');
    await c.query(sql);
    console.log('Migration executed successfully!');
    await c.end();
  } catch (e) {
    console.log('Direct connection failed:', e.message);
    console.log('\nEjecuta manualmente en Supabase SQL Editor el contenido de:');
    console.log('supabase/migrations/00006_anime_lists.sql');
  }
}

run().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
