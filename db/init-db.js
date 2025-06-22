const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database...');
    
    // Create users table
    console.log('Creating users table...');
    const { error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError && usersError.code === '42P01') {
      // Table doesn't exist, create it
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE users (
            id BIGINT PRIMARY KEY,
            user_id BIGINT UNIQUE NOT NULL,
            username TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
          );
        `
      });
      
      if (error) {
        console.log('Users table may already exist or RPC not available');
      } else {
        console.log('✅ Users table created');
      }
    } else {
      console.log('✅ Users table already exists');
    }

    // Create wallets table
    console.log('Creating wallets table...');
    const { error: walletsError } = await supabase
      .from('wallets')
      .select('*')
      .limit(1);
    
    if (walletsError && walletsError.code === '42P01') {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE wallets (
            id SERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
            address TEXT NOT NULL,
            private_key TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
          );
        `
      });
      
      if (error) {
        console.log('Wallets table may already exist or RPC not available');
      } else {
        console.log('✅ Wallets table created');
      }
    } else {
      console.log('✅ Wallets table already exists');
    }

    // Create trades table
    console.log('Creating trades table...');
    const { error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .limit(1);
    
    if (tradesError && tradesError.code === '42P01') {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE trades (
            id SERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
            token_in TEXT NOT NULL,
            token_out TEXT NOT NULL,
            amount_in TEXT NOT NULL,
            amount_out TEXT NOT NULL,
            tx_hash TEXT,
            type TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
          );
        `
      });
      
      if (error) {
        console.log('Trades table may already exist or RPC not available');
      } else {
        console.log('✅ Trades table created');
      }
    } else {
      console.log('✅ Trades table already exists');
    }

    // Create limit_orders table
    console.log('Creating limit_orders table...');
    const { error: limitOrdersError } = await supabase
      .from('limit_orders')
      .select('*')
      .limit(1);
    
    if (limitOrdersError && limitOrdersError.code === '42P01') {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE limit_orders (
            id SERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
            token_in TEXT NOT NULL,
            token_out TEXT NOT NULL,
            amount DECIMAL NOT NULL,
            price DECIMAL NOT NULL,
            order_type TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
            executed_at TIMESTAMP WITH TIME ZONE,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
          );
        `
      });
      
      if (error) {
        console.log('Limit orders table may already exist or RPC not available');
      } else {
        console.log('✅ Limit orders table created');
      }
    } else {
      console.log('✅ Limit orders table already exists');
    }

    console.log('🎉 Database initialization completed!');
    console.log('\n📝 Note: If you see "RPC not available" messages, you may need to:');
    console.log('1. Create the tables manually in your Supabase dashboard');
    console.log('2. Or run the SQL from db/schema.sql in your Supabase SQL editor');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    console.log('\n📝 Please create the tables manually in your Supabase dashboard using the SQL from db/schema.sql');
  }
}

// Run initialization
initializeDatabase(); 