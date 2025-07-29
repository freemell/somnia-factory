const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting factory deployment...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.getBalance()));

  // Deploy CustomPoolDeployer first
  console.log("\n📦 Deploying CustomPoolDeployer...");
  const CustomPoolDeployer = await ethers.getContractFactory("CustomPoolDeployer");
  const customPoolDeployer = await CustomPoolDeployer.deploy();
  await customPoolDeployer.waitForDeployment();
  const poolDeployerAddress = await customPoolDeployer.getAddress();
  console.log("✅ CustomPoolDeployer deployed to:", poolDeployerAddress);

  // Deploy CustomFactory
  console.log("\n🏭 Deploying CustomFactory...");
  const CustomFactory = await ethers.getContractFactory("CustomFactory");
  const customFactory = await CustomFactory.deploy(poolDeployerAddress);
  await customFactory.waitForDeployment();
  const factoryAddress = await customFactory.getAddress();
  console.log("✅ CustomFactory deployed to:", factoryAddress);

  // Configure CustomPoolDeployer
  console.log("\n⚙️ Configuring CustomPoolDeployer...");
  const poolBytecode = await customPoolDeployer.poolBytecode();
  const setFactoryTx = await customPoolDeployer.setFactory(factoryAddress);
  await setFactoryTx.wait();
  console.log("✅ CustomPoolDeployer configured with factory address");

  // Deploy test tokens (if needed)
  console.log("\n🪙 Deploying test tokens...");
  const TokenA = await ethers.getContractFactory("TokenA");
  const tokenA = await TokenA.deploy("Test Token A", "TTA");
  await tokenA.waitForDeployment();
  const tokenAAddress = await tokenA.getAddress();
  console.log("✅ TokenA deployed to:", tokenAAddress);

  const TokenB = await ethers.getContractFactory("TokenB");
  const tokenB = await TokenB.deploy("Test Token B", "TTB");
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();
  console.log("✅ TokenB deployed to:", tokenBAddress);

  // Create a test pool
  console.log("\n🏊 Creating test pool...");
  const feeTier = 3000; // 0.3%
  const createPoolTx = await customFactory.createPool(tokenAAddress, tokenBAddress, feeTier);
  await createPoolTx.wait();
  console.log("✅ Test pool created");

  // Get pool address
  const poolAddress = await customFactory.getPool(tokenAAddress, tokenBAddress, feeTier);
  console.log("📍 Pool address:", poolAddress);

  // Save deployment info
  const deploymentInfo = {
    network: "somnia-testnet",
    deployer: deployer.address,
    contracts: {
      customPoolDeployer: poolDeployerAddress,
      customFactory: factoryAddress,
      tokenA: tokenAAddress,
      tokenB: tokenBAddress,
      testPool: poolAddress
    },
    deploymentTime: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(__dirname, "../deployment-factory.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n🎉 Factory deployment completed!");
  console.log("📄 Deployment info saved to: deployment-factory.json");
  
  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 