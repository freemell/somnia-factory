const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize database tables if they don't exist
async function initializeDatabase() {
  try {
    // Create users table
    await supabase.rpc('create_users_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id BIGINT PRIMARY KEY,
          address TEXT NOT NULL,
          encryptedKey TEXT NOT NULL,
          imported BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
        );
      `
    });

    // Create orders table
    await supabase.rpc('create_orders_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          user_id BIGINT REFERENCES users(id),
          token_in TEXT NOT NULL,
          token_out TEXT NOT NULL,
          amount DECIMAL NOT NULL,
          price DECIMAL NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
          executed_at TIMESTAMP WITH TIME ZONE
        );
      `
    });

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Call initialization
initializeDatabase().catch(console.error);

module.exports = {
  supabase
}; 