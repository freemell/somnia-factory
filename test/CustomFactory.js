const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CustomFactory", function () {
  it("Should deploy and create a pool", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CustomFactory");
    const factory = await Factory.deploy(owner.address);
    await factory.deployed();

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
    expect(pool).to.not.equal(ethers.constants.AddressZero);
  });

  it("Should prevent duplicate pools", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CustomFactory");
    const factory = await Factory.deploy(owner.address);
    await factory.deployed();

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
}); 