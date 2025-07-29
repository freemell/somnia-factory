require('dotenv').config();
const { ethers } = require('ethers');
const { executeInsomnSwap, getInsomnBalance } = require('./utils/insomnIntegration');

// Configuration
const RPC_URL = "https://dream-rpc.somnia.network/";
const TEST_PRIVATE_KEY = "0x16c293bf6861494cf8d53368285cf95c554ac899639dc5c0ad8930bfb64d985a";

async function testInsomnWithNewWallet() {
  console.log("🧪 Testing INSOMN Integration with New Wallet...\n");
  
  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(TEST_PRIVATE_KEY, provider);
  
  console.log(`📝 Using wallet: ${wallet.address}`);
  console.log(`🌐 Connected to: ${RPC_URL}\n`);
  
  try {
    // Test 1: Get initial balance
    console.log(`🔍 Test 1: Get initial balance`);
    const initialBalance = await getInsomnBalance(wallet, provider);
    if (initialBalance.success) {
      console.log(`   STT: ${initialBalance.balance.stt}`);
      console.log(`   INSOMN: ${initialBalance.balance.insomn}`);
      console.log(`   WETH: ${initialBalance.balance.weth}\n`);
    } else {
      console.log(`   ❌ Failed: ${initialBalance.message}\n`);
      return;
    }
    
    // Test 2: Small swap test (0.01 STT to INSOMN)
    console.log(`🔍 Test 2: Small swap test (0.01 STT → INSOMN)`);
    const swapResult = await executeInsomnSwap("0.01", "STT", "INSOMN", wallet, provider);
    
    if (swapResult.success) {
      console.log(`   ✅ Swap successful!`);
      console.log(`   ${swapResult.message}\n`);
    } else {
      console.log(`   ❌ Swap failed: ${swapResult.message}\n`);
    }
    
    // Test 3: Get final balance
    console.log(`🔍 Test 3: Get final balance`);
    const finalBalance = await getInsomnBalance(wallet, provider);
    if (finalBalance.success) {
      console.log(`   STT: ${finalBalance.balance.stt}`);
      console.log(`   INSOMN: ${finalBalance.balance.insomn}`);
      console.log(`   WETH: ${finalBalance.balance.weth}\n`);
      
      // Calculate changes
      const sttChange = parseFloat(finalBalance.balance.stt) - parseFloat(initialBalance.balance.stt);
      const insomnChange = parseFloat(finalBalance.balance.insomn) - parseFloat(initialBalance.balance.insomn);
      
      console.log(`📊 Changes:`);
      console.log(`   STT: ${sttChange > 0 ? '+' : ''}${sttChange.toFixed(6)}`);
      console.log(`   INSOMN: ${insomnChange > 0 ? '+' : ''}${insomnChange.toFixed(2)}\n`);
    } else {
      console.log(`   ❌ Failed: ${finalBalance.message}\n`);
    }
    
  } catch (error) {
    console.error(`❌ Test error: ${error.message}`);
  }
  
  console.log("🎉 INSOMN Integration Test Complete!");
}

// Run the test
testInsomnWithNewWallet()
  .then(() => {
    console.log("\n✅ INSOMN integration test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ INSOMN integration test failed:", error);
    process.exit(1);
  }); 