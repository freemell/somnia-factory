const { ethers } = require('ethers');
const InsomnSwap = require('./utils/insomnSwap');

// Configuration
const RPC_URL = "https://dream-rpc.somnia.network/";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "99f33cb471e638d3d5a7cad46f712f2365710618e9afe3cf3e1c0e94f2c1eb1d";

async function testSTTInsomnSwap() {
  console.log("🚀 Testing STT → INSOMN Swap...\n");
  
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
  console.log(`   INSOMN: ${initialBalance.insomn}`);
  console.log(`   WETH: ${initialBalance.weth}\n`);
  
  // Test STT to INSOMN swap
  console.log("🔄 Test: STT → INSOMN swap (0.1 STT)");
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
  console.log(`   WETH: ${updatedBalance.weth}`);
  
  // Calculate changes
  const sttChange = parseFloat(initialBalance.stt) - parseFloat(updatedBalance.stt);
  const insomnChange = parseFloat(updatedBalance.insomn) - parseFloat(initialBalance.insomn);
  
  console.log(`\n📊 Changes:`);
  console.log(`   STT: -${sttChange.toFixed(6)}`);
  console.log(`   INSOMN: +${insomnChange.toFixed(6)}`);
  
  console.log("\n🎉 STT → INSOMN Swap Test Complete!");
}

// Run the test
testSTTInsomnSwap()
  .then(() => {
    console.log("\n✅ STT → INSOMN swap test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ STT → INSOMN swap test failed:", error);
    process.exit(1);
  }); 