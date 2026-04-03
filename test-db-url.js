// Test if Database URL is correctly formatted
const dbUrl = 'mysql://root:Mrsnuffles123%21%40%23@34.59.2.8:3306/intellimix';

// Parse the URL
const url = new URL(dbUrl);
console.log('Parsed DATABASE_URL:');
console.log('  Protocol:', url.protocol);
console.log('  Username:', url.username);
console.log('  Password (encoded):', url.password);
console.log('  Host:', url.hostname);
console.log('  Port:', url.port);
console.log('  Database:', url.pathname.slice(1));
console.log('');

// Decode password
const decodedPassword = decodeURIComponent(url.password);
console.log('Decoded password:', decodedPassword);
console.log('');

// Expected password
const expectedPassword = 'Mrsnuffles123!@#';
console.log('Expected password:', expectedPassword);
console.log('Match:', decodedPassword === expectedPassword);
