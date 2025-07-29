const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Factory", function () {
  let Factory, factory, CustomPool, customPool, TestToken, tokenA, tokenB;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy contracts
    Factory = await ethers.getContractFactory("Factory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();

    CustomPool = await ethers.getContractFactory("CustomPool");
    customPool = await CustomPool.deploy();
    await customPool.waitForDeployment();

    TestToken = await ethers.getContractFactory("TestToken");
    tokenA = await TestToken.deploy("Test Token A", "TTA");
    await tokenA.waitForDeployment();

    tokenB = await TestToken.deploy("Test Token B", "TTB");
    await tokenB.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("Should start with zero pools", async function () {
      expect(await factory.allPoolsLength()).to.equal(0);
    });
  });

  describe("Pool Creation", function () {
    it("Should create a pool successfully", async function () {
      const fee = 3000;
      const tickSpacing = 60;

      await expect(factory.createPool(tokenA.address, tokenB.address, fee, tickSpacing))
        .to.emit(factory, "PoolCreated")
        .withArgs(
          tokenA.address < tokenB.address ? tokenA.address : tokenB.address,
          tokenA.address < tokenB.address ? tokenB.address : tokenA.address,
          fee,
          ethers.isAddress
        );

      expect(await factory.allPoolsLength()).to.equal(1);
      
      const poolAddress = await factory.getPool(tokenA.address, tokenB.address, fee);
      expect(poolAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should fail if caller is not owner", async function () {
      await expect(
        factory.connect(addr1).createPool(tokenA.address, tokenB.address, 3000, 60)
      ).to.be.revertedWith("ONLY_OWNER");
    });

    it("Should fail if tokens are identical", async function () {
      await expect(
        factory.createPool(tokenA.address, tokenA.address, 3000, 60)
      ).to.be.revertedWith("IDENTICAL_ADDRESSES");
    });

    it("Should fail if token address is zero", async function () {
      await expect(
        factory.createPool(ethers.ZeroAddress, tokenB.address, 3000, 60)
      ).to.be.revertedWith("ZERO_ADDRESS");
    });

    it("Should fail if pool already exists", async function () {
      await factory.createPool(tokenA.address, tokenB.address, 3000, 60);
      
      await expect(
        factory.createPool(tokenA.address, tokenB.address, 3000, 60)
      ).to.be.revertedWith("POOL_EXISTS");
    });

    it("Should create multiple pools with different fees", async function () {
      await factory.createPool(tokenA.address, tokenB.address, 3000, 60);
      await factory.createPool(tokenA.address, tokenB.address, 500, 10);
      await factory.createPool(tokenA.address, tokenB.address, 10000, 200);

      expect(await factory.allPoolsLength()).to.equal(3);
    });
  });

  describe("Pool Management", function () {
    beforeEach(async function () {
      await factory.createPool(tokenA.address, tokenB.address, 3000, 60);
    });

    it("Should return correct pool address", async function () {
      const poolAddress = await factory.getPool(tokenA.address, tokenB.address, 3000);
      expect(poolAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should return same pool address regardless of token order", async function () {
      const pool1 = await factory.getPool(tokenA.address, tokenB.address, 3000);
      const pool2 = await factory.getPool(tokenB.address, tokenA.address, 3000);
      expect(pool1).to.equal(pool2);
    });

    it("Should list all pools correctly", async function () {
      await factory.createPool(tokenA.address, tokenB.address, 500, 10);
      
      expect(await factory.allPoolsLength()).to.equal(2);
      
      const pool0 = await factory.getPoolByIndex(0);
      const pool1 = await factory.getPoolByIndex(1);
      
      expect(pool0).to.not.equal(ethers.ZeroAddress);
      expect(pool1).to.not.equal(ethers.ZeroAddress);
      expect(pool0).to.not.equal(pool1);
    });

    it("Should fail when accessing invalid pool index", async function () {
      await expect(factory.getPoolByIndex(1)).to.be.revertedWith("INVALID_INDEX");
    });
  });

  describe("Ownership", function () {
    it("Should transfer ownership successfully", async function () {
      await factory.transferOwnership(addr1.address);
      expect(await factory.owner()).to.equal(addr1.address);
    });

    it("Should fail if non-owner tries to transfer ownership", async function () {
      await expect(
        factory.connect(addr1).transferOwnership(addr2.address)
      ).to.be.revertedWith("ONLY_OWNER");
    });

    it("Should fail if transferring to zero address", async function () {
      await expect(
        factory.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("ZERO_ADDRESS");
    });

    it("Should emit OwnershipTransferred event", async function () {
      await expect(factory.transferOwnership(addr1.address))
        .to.emit(factory, "OwnershipTransferred")
        .withArgs(owner.address, addr1.address);
    });
  });
}); 