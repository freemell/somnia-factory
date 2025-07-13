const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying tokens with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy TokenA
  console.log("Deploying TokenA...");
  const TokenA = await hre.ethers.getContractFactory("TokenA");
  const tokenA = await TokenA.deploy();
  await tokenA.waitForDeployment();
  console.log("TokenA deployed to:", await tokenA.getAddress());

  // Deploy TokenB
  console.log("Deploying TokenB...");
  const TokenB = await hre.ethers.getContractFactory("TokenB");
  const tokenB = await TokenB.deploy();
  await tokenB.waitForDeployment();
  console.log("TokenB deployed to:", await tokenB.getAddress());

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    TokenA: await tokenA.getAddress(),
    TokenB: await tokenB.getAddress(),
    Deployer: deployer.address,
    Timestamp: new Date().toISOString(),
  };
  fs.writeFileSync("deployment-tokens.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to deployment-tokens.json");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
}); 