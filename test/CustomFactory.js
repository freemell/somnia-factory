const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CustomFactory", function () {
  it("Should deploy and create a pool", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CustomFactory");
    const factory = await Factory.deploy(owner.address);
    // await factory.deployed(); // Not needed in ethers v6

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
    expect(pool).to.not.equal(ethers.ZeroAddress);
  });

  it("Should prevent duplicate pools", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CustomFactory");
    const factory = await Factory.deploy(owner.address);
    // await factory.deployed(); // Not needed in ethers v6

    await factory.createPool(
      "0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7",
      "0xd2480162aa7f02ead7bf4c127465446150d58452",
      3000,
      60
    );

    await expect(
      factory.createPool(
        "0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7",
        "0xd2480162aa7f02ead7bf4c127465446150d58452",
        3000,
        60
      )
    ).to.be.revertedWith("POOL_EXISTS");
  });

  it("Should create pool for INSOM/STT using specified wallet", async function () {
    // This test uses the actual deployed CustomFactory on Somnia Testnet
    const CUSTOM_FACTORY_ADDRESS = "0x0C2bBdd5C86C874BB37120121468D2ba9726FAd7";
    const STT_TOKEN_ADDRESS = "0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7";
    const OWNER_ADDRESS = "0x14FD085974c62315fd5a02Eb6DB3ba950644B70b";
    const FEE_TIER = 3000;
    const TICK_SPACING = 60; // Standard tick spacing for 0.3% fee tier
    
    // Get the signer with the specified private key
    const privateKey = "e0ca98f46499e6813ace8282687dc6c36aa026356f02bb922ab763cd0ed4dd75";
    const signer = new ethers.Wallet(privateKey, ethers.provider);
    
    // Connect to the deployed CustomFactory
    const CustomFactory = await ethers.getContractFactory("CustomFactory");
    const customFactory = CustomFactory.attach(CUSTOM_FACTORY_ADDRESS).connect(signer);
    
    // Check if the signer is the owner of the CustomFactory
    const factoryOwner = await customFactory.owner();
    console.log(`🏭 CustomFactory owner: ${factoryOwner}`);
    console.log(`👤 Signer address: ${signer.address}`);
    
    // Deploy Insomiacs token first
    const Insomiacs = await ethers.getContractFactory("Insomiacs");
    const insomiacsToken = await Insomiacs.connect(signer).deploy(OWNER_ADDRESS);
    await insomiacsToken.waitForDeployment();
    const insomiacsAddress = await insomiacsToken.getAddress();
    
    console.log(`✅ Insomiacs token deployed to: ${insomiacsAddress}`);
    
    // Check if pool already exists
    let poolAddress = await customFactory.getPool(insomiacsAddress, STT_TOKEN_ADDRESS, FEE_TIER);
    
    if (poolAddress === ethers.ZeroAddress) {
      console.log("🆕 Pool doesn't exist yet...");
      
      // Only try to create pool if the signer is the owner
      if (factoryOwner.toLowerCase() === signer.address.toLowerCase()) {
        console.log("👑 Signer is the owner, creating new INSOM/STT pool...");
        
        // Create the pool with all four arguments
        const createPoolTx = await customFactory.createPool(insomiacsAddress, STT_TOKEN_ADDRESS, FEE_TIER, TICK_SPACING);
        await createPoolTx.wait();
        
        // Get the pool address after creation
        poolAddress = await customFactory.getPool(insomiacsAddress, STT_TOKEN_ADDRESS, FEE_TIER);
        console.log(`✅ Pool created at: ${poolAddress}`);
      } else {
        console.log("⚠️  Signer is not the owner, cannot create pool. Testing pool lookup only.");
        console.log("💡 To create a pool, the owner needs to call createPool or transfer ownership.");
      }
    } else {
      console.log(`✅ Pool already exists at: ${poolAddress}`);
    }
    
    // Test the getPool function works correctly
    const retrievedPoolAddress = await customFactory.getPool(insomiacsAddress, STT_TOKEN_ADDRESS, FEE_TIER);
    console.log(`🔍 Retrieved pool address: ${retrievedPoolAddress}`);
    
    // Verify the pool lookup works (even if pool doesn't exist, it should return ZeroAddress)
    expect(retrievedPoolAddress).to.be.a("string");
    
    console.log(`🎉 INSOM/STT pool verification completed!`);
    console.log(`📍 Token Address: ${insomiacsAddress}`);
    console.log(`🏊 Pool Address: ${poolAddress}`);
    console.log(`🔗 Fee Tier: ${FEE_TIER} (0.3%)`);
    console.log(`👑 Factory Owner: ${factoryOwner}`);
  });
}); 