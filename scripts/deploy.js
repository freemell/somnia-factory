const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("CustomFactory");
  const factory = await Factory.deploy(deployer.address);
  await factory.deployed();

  console.log("CustomFactory deployed to:", factory.address);

  const tx = await factory.createPool(
    "0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7",
    "0xd2480162aa7f02ead7bf4c127465446150d58452",
    3000,
    60
  );
  await tx.wait();

  const pool = await factory.getPool(
    "0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7",
    "0xd2480162aa7f02ead7bf4c127465446150d58452",
    3000
  );

  console.log("✅ Pool created at:", pool);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 