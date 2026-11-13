const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

async function comprobarConexion() {
  const password = fs.readFileSync(0, 'utf8').replace(/\r?\n$/, '');
  const client = new Client({
    host: 'aws-1-us-east-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.gokwnexcdyxqgtwqgwen',
    password,
    ssl: { ca: fs.readFileSync(path.join(__dirname, 'supabase-ca.pem'), 'utf8'), rejectUnauthorized: true },
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    const result = await client.query('SELECT current_database() AS nombre');
    console.log('Conexión verificada con la base ' + result.rows[0].nombre);
  } finally {
    await client.end();
  }
}

comprobarConexion().catch(error => {
  console.error('Falló la conexión con Supabase.', error.code || error.name);
  process.exitCode = 1;
});
