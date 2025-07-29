const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load the factory ABI
const factoryABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'new factory/abi.json')));

// Configuration
const RPC_URL = "https://dream-rpc.somnia.network/";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "99f33cb471e638d3d5a7cad46f712f2365710618e9afe3cf3e1c0e94f2c1eb1d";
const FACTORY_ADDRESS = "0x8669cD81994740D517661577A72B84d0a308D8b0";

async function checkFactoryPools() {
  console.log("🔍 Checking Factory Pools...\n");
  
  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, wallet);
  
  console.log(`📝 Factory Address: ${FACTORY_ADDRESS}`);
  console.log(`📝 Wallet: ${wallet.address}\n`);
  
  try {
    // Get factory info
    const owner = await factory.owner();
    const poolCount = await factory.allPoolsLength();
    
    console.log(`🏭 Factory Information:`);
    console.log(`   Owner: ${owner}`);
    console.log(`   Total Pools: ${poolCount.toString()}\n`);
    
    if (poolCount > 0) {
      console.log(`📊 Existing Pools:`);
      for (let i = 0; i < poolCount; i++) {
        const poolAddress = await factory.getPoolByIndex(i);
        console.log(`   Pool ${i}: ${poolAddress}`);
        
        // Try to get pool info
        try {
          const [reserve0, reserve1, liquidity] = await factory.getPoolReserves(poolAddress);
          console.log(`     Reserves: ${ethers.formatEther(reserve0)} / ${ethers.formatEther(reserve1)}`);
          console.log(`     Liquidity: ${liquidity.toString()}`);
        } catch (error) {
          console.log(`     Could not get reserves: ${error.message}`);
        }
        console.log('');
      }
    } else {
      console.log(`❌ No pools found in factory\n`);
    }
    
    // Check specific pools
    const tokens = {
      'STT': ethers.ZeroAddress,
      'INSOMN': "0xCdaC954Cff3be5eBED645745c85dc13cC2c97836",
      'WETH': "0xd2480162Aa7F02Ead7BF4C127465446150D58452"
    };
    
    console.log(`🔍 Checking Specific Pools:`);
    for (const [symbol1, address1] of Object.entries(tokens)) {
      for (const [symbol2, address2] of Object.entries(tokens)) {
        if (address1 !== address2) {
          try {
            const poolAddress = await factory.getPool(address1, address2, 3000);
            if (poolAddress !== ethers.ZeroAddress) {
              console.log(`   ✅ ${symbol1}/${symbol2}: ${poolAddress}`);
            } else {
              console.log(`   ❌ ${symbol1}/${symbol2}: No pool exists`);
            }
          } catch (error) {
            console.log(`   ❌ ${symbol1}/${symbol2}: Error - ${error.message}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Run the check
checkFactoryPools()
  .then(() => {
    console.log("\n✅ Factory pool check completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Factory pool check failed:", error);
    process.exit(1);
  }); 