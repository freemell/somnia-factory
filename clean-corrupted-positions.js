const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function cleanCorruptedPositions() {
  try {
    console.log('🧹 Starting database cleanup...');
    
    // 1. Clean corrupted trades
    console.log('🔍 Checking for corrupted trades...');
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*');
    
    if (tradesError) {
      console.error('Error fetching trades:', tradesError);
      return;
    }
    
    console.log(`📊 Found ${trades.length} total trades`);
    
    // Find corrupted trades (where token_in or token_out is not a valid address)
    const corruptedTrades = trades.filter(trade => {
      const tokenInValid = trade.token_in === 'STT' || (trade.token_in && ethers.isAddress(trade.token_in));
      const tokenOutValid = trade.token_out === 'STT' || (trade.token_out && ethers.isAddress(trade.token_out));
      return !tokenInValid || !tokenOutValid;
    });
    
    console.log(`❌ Found ${corruptedTrades.length} corrupted trades`);
    
    if (corruptedTrades.length > 0) {
      console.log('🔍 Corrupted trades:');
      corruptedTrades.forEach(trade => {
        console.log(`  - ID: ${trade.id}, Token In: ${trade.token_in}, Token Out: ${trade.token_out}`);
      });
      
      // Delete corrupted trades
      const corruptedIds = corruptedTrades.map(trade => trade.id);
      const { error: deleteError } = await supabase
        .from('trades')
        .delete()
        .in('id', corruptedIds);
      
      if (deleteError) {
        console.error('Error deleting corrupted trades:', deleteError);
      } else {
        console.log(`✅ Deleted ${corruptedTrades.length} corrupted trades`);
      }
    }
    
    // 2. Clean corrupted user_positions
    console.log('🔍 Checking for corrupted user_positions...');
    const { data: positions, error: positionsError } = await supabase
      .from('user_positions')
      .select('*');
    
    if (positionsError) {
      console.error('Error fetching positions:', positionsError);
      return;
    }
    
    console.log(`📊 Found ${positions.length} total positions`);
    
    // Find corrupted positions (where token_address is not a valid address)
    const corruptedPositions = positions.filter(position => {
      return !position.token_address || !ethers.isAddress(position.token_address);
    });
    
    console.log(`❌ Found ${corruptedPositions.length} corrupted positions`);
    
    if (corruptedPositions.length > 0) {
      console.log('🔍 Corrupted positions:');
      corruptedPositions.forEach(position => {
        console.log(`  - ID: ${position.id}, Token Address: ${position.token_address}, Symbol: ${position.token_symbol}`);
      });
      
      // Delete corrupted positions
      const corruptedPositionIds = corruptedPositions.map(position => position.id);
      const { error: deletePositionsError } = await supabase
        .from('user_positions')
        .delete()
        .in('id', corruptedPositionIds);
      
      if (deletePositionsError) {
        console.error('Error deleting corrupted positions:', deletePositionsError);
      } else {
        console.log(`✅ Deleted ${corruptedPositions.length} corrupted positions`);
      }
    }
    
    // 3. Verify cleanup
    console.log('🔍 Verifying cleanup...');
    const { data: remainingTrades } = await supabase
      .from('trades')
      .select('*');
    
    const { data: remainingPositions } = await supabase
      .from('user_positions')
      .select('*');
    
    console.log(`📊 Remaining trades: ${remainingTrades.length}`);
    console.log(`📊 Remaining positions: ${remainingPositions.length}`);
    
    // Check for any remaining corrupted data
    const remainingCorruptedTrades = remainingTrades.filter(trade => {
      const tokenInValid = trade.token_in === 'STT' || (trade.token_in && ethers.isAddress(trade.token_in));
      const tokenOutValid = trade.token_out === 'STT' || (trade.token_out && ethers.isAddress(trade.token_out));
      return !tokenInValid || !tokenOutValid;
    });
    
    const remainingCorruptedPositions = remainingPositions.filter(position => {
      return !position.token_address || !ethers.isAddress(position.token_address);
    });
    
    if (remainingCorruptedTrades.length === 0 && remainingCorruptedPositions.length === 0) {
      console.log('✅ Database cleanup completed successfully!');
      console.log('🎉 All corrupted data has been removed.');
    } else {
      console.log(`⚠️  Warning: ${remainingCorruptedTrades.length} corrupted trades and ${remainingCorruptedPositions.length} corrupted positions still remain.`);
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the cleanup
cleanCorruptedPositions().then(() => {
  console.log('🏁 Cleanup script finished.');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 