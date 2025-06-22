#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Somnia Trading Bot - Database Setup');
console.log('=====================================\n');

console.log('📋 To set up your database, follow these steps:\n');

console.log('1. Go to your Supabase project dashboard');
console.log('2. Navigate to the SQL Editor tab');
console.log('3. Copy the SQL below and paste it into the editor');
console.log('4. Click "Run" to execute the SQL\n');

console.log('📄 SQL Schema:');
console.log('==============\n');

const schemaPath = path.join(__dirname, 'db', 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  console.log(schema);
} else {
  console.log('❌ Schema file not found at db/schema.sql');
}

console.log('\n✅ After running the SQL, restart your bot with:');
console.log('   node bot.js\n');

console.log('📚 For more detailed instructions, see: db/README.md\n');

console.log('🔗 Need help? Check the documentation or contact support.'); 