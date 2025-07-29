const { ethers } = require('ethers');
const InsomnSwap = require('./utils/insomnSwap');

// Configuration
const RPC_URL = "https://dream-rpc.somnia.network/";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "99f33cb471e638d3d5a7cad46f712f2365710618e9afe3cf3e1c0e94f2c1eb1d";

async function testRealSwaps() {
  console.log("🚀 Testing Real INSOMN Ecosystem Swaps...\n");
  
  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log(`📝 Using wallet: ${wallet.address}`);
  console.log(`🌐 Connected to: ${RPC_URL}\n`);
  
  // Initialize InsomnSwap
  const insomnSwap = new InsomnSwap(provider, wallet);
  
  // Get initial balances
  console.log("💰 Getting initial balances...");
  const initialBalance = await insomnSwap.getWalletBalance();
  console.log(`   STT: ${initialBalance.stt}`);
  console.log(`   INSOMN: ${initialBalance.insomn}\n`);
  
  // Test 1: Small STT to INSOMN swap
  console.log("🔄 Test 1: STT → INSOMN swap (0.1 STT)");
  try {
    const swapResult = await insomnSwap.handleSwap("0.1", "STT", "INSOMN");
    
    if (swapResult.success) {
      console.log("✅ Swap successful!");
      console.log(`   Transaction: ${swapResult.txHash}`);
      console.log(`   Amount: ${swapResult.amountIn} STT`);
    } else {
      console.log(`❌ Swap failed: ${swapResult.message}`);
    }
  } catch (error) {
    console.log(`❌ Swap error: ${error.message}`);
  }
  
  // Wait for transaction confirmation
  console.log("\n⏳ Waiting for transaction confirmation...");
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Get updated balances
  console.log("\n💰 Getting updated balances...");
  const updatedBalance = await insomnSwap.getWalletBalance();
  console.log(`   STT: ${updatedBalance.stt}`);
  console.log(`   INSOMN: ${updatedBalance.insomn}`);
  
  // Calculate changes
  const sttChange = parseFloat(initialBalance.stt) - parseFloat(updatedBalance.stt);
  const insomnChange = parseFloat(updatedBalance.insomn) - parseFloat(initialBalance.insomn);
  
  console.log(`\n📊 Changes:`);
  console.log(`   STT: -${sttChange.toFixed(6)}`);
  console.log(`   INSOMN: +${insomnChange.toFixed(6)}`);
  
  // Test 2: Small INSOMN to STT swap (if we have INSOMN)
  if (parseFloat(updatedBalance.insomn) > 1) {
    console.log("\n🔄 Test 2: INSOMN → STT swap (1 INSOMN)");
    try {
      const swapResult = await insomnSwap.handleSwap("1", "INSOMN", "STT");
      
      if (swapResult.success) {
        console.log("✅ Swap successful!");
        console.log(`   Transaction: ${swapResult.txHash}`);
        console.log(`   Amount: ${swapResult.amountIn} INSOMN`);
      } else {
        console.log(`❌ Swap failed: ${swapResult.message}`);
      }
    } catch (error) {
      console.log(`❌ Swap error: ${error.message}`);
    }
    
    // Wait for transaction confirmation
    console.log("\n⏳ Waiting for transaction confirmation...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get final balances
    console.log("\n💰 Getting final balances...");
    const finalBalance = await insomnSwap.getWalletBalance();
    console.log(`   STT: ${finalBalance.stt}`);
    console.log(`   INSOMN: ${finalBalance.insomn}`);
  }
  
  console.log("\n🎉 Real Swap Testing Complete!");
}

// Run the test
testRealSwaps()
  .then(() => {
    console.log("\n✅ Real swap tests completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Real swap test failed:", error);
    process.exit(1);
  }); 