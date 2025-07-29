const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CustomPool", function () {
  let CustomPool, customPool, TestToken, tokenA, tokenB, Factory, factory;
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
    it("Should set factory and owner correctly", async function () {
      expect(await customPool.factory()).to.equal(owner.address);
      expect(await customPool.owner()).to.equal(owner.address);
    });
  });

  describe("Initialization", function () {
    it("Should initialize pool correctly", async function () {
      const fee = 3000;
      const tickSpacing = 60;

      // Only factory can initialize, so we need to set the factory first
      await customPool.initialize(tokenA.address, tokenB.address, fee, tickSpacing);

      expect(await customPool.token0()).to.equal(tokenA.address < tokenB.address ? tokenA.address : tokenB.address);
      expect(await customPool.token1()).to.equal(tokenA.address < tokenB.address ? tokenB.address : tokenA.address);
      expect(await customPool.fee()).to.equal(fee);
      expect(await customPool.tickSpacing()).to.equal(tickSpacing);
    });

    it("Should fail if caller is not factory", async function () {
      await expect(
        customPool.connect(addr1).initialize(tokenA.address, tokenB.address, 3000, 60)
      ).to.be.revertedWith("UNAUTHORIZED");
    });

    it("Should fail if token address is zero", async function () {
      await expect(
        customPool.initialize(ethers.ZeroAddress, tokenB.address, 3000, 60)
      ).to.be.revertedWith("ZERO_ADDRESS");
    });

    it("Should fail if tokens are identical", async function () {
      await expect(
        customPool.initialize(tokenA.address, tokenA.address, 3000, 60)
      ).to.be.revertedWith("IDENTICAL_ADDRESSES");
    });
  });

  describe("Liquidity Management", function () {
    beforeEach(async function () {
      await customPool.initialize(tokenA.address, tokenB.address, 3000, 60);
    });

    it("Should add liquidity correctly", async function () {
      const initialLiquidity = await customPool.liquidity();
      const amount = 1000;

      await customPool.addLiquidity(amount);

      expect(await customPool.liquidity()).to.equal(initialLiquidity.add(amount));
    });

    it("Should remove liquidity correctly", async function () {
      const amount = 1000;
      await customPool.addLiquidity(amount);

      const liquidityBefore = await customPool.liquidity();
      await customPool.removeLiquidity(500);

      expect(await customPool.liquidity()).to.equal(liquidityBefore.sub(500));
    });

    it("Should fail when removing more liquidity than available", async function () {
      const amount = 1000;
      await customPool.addLiquidity(amount);

      await expect(
        customPool.removeLiquidity(amount + 1)
      ).to.be.revertedWith("INSUFFICIENT_LIQUIDITY");
    });

    it("Should handle multiple liquidity operations", async function () {
      await customPool.addLiquidity(1000);
      await customPool.addLiquidity(500);
      await customPool.removeLiquidity(300);

      expect(await customPool.liquidity()).to.equal(1200);
    });
  });

  describe("Balance and Reserve Functions", function () {
    beforeEach(async function () {
      await customPool.initialize(tokenA.address, tokenB.address, 3000, 60);
    });

    it("Should return correct total balance", async function () {
      const [balance0, balance1] = await customPool.getTotalBalance();
      
      expect(balance0).to.equal(await tokenA.balanceOf(customPool.address));
      expect(balance1).to.equal(await tokenB.balanceOf(customPool.address));
    });

    it("Should return correct reserves", async function () {
      const [reserve0, reserve1, liquidity] = await customPool.getReserves();
      
      expect(reserve0).to.equal(await tokenA.balanceOf(customPool.address));
      expect(reserve1).to.equal(await tokenB.balanceOf(customPool.address));
      expect(liquidity).to.equal(await customPool.liquidity());
    });

    it("Should fail if non-owner calls getTotalBalance", async function () {
      await expect(
        customPool.connect(addr1).getTotalBalance()
      ).to.be.revertedWith("ONLY_OWNER");
    });

    it("Should fail if non-owner calls getReserves", async function () {
      await expect(
        customPool.connect(addr1).getReserves()
      ).to.be.revertedWith("ONLY_OWNER");
    });

    it("Should update reserves after liquidity changes", async function () {
      const initialLiquidity = await customPool.liquidity();
      const [initialReserve0, initialReserve1, initialLiquidityReserve] = await customPool.getReserves();

      await customPool.addLiquidity(1000);

      const [newReserve0, newReserve1, newLiquidityReserve] = await customPool.getReserves();
      
      expect(newLiquidityReserve).to.equal(initialLiquidity.add(1000));
    });
  });

  describe("Ownership Management", function () {
    it("Should transfer ownership successfully", async function () {
      await customPool.transferOwnership(addr1.address);
      expect(await customPool.owner()).to.equal(addr1.address);
    });

    it("Should fail if non-owner tries to transfer ownership", async function () {
      await expect(
        customPool.connect(addr1).transferOwnership(addr2.address)
      ).to.be.revertedWith("ONLY_OWNER");
    });

    it("Should fail if transferring to zero address", async function () {
      await expect(
        customPool.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("ZERO_ADDRESS");
    });

    it("Should emit OwnershipTransferred event", async function () {
      await expect(customPool.transferOwnership(addr1.address))
        .to.emit(customPool, "OwnershipTransferred")
        .withArgs(owner.address, addr1.address);
    });

    it("Should allow new owner to call restricted functions", async function () {
      await customPool.transferOwnership(addr1.address);
      
      // New owner should be able to call getTotalBalance
      await expect(customPool.connect(addr1).getTotalBalance()).to.not.be.reverted;
      
      // Old owner should not be able to call getTotalBalance
      await expect(customPool.getTotalBalance()).to.be.revertedWith("ONLY_OWNER");
    });
  });

  describe("Integration with Factory", function () {
    it("Should be properly initialized when created by factory", async function () {
      const fee = 3000;
      const tickSpacing = 60;

      // Create pool through factory
      await factory.createPool(tokenA.address, tokenB.address, fee, tickSpacing);
      const poolAddress = await factory.getPool(tokenA.address, tokenB.address, fee);
      const pool = CustomPool.attach(poolAddress);

      expect(await pool.factory()).to.equal(factory.address);
      expect(await pool.owner()).to.equal(factory.address);
      expect(await pool.token0()).to.equal(tokenA.address < tokenB.address ? tokenA.address : tokenB.address);
      expect(await pool.token1()).to.equal(tokenA.address < tokenB.address ? tokenB.address : tokenA.address);
      expect(await pool.fee()).to.equal(fee);
      expect(await pool.tickSpacing()).to.equal(tickSpacing);
    });
  });
}); 