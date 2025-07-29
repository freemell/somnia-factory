// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.20;

import "./CustomPool.sol";

contract Factory {
    address public owner;
    mapping(address => mapping(address => mapping(uint24 => address))) public getPool;
    address[] public allPools;
    
    event PoolCreated(address indexed token0, address indexed token1, uint24 fee, address pool, uint256 poolIndex);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }

    function createPool(
        address tokenA,
        address tokenB,
        uint24 fee,
        int24 tickSpacing
    ) external onlyOwner returns (address pool) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        require(tokenA != address(0) && tokenB != address(0), "ZERO_ADDRESS");
        require(getPool[tokenA][tokenB][fee] == address(0), "POOL_EXISTS");

        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        pool = address(new CustomPool());
        CustomPool(payable(pool)).initialize(token0, token1, fee, tickSpacing);

        getPool[token0][token1][fee] = pool;
        getPool[token1][token0][fee] = pool;
        allPools.push(pool);

        emit PoolCreated(token0, token1, fee, pool, allPools.length - 1);
        return pool;
    }

    function allPoolsLength() external view returns (uint256) {
        return allPools.length;
    }

    function getPoolByIndex(uint256 index) external view returns (address) {
        require(index < allPools.length, "INVALID_INDEX");
        return allPools[index];
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDRESS");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    // Helper functions to call pool functions from factory
    function getPoolTotalBalance(address payable poolAddress) external view onlyOwner returns (uint256 balance0, uint256 balance1) {
        return CustomPool(poolAddress).getTotalBalance();
    }

    function getPoolReserves(address payable poolAddress) external view onlyOwner returns (uint256 reserve0, uint256 reserve1, uint128 liquidity) {
        return CustomPool(poolAddress).getReserves();
    }

    // Swap helper functions
    function swapSTTForTokens(
        address payable poolAddress,
        uint256 amountOutMin,
        address tokenOut
    ) external payable onlyOwner returns (uint256 amountOut) {
        return CustomPool(poolAddress).swapExactSTTForTokens{value: msg.value}(amountOutMin, tokenOut, msg.sender);
    }

    function swapTokensForSTT(
        address payable poolAddress,
        uint256 amountIn,
        uint256 amountOutMin,
        address tokenIn
    ) external onlyOwner returns (uint256 amountOut) {
        return CustomPool(poolAddress).swapExactTokensForSTT(amountIn, amountOutMin, tokenIn, msg.sender);
    }

    function swapTokensForTokens(
        address payable poolAddress,
        uint256 amountIn,
        uint256 amountOutMin,
        address tokenIn,
        address tokenOut
    ) external onlyOwner returns (uint256 amountOut) {
        return CustomPool(poolAddress).swapExactTokensForTokens(amountIn, amountOutMin, tokenIn, tokenOut, msg.sender);
    }
} 