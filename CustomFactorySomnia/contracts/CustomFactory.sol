// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface ICustomPoolDeployer {
    function deployPool(address token0, address token1, uint24 fee, bytes32 salt) external returns (address pool);
}

contract CustomFactory is Ownable {
    address public feeToSetter;
    address public communityVault;
    ICustomPoolDeployer public poolDeployer;
    mapping(address => mapping(address => mapping(uint24 => address))) public getPool;
    uint256 public poolCount;

    event PoolCreated(address indexed token0, address indexed token1, uint24 fee, address pool);

    constructor(address _initialOwner, address _poolDeployer, address _communityVault) Ownable(_initialOwner) {
        require(_initialOwner != address(0), "INVALID_OWNER");
        require(_poolDeployer != address(0), "INVALID_DEPLOYER");
        require(_communityVault != address(0), "INVALID_VAULT");
        feeToSetter = _initialOwner;
        poolDeployer = ICustomPoolDeployer(_poolDeployer);
        communityVault = _communityVault;
    }

    function createPool(address tokenA, address tokenB, uint24 fee) external onlyOwner returns (address pool) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0) && token1 != address(0), "ZERO_ADDRESS");
        require(getPool[token0][token1][fee] == address(0), "POOL_EXISTS");
        require(fee == 100 || fee == 500 || fee == 3000 || fee == 10000, "INVALID_FEE");

        bytes32 salt = keccak256(abi.encodePacked(token0, token1, fee));
        pool = poolDeployer.deployPool(token0, token1, fee, salt);
        require(pool != address(0), "DEPLOY_FAILED");

        getPool[token0][token1][fee] = pool;
        getPool[token1][token0][fee] = pool;
        poolCount += 1;
        emit PoolCreated(token0, token1, fee, pool);
        return pool;
    }

    function setFeeToSetter(address _feeToSetter) external onlyOwner {
        require(_feeToSetter != address(0), "INVALID_FEE_TO_SETTER");
        feeToSetter = _feeToSetter;
    }
} 