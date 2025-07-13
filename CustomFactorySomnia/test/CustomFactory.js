const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CustomFactory", function () {
  let customFactory;
  let customPoolDeployer;
  let tokenA;
  let tokenB;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy tokens
    const TokenA = await ethers.getContractFactory("TokenA");
    tokenA = await TokenA.deploy();
    await tokenA.waitForDeployment();

    const TokenB = await ethers.getContractFactory("TokenB");
    tokenB = await TokenB.deploy();
    await tokenB.waitForDeployment();

    // Get the creation bytecode from TestPool contract factory
    const TestPool = await ethers.getContractFactory("TestPool");
    const testPoolBytecode = TestPool.bytecode;

    // Deploy CustomPoolDeployer
    const CustomPoolDeployer = await ethers.getContractFactory("CustomPoolDeployer");
    customPoolDeployer = await CustomPoolDeployer.deploy(owner.address);
    await customPoolDeployer.waitForDeployment();

    // Set the bytecode in the deployer
    await customPoolDeployer.setPoolBytecode(testPoolBytecode);

    // Deploy CustomFactory
    const CustomFactory = await ethers.getContractFactory("CustomFactory");
    customFactory = await CustomFactory.deploy(owner.address, await customPoolDeployer.getAddress(), owner.address);
    await customFactory.waitForDeployment();

    // Link the factory to the deployer
    await customPoolDeployer.setFactory(await customFactory.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await customPoolDeployer.owner()).to.equal(owner.address);
    });

    it("Should set the correct factory", async function () {
      expect(await customPoolDeployer.factory()).to.equal(await customFactory.getAddress());
    });

    it("Should set the correct pool deployer in factory", async function () {
      expect(await customFactory.poolDeployer()).to.equal(await customPoolDeployer.getAddress());
    });
  });

  describe("Pool Creation", function () {
    it("Should create a pool successfully", async function () {
      const fee = 3000;

      const tx = await customFactory.createPool(await tokenA.getAddress(), await tokenB.getAddress(), fee);
      const receipt = await tx.wait();

      // Check for PoolCreated event
      const poolCreatedEvent = receipt.logs.find(log => {
        try {
          const parsed = customFactory.interface.parseLog(log);
          return parsed.name === "PoolCreated";
        } catch {
          return false;
        }
      });

      expect(poolCreatedEvent).to.not.be.undefined;

      const parsed = customFactory.interface.parseLog(poolCreatedEvent);
      expect(parsed.args.token0).to.equal(await tokenA.getAddress());
      expect(parsed.args.token1).to.equal(await tokenB.getAddress());
      expect(parsed.args.fee).to.equal(fee);
      expect(parsed.args.pool).to.not.equal(ethers.ZeroAddress);
    });

    it("Should return the correct pool address via getPool", async function () {
      const fee = 3000;

      // Create pool
      const tx = await customFactory.createPool(await tokenA.getAddress(), await tokenB.getAddress(), fee);
      const receipt = await tx.wait();

      // Get pool address from event
      const poolCreatedEvent = receipt.logs.find(log => {
        try {
          const parsed = customFactory.interface.parseLog(log);
          return parsed.name === "PoolCreated";
        } catch {
          return false;
        }
      });

      const parsed = customFactory.interface.parseLog(poolCreatedEvent);
      const expectedPoolAddress = parsed.args.pool;

      // Check getPool returns the same address
      const actualPoolAddress = await customFactory.getPool(await tokenA.getAddress(), await tokenB.getAddress(), fee);
      expect(actualPoolAddress).to.equal(expectedPoolAddress);
    });

    it("Should revert when creating pool with same parameters twice", async function () {
      const fee = 3000;

      // Create pool first time
      await customFactory.createPool(await tokenA.getAddress(), await tokenB.getAddress(), fee);

      // Try to create pool with same parameters again
      await expect(
        customFactory.createPool(await tokenA.getAddress(), await tokenB.getAddress(), fee)
      ).to.be.revertedWith("POOL_EXISTS");
    });

    it("Should revert when token addresses are the same", async function () {
      const fee = 3000;

      await expect(
        customFactory.createPool(await tokenA.getAddress(), await tokenA.getAddress(), fee)
      ).to.be.revertedWith("IDENTICAL_ADDRESSES");
    });

    it("Should revert when fee is invalid", async function () {
      const fee = 2000; // Invalid fee

      await expect(
        customFactory.createPool(await tokenA.getAddress(), await tokenB.getAddress(), fee)
      ).to.be.revertedWith("INVALID_FEE");
    });
  });

  describe("Access Control", function () {
    it("Should only allow owner to set bytecode", async function () {
      const newBytecode = "0x1234567890abcdef";
      
      await expect(
        customPoolDeployer.connect(addr1).setPoolBytecode(newBytecode)
      ).to.be.revertedWithCustomError(customPoolDeployer, "OwnableUnauthorizedAccount");
    });

    it("Should only allow owner to set factory", async function () {
      await expect(
        customPoolDeployer.connect(addr1).setFactory(addr2.address)
      ).to.be.revertedWithCustomError(customPoolDeployer, "OwnableUnauthorizedAccount");
    });

    it("Should only allow owner to create pools", async function () {
      const fee = 3000;
      
      await expect(
        customFactory.connect(addr1).createPool(await tokenA.getAddress(), await tokenB.getAddress(), fee)
      ).to.be.revertedWithCustomError(customFactory, "OwnableUnauthorizedAccount");
    });
  });

  describe("Pool Properties", function () {
    it("Should create pool with correct token order", async function () {
      const fee = 3000;

      const tx = await customFactory.createPool(await tokenA.getAddress(), await tokenB.getAddress(), fee);
      const receipt = await tx.wait();

      const poolCreatedEvent = receipt.logs.find(log => {
        try {
          const parsed = customFactory.interface.parseLog(log);
          return parsed.name === "PoolCreated";
        } catch {
          return false;
        }
      });

      const parsed = customFactory.interface.parseLog(poolCreatedEvent);
      const poolAddress = parsed.args.pool;

      // Verify the pool has correct properties
      const TestPool = await ethers.getContractFactory("TestPool");
      const pool = TestPool.attach(poolAddress);

      expect(await pool.token0()).to.equal(await tokenA.getAddress());
      expect(await pool.token1()).to.equal(await tokenB.getAddress());
      expect(await pool.fee()).to.equal(fee);
      expect(await pool.factory()).to.equal(await customFactory.getAddress());
      expect(await pool.initialized()).to.be.true;
    });
  });
}); 