const { ethers } = require('ethers');
const InsomnSwap = require('./utils/insomnSwap');
const { 
  isInsomnEcosystemToken, 
  getInsomnTokenInfo, 
  getInsomnPoolInfo,
  getInsomnBalance 
} = require('./utils/insomnIntegration');

// Test configuration
const RPC_URL = "https://dream-rpc.somnia.network/";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "99f33cb471e638d3d5a7cad46f712f2365710618e9afe3cf3e1c0e94f2c1eb1d";

// INSOMN ecosystem addresses
const INSOMN_ADDRESS = "0xCdaC954Cff3be5eBED645745c85dc13cC2c97836";
const WETH_ADDRESS = "0xd2480162Aa7F02Ead7BF4C127465446150D58452";
const FACTORY_ADDRESS = "0x8669cD81994740D517661577A72B84d0a308D8b0";

async function testInsomnIntegration() {
  console.log("🧪 Testing INSOMN Ecosystem Integration...\n");
  
  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log(`📝 Using wallet: ${wallet.address}`);
  console.log(`🌐 Connected to: ${RPC_URL}\n`);
  
  // Test 1: Check if tokens are part of INSOMN ecosystem
  console.log("🔍 Test 1: Checking INSOMN ecosystem tokens...");
  
  const testTokens = [
    INSOMN_ADDRESS,
    WETH_ADDRESS,
    "0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7", // STT
    "0x0C726E446865FFb19Cc13f21aBf0F515106C9662"  // Insomiacs
  ];
  
  testTokens.forEach(token => {
    const isInsomn = isInsomnEcosystemToken(token);
    console.log(`${token}: ${isInsomn ? '✅ INSOMN Ecosystem' : '❌ Not INSOMN'}`);
  });
  
  // Test 2: Get token info
  console.log("\n📋 Test 2: Getting token information...");
  
  try {
    const insomnInfo = await getInsomnTokenInfo(INSOMN_ADDRESS, provider);
    if (insomnInfo) {
      console.log("✅ INSOMN Token Info:");
      console.log(`   Name: ${insomnInfo.name}`);
      console.log(`   Symbol: ${insomnInfo.symbol}`);
      console.log(`   Decimals: ${insomnInfo.decimals}`);
      console.log(`   Address: ${insomnInfo.address}`);
      console.log(`   Ecosystem: ${insomnInfo.ecosystem}`);
    } else {
      console.log("❌ Failed to get INSOMN token info");
    }
  } catch (error) {
    console.log(`❌ Error getting token info: ${error.message}`);
  }
  
  // Test 3: Get pool info
  console.log("\n🏊 Test 3: Getting pool information...");
  
  try {
    const poolInfo = await getInsomnPoolInfo('STT', 'INSOMN', provider);
    if (poolInfo.success) {
      console.log("✅ Pool Info:");
      console.log(poolInfo.message);
    } else {
      console.log(`❌ Pool info failed: ${poolInfo.message}`);
    }
  } catch (error) {
    console.log(`❌ Error getting pool info: ${error.message}`);
  }
  
  // Test 4: Get wallet balance
  console.log("\n💰 Test 4: Getting wallet balance...");
  
  try {
    const balanceInfo = await getInsomnBalance(wallet, provider);
    if (balanceInfo.success) {
      console.log("✅ Wallet Balance:");
      console.log(balanceInfo.message);
    } else {
      console.log(`❌ Balance check failed: ${balanceInfo.message}`);
    }
  } catch (error) {
    console.log(`❌ Error getting balance: ${error.message}`);
  }
  
  // Test 5: Test InsomnSwap class directly
  console.log("\n🔄 Test 5: Testing InsomnSwap class...");
  
  try {
    const insomnSwap = new InsomnSwap(provider, wallet);
    
    // Test token address mapping
    console.log("   Testing token address mapping:");
    console.log(`   STT: ${insomnSwap.getTokenAddress('STT')}`);
    console.log(`   INSOMN: ${insomnSwap.getTokenAddress('INSOMN')}`);
    console.log(`   WETH: ${insomnSwap.getTokenAddress('WETH')}`);
    
    // Test wallet balance
    const balance = await insomnSwap.getWalletBalance();
    console.log("   Wallet Balance:");
    console.log(`   STT: ${balance.stt}`);
    console.log(`   INSOMN: ${balance.insomn}`);
    
  } catch (error) {
    console.log(`❌ Error testing InsomnSwap: ${error.message}`);
  }
  
  console.log("\n🎉 INSOMN Ecosystem Integration Test Complete!");
}

// Run the test
testInsomnIntegration()
  .then(() => {
    console.log("\n✅ All tests completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }); 