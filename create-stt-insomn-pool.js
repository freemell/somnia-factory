const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load the factory ABI
const factoryABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'new factory/abi.json')));

// Configuration
const RPC_URL = "https://dream-rpc.somnia.network/";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "99f33cb471e638d3d5a7cad46f712f2365710618e9afe3cf3e1c0e94f2c1eb1d";
const FACTORY_ADDRESS = "0x8669cD81994740D517661577A72B84d0a308D8b0";

// Token addresses
const STT_ADDRESS = ethers.ZeroAddress; // Native token
const INSOMN_ADDRESS = "0xCdaC954Cff3be5eBED645745c85dc13cC2c97836";

async function createSTTInsomnPool() {
  console.log("🏗️ Creating STT/INSOMN Pool...\n");
  
  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, wallet);
  
  console.log(`📝 Factory Address: ${FACTORY_ADDRESS}`);
  console.log(`📝 Wallet: ${wallet.address}`);
  console.log(`📝 STT Address: ${STT_ADDRESS}`);
  console.log(`📝 INSOMN Address: ${INSOMN_ADDRESS}\n`);
  
  try {
    // Check if pool already exists
    const existingPool = await factory.getPool(STT_ADDRESS, INSOMN_ADDRESS, 3000);
    if (existingPool !== ethers.ZeroAddress) {
      console.log(`✅ Pool already exists: ${existingPool}`);
      return existingPool;
    }
    
    console.log(`🔨 Creating new pool...`);
    
    // Create pool with 0.3% fee and 60 tick spacing
    const tx = await factory.createPool(STT_ADDRESS, INSOMN_ADDRESS, 3000, 60);
    console.log(`📝 Transaction hash: ${tx.hash}`);
    
    console.log(`⏳ Waiting for confirmation...`);
    const receipt = await tx.wait();
    console.log(`✅ Pool created successfully!`);
    
    // Get the pool address
    const poolAddress = await factory.getPool(STT_ADDRESS, INSOMN_ADDRESS, 3000);
    console.log(`📝 Pool address: ${poolAddress}`);
    
    // Get pool info
    const [reserve0, reserve1, liquidity] = await factory.getPoolReserves(poolAddress);
    console.log(`📊 Initial reserves: ${ethers.formatEther(reserve0)} / ${ethers.formatEther(reserve1)}`);
    console.log(`📊 Initial liquidity: ${liquidity.toString()}`);
    
    return poolAddress;
    
  } catch (error) {
    console.error(`❌ Error creating pool: ${error.message}`);
    throw error;
  }
}

// Run the pool creation
createSTTInsomnPool()
  .then((poolAddress) => {
    console.log(`\n🎉 STT/INSOMN pool created successfully!`);
    console.log(`📝 Pool Address: ${poolAddress}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`\n❌ Failed to create pool: ${error.message}`);
    process.exit(1);
  }); 