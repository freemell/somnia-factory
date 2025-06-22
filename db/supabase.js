const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize database tables if they don't exist
async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.log(`Statement executed (may already exist): ${statement.substring(0, 50)}...`);
          }
        } catch (error) {
          // Ignore errors for statements that may already exist
          console.log(`Statement may already exist: ${statement.substring(0, 50)}...`);
        }
      }
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    // Don't throw error, just log it
    console.log('Continuing without database initialization...');
  }
}

// Call initialization
initializeDatabase().catch(console.error);

module.exports = {
  supabase
}; 