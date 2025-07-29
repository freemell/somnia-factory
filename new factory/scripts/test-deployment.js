const hre = require("hardhat");

async function main() {
  console.log("Testing contract deployment...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy Factory
  console.log("Deploying Factory...");
  const Factory = await hre.ethers.getContractFactory("Factory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  console.log("Factory deployed to:", await factory.getAddress());

  // Deploy Test Tokens
  console.log("Deploying Test Tokens...");
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  const tokenA = await TestToken.deploy("Test Token A", "TTA");
  await tokenA.waitForDeployment();
  console.log("Token A deployed to:", await tokenA.getAddress());

  const tokenB = await TestToken.deploy("Test Token B", "TTB");
  await tokenB.waitForDeployment();
  console.log("Token B deployed to:", await tokenB.getAddress());

  // Test Factory Functions
  console.log("\nTesting Factory functions...");
  console.log("Factory owner:", await factory.owner());
  console.log("Total pools:", await factory.allPoolsLength());

  // Create a pool
  console.log("\nCreating a pool...");
  const tx = await factory.createPool(await tokenA.getAddress(), await tokenB.getAddress(), 3000, 60);
  await tx.wait();
  console.log("Pool created successfully!");

  // Get pool address
  const poolAddress = await factory.getPool(await tokenA.getAddress(), await tokenB.getAddress(), 3000);
  console.log("Pool address:", poolAddress);
  console.log("Total pools:", await factory.allPoolsLength());

  // Test pool functions
  console.log("\nTesting Pool functions...");
  const pool = await hre.ethers.getContractAt("CustomPool", poolAddress);
  
  console.log("Pool factory:", await pool.factory());
  console.log("Pool owner:", await pool.owner());
  console.log("Pool token0:", await pool.token0());
  console.log("Pool token1:", await pool.token1());
  console.log("Pool fee:", await pool.fee());
  console.log("Pool tickSpacing:", await pool.tickSpacing());
  console.log("Pool liquidity:", await pool.liquidity());

  // Test liquidity functions
  console.log("\nTesting liquidity functions...");
  await pool.addLiquidity(1000);
  console.log("Liquidity after adding 1000:", await pool.liquidity());

  await pool.removeLiquidity(500);
  console.log("Liquidity after removing 500:", await pool.liquidity());

  // Test balance functions using factory helper functions
  console.log("\nTesting balance functions...");
  const [balance0, balance1] = await factory.getPoolTotalBalance(poolAddress);
  console.log("Total balance - Token0:", balance0.toString());
  console.log("Total balance - Token1:", balance1.toString());

  const [reserve0, reserve1, liquidity] = await factory.getPoolReserves(poolAddress);
  console.log("Reserves - Token0:", reserve0.toString());
  console.log("Reserves - Token1:", reserve1.toString());
  console.log("Reserves - Liquidity:", liquidity.toString());

  console.log("\nAll tests passed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 