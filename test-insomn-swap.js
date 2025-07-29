const { ethers } = require('ethers');
const { executeInsomnSwap, getInsomnPoolInfo, getInsomnBalance } = require('./utils/insomnIntegration');

// Configuration
const RPC_URL = "https://dream-rpc.somnia.network/";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "99f33cb471e638d3d5a7cad46f712f2365710618e9afe3cf3e1c0e94f2c1eb1d";

async function testInsomnSwap() {
  console.log("🧪 Testing INSOMN Swap Functionality...\n");
  
  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
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
    
    // Test 2: Get pool info
    console.log(`🔍 Test 2: Get STT/INSOMN pool info`);
    const poolInfo = await getInsomnPoolInfo('STT', 'INSOMN', provider);
    if (poolInfo.success) {
      console.log(`   Pool Address: ${poolInfo.poolAddress}`);
      console.log(`   Reserve 0: ${poolInfo.reserve0}`);
      console.log(`   Reserve 1: ${poolInfo.reserve1}`);
      console.log(`   Liquidity: ${poolInfo.liquidity}\n`);
    } else {
      console.log(`   ❌ Failed: ${poolInfo.message}\n`);
      return;
    }
    
    // Test 3: Small swap test (0.01 STT to INSOMN)
    console.log(`🔍 Test 3: Small swap test (0.01 STT → INSOMN)`);
    const swapResult = await executeInsomnSwap("0.01", "STT", "INSOMN", wallet, provider);
    
    if (swapResult.success) {
      console.log(`   ✅ Swap successful!`);
      console.log(`   ${swapResult.message}\n`);
    } else {
      console.log(`   ❌ Swap failed: ${swapResult.message}\n`);
    }
    
    // Test 4: Get final balance
    console.log(`🔍 Test 4: Get final balance`);
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
  
  console.log("🎉 INSOMN Swap Test Complete!");
}

// Run the test
testInsomnSwap()
  .then(() => {
    console.log("\n✅ INSOMN swap test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ INSOMN swap test failed:", error);
    process.exit(1);
  }); 