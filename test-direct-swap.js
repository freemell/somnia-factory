const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load the factory ABI
const factoryABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'new factory/abi.json')));

// Configuration
const RPC_URL = "https://dream-rpc.somnia.network/";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "99f33cb471e638d3d5a7cad46f712f2365710618e9afe3cf3e1c0e94f2c1eb1d";
const FACTORY_ADDRESS = "0x8669cD81994740D517661577A72B84d0a308D8b0";
const POOL_ADDRESS = "0xaA19FBBd3f5FD24cd5Db040364e91b9fa86aa18f";

async function testDirectSwap() {
  console.log("🧪 Testing Direct Factory Swap...\n");
  
  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, wallet);
  
  console.log(`📝 Factory Address: ${FACTORY_ADDRESS}`);
  console.log(`📝 Pool Address: ${POOL_ADDRESS}`);
  console.log(`📝 Wallet: ${wallet.address}\n`);
  
  try {
    // Test 1: Check if we're the owner
    const owner = await factory.owner();
    console.log(`🔍 Factory Owner: ${owner}`);
    console.log(`🔍 Our Address: ${wallet.address}`);
    console.log(`🔍 Are we owner? ${owner.toLowerCase() === wallet.address.toLowerCase() ? '✅ Yes' : '❌ No'}\n`);
    
    // Test 2: Try a small STT to INSOMN swap
    const swapAmount = ethers.parseEther("0.01"); // 0.01 STT
    const amountOutMin = swapAmount * 995n / 1000n; // 0.5% slippage
    const insomnAddress = "0xCdaC954Cff3be5eBED645745c85dc13cC2c97836";
    
    console.log(`🔄 Testing STT → INSOMN swap...`);
    console.log(`   Amount: ${ethers.formatEther(swapAmount)} STT`);
    console.log(`   Min Out: ${amountOutMin.toString()}`);
    console.log(`   Token Out: ${insomnAddress}`);
    
    const tx = await factory.swapSTTForTokens(
      POOL_ADDRESS,
      amountOutMin,
      insomnAddress,
      { value: swapAmount }
    );
    
    console.log(`📝 Transaction hash: ${tx.hash}`);
    console.log(`⏳ Waiting for confirmation...`);
    
    const receipt = await tx.wait();
    console.log(`✅ Swap transaction completed!`);
    console.log(`📊 Gas used: ${receipt.gasUsed.toString()}`);
    
    // Check for swap events
    const swapEvent = receipt.logs.find(log => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed.name === "Swap";
      } catch {
        return false;
      }
    });
    
    if (swapEvent) {
      const parsed = factory.interface.parseLog(swapEvent);
      console.log(`🎉 Swap event found!`);
      console.log(`   Amount In: ${ethers.formatEther(parsed.args.amountIn)} STT`);
      console.log(`   Amount Out: ${parsed.args.amountOut.toString()}`);
    }
    
  } catch (error) {
    console.error(`❌ Swap failed: ${error.message}`);
    
    // Check if it's a liquidity issue
    if (error.message.includes("INSUFFICIENT_LIQUIDITY") || error.message.includes("INSUFFICIENT_OUTPUT")) {
      console.log(`\n💡 The swap failed due to insufficient liquidity.`);
      console.log(`💡 The pool needs both INSOMN and WETH tokens to enable swaps.`);
    }
  }
}

// Run the test
testDirectSwap()
  .then(() => {
    console.log("\n✅ Direct swap test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Direct swap test failed:", error);
    process.exit(1);
  }); 