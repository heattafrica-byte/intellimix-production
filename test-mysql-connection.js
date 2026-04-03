import mysql from 'mysql2/promise';

const URL = 'mysql://root:Mrsnuffles123%21%40%23@34.59.2.8:3306/intellimix';
const DB_HOST = '34.59.2.8';
const DB_USER = 'root';
const DB_PASS = 'Mrsnuffles123!@#';
const DB_NAME = 'intellimix';
const DB_PORT = 3306;

console.log('Testing MySQL connection to', DB_HOST, '...');
console.log('User:', DB_USER);
console.log('Database:', DB_NAME);
console.log('');

async function testConnection() {
  try {
    console.log('[Test] Creating connection pool...');
    
    const connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
      connectionTimeout: 5000,
      namedPlaceholders: true,
    });

    console.log('[Test] ✓ Connected successfully');

    // Test query
    console.log('[Test] Executing test query...');
    const [rows] = await connection.query(
      'SELECT COUNT(*) as count FROM users'
    );
    console.log('[Test] ✓ Query successful, users count:', rows[0].count);

    await connection.end();
    console.log('[Test] ✓ Connection closed');
    
  } catch (error) {
    console.error('[Test] ✗ Connection failed');
    console.error('Error type:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection();
