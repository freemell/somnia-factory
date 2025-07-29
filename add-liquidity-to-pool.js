require('dotenv').config();
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

async function addLiquidityToPool() {
  console.log("💧 Adding Liquidity to Pool...\n");
  
  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const factory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, wallet);
  
  console.log(`📝 Factory Address: ${FACTORY_ADDRESS}`);
  console.log(`📝 Pool Address: ${POOL_ADDRESS}`);
  console.log(`📝 Wallet: ${wallet.address}\n`);
  
  try {
    // Check current pool reserves
    console.log(`🔍 Checking current pool reserves...`);
    const [reserve0, reserve1, liquidity] = await factory.getPoolReserves(POOL_ADDRESS);
    console.log(`   Reserve 0: ${ethers.formatEther(reserve0)}`);
    console.log(`   Reserve 1: ${ethers.formatEther(reserve1)}`);
    console.log(`   Liquidity: ${liquidity.toString()}\n`);
    
    // Add liquidity (1000 STT worth)
    const liquidityAmount = ethers.parseEther("1000");
    console.log(`💧 Adding ${ethers.formatEther(liquidityAmount)} liquidity...`);
    
    const tx = await factory.addLiquidity(POOL_ADDRESS, liquidityAmount, {
      value: liquidityAmount // Send STT as native token
    });
    
    console.log(`📝 Transaction hash: ${tx.hash}`);
    console.log(`⏳ Waiting for confirmation...`);
    
    const receipt = await tx.wait();
    console.log(`✅ Liquidity added successfully!`);
    
    // Check updated reserves
    console.log(`🔍 Checking updated pool reserves...`);
    const [newReserve0, newReserve1, newLiquidity] = await factory.getPoolReserves(POOL_ADDRESS);
    console.log(`   Reserve 0: ${ethers.formatEther(newReserve0)}`);
    console.log(`   Reserve 1: ${ethers.formatEther(newReserve1)}`);
    console.log(`   Liquidity: ${newLiquidity.toString()}`);
    
    console.log(`\n🎉 Pool now has liquidity for trading!`);
    
  } catch (error) {
    console.error(`❌ Error adding liquidity: ${error.message}`);
    
    // Check if the error is about the function not existing
    if (error.message.includes("addLiquidity")) {
      console.log(`\n💡 The factory doesn't have an addLiquidity function.`);
      console.log(`💡 Let's try using the pool contract directly...`);
      
      // Try to add liquidity directly to the pool
      await addLiquidityDirectToPool();
    }
  }
}

async function addLiquidityDirectToPool() {
  console.log(`\n🔧 Trying direct pool liquidity addition...`);
  
  // Load pool ABI (we'll need to get this from the artifacts)
  try {
    const poolABI = JSON.parse(fs.readFileSync(path.join(__dirname, 'new factory/artifacts/contracts/CustomPool.sol/CustomPool.json'))).abi;
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const pool = new ethers.Contract(POOL_ADDRESS, poolABI, wallet);
    
    const liquidityAmount = ethers.parseEther("1000");
    console.log(`💧 Adding ${ethers.formatEther(liquidityAmount)} liquidity directly to pool...`);
    
    const tx = await pool.addLiquidity(liquidityAmount, {
      value: liquidityAmount
    });
    
    console.log(`📝 Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Direct liquidity addition successful!`);
    
  } catch (error) {
    console.error(`❌ Direct liquidity addition failed: ${error.message}`);
    console.log(`\n💡 The pool might need to be initialized first or have a different interface.`);
  }
}

// Run the liquidity addition
addLiquidityToPool()
  .then(() => {
    console.log(`\n✅ Liquidity addition completed!`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`\n❌ Failed to add liquidity: ${error.message}`);
    process.exit(1);
  }); 