const { ethers } = require('ethers');
const { getInsomnBalance, getInsomnTokenInfo, isInsomnEcosystemToken } = require('./utils/insomnIntegration');

// Configuration
const RPC_URL = "https://dream-rpc.somnia.network/";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "99f33cb471e638d3d5a7cad46f712f2365710618e9afe3cf3e1c0e94f2c1eb1d";

async function testInsomnBalance() {
  console.log("🧪 Testing INSOMN Integration...\n");
  
  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log(`📝 Using wallet: ${wallet.address}`);
  console.log(`🌐 Connected to: ${RPC_URL}\n`);
  
  // Test 1: Check if INSOMN token is detected
  const insomnAddress = "0xCdaC954Cff3be5eBED645745c85dc13cC2c97836";
  const isInsomn = isInsomnEcosystemToken(insomnAddress);
  console.log(`🔍 Test 1: INSOMN token detection`);
  console.log(`   Address: ${insomnAddress}`);
  console.log(`   Is INSOMN: ${isInsomn ? '✅ Yes' : '❌ No'}\n`);
  
  // Test 2: Get token info
  console.log(`🔍 Test 2: Get INSOMN token info`);
  try {
    const tokenInfo = await getInsomnTokenInfo(insomnAddress, provider);
    if (tokenInfo) {
      console.log(`   Name: ${tokenInfo.name}`);
      console.log(`   Symbol: ${tokenInfo.symbol}`);
      console.log(`   Decimals: ${tokenInfo.decimals}`);
      console.log(`   Address: ${tokenInfo.address}`);
      console.log(`   Ecosystem: ${tokenInfo.ecosystem}\n`);
    } else {
      console.log(`   ❌ Failed to get token info\n`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }
  
  // Test 3: Get wallet balance
  console.log(`🔍 Test 3: Get wallet balance`);
  try {
    const balanceInfo = await getInsomnBalance(wallet, provider);
    if (balanceInfo.success) {
      console.log(`   STT: ${balanceInfo.balance.stt}`);
      console.log(`   INSOMN: ${balanceInfo.balance.insomn}`);
      console.log(`   WETH: ${balanceInfo.balance.weth}\n`);
    } else {
      console.log(`   ❌ Failed: ${balanceInfo.message}\n`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }
  
  console.log("🎉 INSOMN Integration Test Complete!");
}

// Run the test
testInsomnBalance()
  .then(() => {
    console.log("\n✅ INSOMN integration test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ INSOMN integration test failed:", error);
    process.exit(1);
  }); 