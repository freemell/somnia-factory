const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load deployment info
const deploymentPath = path.join(__dirname, "../deployment-factory.json");
if (!fs.existsSync(deploymentPath)) {
  console.error("❌ deployment-factory.json not found. Please deploy factory first.");
  process.exit(1);
}

const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

async function main() {
  console.log("🏊 Starting liquidity addition...");
  
  const [deployer] = await ethers.getSigners();
  console.log("📝 Using account:", deployer.address);

  // Load contracts
  const CustomFactory = await ethers.getContractFactory("CustomFactory");
  const factory = CustomFactory.attach(deployment.contracts.customFactory);

  const TokenA = await ethers.getContractFactory("TokenA");
  const tokenA = TokenA.attach(deployment.contracts.tokenA);
  
  const TokenB = await ethers.getContractFactory("TokenB");
  const tokenB = TokenB.attach(deployment.contracts.tokenB);

  // Mint tokens to deployer if needed
  console.log("\n🪙 Minting tokens...");
  const mintAmount = ethers.parseEther("1000"); // 1000 tokens each
  
  try {
    const mintATx = await tokenA.mint(deployer.address, mintAmount);
    await mintATx.wait();
    console.log("✅ TokenA minted");
  } catch (error) {
    console.log("ℹ️ TokenA already has balance");
  }

  try {
    const mintBTx = await tokenB.mint(deployer.address, mintAmount);
    await mintBTx.wait();
    console.log("✅ TokenB minted");
  } catch (error) {
    console.log("ℹ️ TokenB already has balance");
  }

  // Get pool
  const feeTier = 3000;
  const poolAddress = await factory.getPool(tokenA.target, tokenB.target, feeTier);
  console.log("📍 Pool address:", poolAddress);

  if (poolAddress === ethers.ZeroAddress) {
    console.error("❌ Pool not found. Please create pool first.");
    return;
  }

  // Approve tokens for pool
  console.log("\n✅ Approving tokens...");
  const approveATx = await tokenA.approve(poolAddress, mintAmount);
  await approveATx.wait();
  console.log("✅ TokenA approved");

  const approveBTx = await tokenB.approve(poolAddress, mintAmount);
  await approveBTx.wait();
  console.log("✅ TokenB approved");

  // Add liquidity
  console.log("\n💧 Adding liquidity...");
  const liquidityAmount = ethers.parseEther("100"); // 100 tokens each
  
  const pool = await ethers.getContractAt("CustomPool", poolAddress);
  const addLiquidityTx = await pool.addLiquidity(
    deployer.address,
    liquidityAmount,
    liquidityAmount,
    0, // slippage tolerance
    0  // slippage tolerance
  );
  
  await addLiquidityTx.wait();
  console.log("✅ Liquidity added successfully!");

  // Check balances
  const balanceA = await tokenA.balanceOf(deployer.address);
  const balanceB = await tokenB.balanceOf(deployer.address);
  
  console.log("\n📊 Final balances:");
  console.log(`TokenA: ${ethers.formatEther(balanceA)}`);
  console.log(`TokenB: ${ethers.formatEther(balanceB)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Liquidity addition failed:", error);
    process.exit(1);
  }); 