import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function initializeDatabase() {
  const connectionUrl = process.env.DATABASE_URL;
  
  if (!connectionUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  try {
    // Parse the MySQL URL
    const urlObj = new URL(connectionUrl);
    const [username, password] = urlObj.username && urlObj.password 
      ? [urlObj.username, decodeURIComponent(urlObj.password)]
      : ['root', 'Mrsnuffles123!@#'];
    
    const host = urlObj.hostname || '34.59.2.8';
    const database = urlObj.pathname?.slice(1) || 'intellimix';
    const port = urlObj.port ? parseInt(urlObj.port) : 3306;

    console.log(`🔌 Connecting to MySQL...`);
    console.log(`   Host: ${host}:${port}`);
    console.log(`   Database: ${database}`);
    console.log(`   User: ${username}`);

    const connection = await mysql.createConnection({
      host,
      port,
      user: username,
      password,
      database,
      multipleStatements: true,
    });

    console.log('✅ Connected to MySQL');

    // Read the SQL file
    const sqlFile = resolve('/tmp/init-intellimix-schema.sql');
    const sql = readFileSync(sqlFile, 'utf-8');

    console.log('🚀 Running schema initialization...');
    await connection.query(sql);
    
    console.log('✅ Schema initialized successfully!');
    console.log('📊 Created tables: users, pipeline_sessions, projects, stems, tracks, track_effects, automation_lanes, subscriptions');

    await connection.end();
    console.log('🎉 Database initialization complete!');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.toString().includes('ECONNREFUSED')) {
      console.error('   Connection refused - ensure database is accessible at the provided URL');
    }
    process.exit(1);
  }
}

initializeDatabase();
