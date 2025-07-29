const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Factory and CustomPool Integration", function () {
  let Factory, factory, TestToken, tokenA, tokenB;
  let owner, addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy contracts
    Factory = await ethers.getContractFactory("Factory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();

    TestToken = await ethers.getContractFactory("TestToken");
    tokenA = await TestToken.deploy("Test Token A", "TTA");
    await tokenA.waitForDeployment();

    tokenB = await TestToken.deploy("Test Token B", "TTB");
    await tokenB.waitForDeployment();
  });

  describe("Factory Deployment", function () {
    it("Should deploy factory with correct owner", async function () {
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("Should start with zero pools", async function () {
      expect(await factory.allPoolsLength()).to.equal(0);
    });
  });

  describe("Pool Creation", function () {
    it("Should create a pool through factory", async function () {
      const fee = 3000;
      const tickSpacing = 60;

      await expect(factory.createPool(tokenA.address, tokenB.address, fee, tickSpacing))
        .to.emit(factory, "PoolCreated");

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
  });

  describe("Pool Management", function () {
    let poolAddress, pool;

    beforeEach(async function () {
      await factory.createPool(tokenA.address, tokenB.address, 3000, 60);
      poolAddress = await factory.getPool(tokenA.address, tokenB.address, 3000);
      pool = await ethers.getContractAt("CustomPool", poolAddress);
    });

    it("Should have correct pool configuration", async function () {
      expect(await pool.factory()).to.equal(factory.address);
      expect(await pool.owner()).to.equal(factory.address);
      expect(await pool.token0()).to.equal(tokenA.address < tokenB.address ? tokenA.address : tokenB.address);
      expect(await pool.token1()).to.equal(tokenA.address < tokenB.address ? tokenB.address : tokenA.address);
      expect(await pool.fee()).to.equal(3000);
      expect(await pool.tickSpacing()).to.equal(60);
    });

    it("Should allow factory to add liquidity", async function () {
      const initialLiquidity = await pool.liquidity();
      await pool.addLiquidity(1000);
      expect(await pool.liquidity()).to.equal(initialLiquidity + 1000n);
    });

    it("Should allow factory to remove liquidity", async function () {
      await pool.addLiquidity(1000);
      const liquidityBefore = await pool.liquidity();
      await pool.removeLiquidity(500);
      expect(await pool.liquidity()).to.equal(liquidityBefore - 500n);
    });

    it("Should allow factory to get total balance", async function () {
      const [balance0, balance1] = await pool.getTotalBalance();
      expect(balance0).to.equal(await tokenA.balanceOf(poolAddress));
      expect(balance1).to.equal(await tokenB.balanceOf(poolAddress));
    });

    it("Should allow factory to get reserves", async function () {
      const [reserve0, reserve1, liquidity] = await pool.getReserves();
      expect(reserve0).to.equal(await tokenA.balanceOf(poolAddress));
      expect(reserve1).to.equal(await tokenB.balanceOf(poolAddress));
      expect(liquidity).to.equal(await pool.liquidity());
    });

    it("Should fail if non-factory calls restricted functions", async function () {
      await expect(
        pool.connect(addr1).getTotalBalance()
      ).to.be.revertedWith("ONLY_OWNER");
    });
  });

  describe("Factory Ownership", function () {
    it("Should transfer factory ownership", async function () {
      await factory.transferOwnership(addr1.address);
      expect(await factory.owner()).to.equal(addr1.address);
    });

    it("Should fail if non-owner transfers ownership", async function () {
      await expect(
        factory.connect(addr1).transferOwnership(addr1.address)
      ).to.be.revertedWith("ONLY_OWNER");
    });
  });
}); 