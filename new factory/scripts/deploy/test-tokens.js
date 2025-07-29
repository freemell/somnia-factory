const hre = require("hardhat");

async function main() {
  console.log("Deploying test tokens to Somnia Testnet...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy TestToken A
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  const tokenA = await TestToken.deploy("Test Token A", "TTA");
  await tokenA.waitForDeployment();

  // Deploy TestToken B
  const tokenB = await TestToken.deploy("Test Token B", "TTB");
  await tokenB.waitForDeployment();

  console.log("TestToken A deployed to:", await tokenA.getAddress());
  console.log("TestToken B deployed to:", await tokenB.getAddress());
  console.log("Token A Symbol:", await tokenA.symbol());
  console.log("Token B Symbol:", await tokenB.symbol());
  console.log("Token A Balance:", (await tokenA.balanceOf(deployer.address)).toString());
  console.log("Token B Balance:", (await tokenB.balanceOf(deployer.address)).toString());

  console.log("\n=== Test Tokens Deployed ===");
  console.log("Token A (TTA):", await tokenA.getAddress());
  console.log("Token B (TTB):", await tokenB.getAddress());
  console.log("\nYou can now create pools using these tokens!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 