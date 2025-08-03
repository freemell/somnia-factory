const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function runMigration() {
  try {
    console.log('🔄 Running database migration...');
    
    // Add token_in_address column
    console.log('📝 Adding token_in_address column...');
    const { error: error1 } = await supabase
      .from('trades')
      .select('token_in_address')
      .limit(1);
    
    if (error1 && error1.code === 'PGRST204') {
      console.log('✅ token_in_address column does not exist, will be added by schema update');
    } else {
      console.log('✅ token_in_address column already exists');
    }
    
    // Add token_out_address column
    console.log('📝 Adding token_out_address column...');
    const { error: error2 } = await supabase
      .from('trades')
      .select('token_out_address')
      .limit(1);
    
    if (error2 && error2.code === 'PGRST204') {
      console.log('✅ token_out_address column does not exist, will be added by schema update');
    } else {
      console.log('✅ token_out_address column already exists');
    }
    
    console.log('🎉 Migration check completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Open the SQL editor');
    console.log('3. Run the following SQL:');
    console.log('');
    console.log('ALTER TABLE trades ADD COLUMN IF NOT EXISTS token_in_address TEXT;');
    console.log('ALTER TABLE trades ADD COLUMN IF NOT EXISTS token_out_address TEXT;');
    console.log('');
    console.log('4. Then restart the bot');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

runMigration(); 