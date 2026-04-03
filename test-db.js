import mysql from 'mysql2/promise';

(async () => {
  try {
    // Test with plain password
    const conn = await mysql.createConnection({
      host: '34.59.2.8',
      user: 'root',
      password: 'Mrsnuffles123!@#',
      database: 'intellimix',
    });
    
    console.log('✓ Database connected');
    
    // Check tables
    const [tables] = await conn.execute('SHOW TABLES');
    console.log('\nTables:', tables.map(t => Object.values(t)[0]));
    
    // Check users table schema
    const [schema] = await conn.execute('DESCRIBE users');
    console.log('\nUsers table columns:');
    schema.forEach(col => console.log(`  - ${col.Field}: ${col.Type} (${col.Null})`));
    
    // Try a test query
    const [result] = await conn.execute('SELECT COUNT(*) as count FROM users');
    console.log('\nUsers count:', result[0].count);
    
    await conn.end();
    console.log('\n✓ All tests passed');
  } catch(e) {
    console.error('\n✗ ERROR:', e.message);
    console.error('Code:', e.code);
    process.exit(1);
  }
})();
