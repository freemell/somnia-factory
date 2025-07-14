// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CustomPool.sol";

contract CustomFactory is Ownable {
    address public feeToSetter;
    mapping(address => mapping(address => mapping(uint24 => address))) public pools;
    uint256 public poolCount;

    event PoolCreated(address indexed token0, address indexed token1, uint24 fee, int24 tickSpacing, address pool);

    constructor(address _initialOwner) Ownable(_initialOwner) {
        require(_initialOwner != address(0), "INVALID_OWNER");
        feeToSetter = _initialOwner;
    }

    function createPool(address tokenA, address tokenB, uint24 fee, int24 tickSpacing) external onlyOwner returns (address pool) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0) && token1 != address(0), "ZERO_ADDRESS");
        require(pools[token0][token1][fee] == address(0), "POOL_EXISTS");
        require(fee == 100 || fee == 500 || fee == 3000 || fee == 10000, "INVALID_FEE");

        // Create a new CustomPool using CREATE2 for deterministic addresses
        bytes32 salt = keccak256(abi.encodePacked(token0, token1, fee, tickSpacing));
        
        // Deploy the pool using CREATE2
        pool = address(new CustomPool{salt: salt}(token0, token1, fee, tickSpacing));

        pools[token0][token1][fee] = pool;
        pools[token1][token0][fee] = pool;
        poolCount += 1;
        emit PoolCreated(token0, token1, fee, tickSpacing, pool);
        return pool;
    }

    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        return pools[token0][token1][fee];
    }

    function setFeeToSetter(address _feeToSetter) external onlyOwner {
        require(_feeToSetter != address(0), "INVALID_FEE_TO_SETTER");
        feeToSetter = _feeToSetter;
    }
} 