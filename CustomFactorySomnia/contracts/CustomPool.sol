// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CustomPool is ReentrancyGuard {
    address public factory;
    address public owner;
    address public token0;
    address public token1;
    uint24 public fee;
    int24 public tickSpacing;
    uint128 public liquidity;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }

    constructor() {
        factory = msg.sender;
        owner = msg.sender; // Factory is initially the owner
    }

    function initialize(
        address _token0, 
        address _token1, 
        uint24 _fee, 
        address _factory
    ) external nonReentrant {
        require(msg.sender == factory, "UNAUTHORIZED");
        require(_token0 != address(0) && _token1 != address(0), "ZERO_ADDRESS");
        require(_token0 != _token1, "IDENTICAL_ADDRESSES");
        require(_factory != address(0), "ZERO_FACTORY");
        
        token0 = _token0;
        token1 = _token1;
        fee = _fee;
        factory = _factory;
        tickSpacing = 60; // Default tick spacing for 0.3% fee
    }

    function addLiquidity(uint128 amount) external nonReentrant {
        liquidity += amount;
    }

    function removeLiquidity(uint128 amount) external nonReentrant {
        require(liquidity >= amount, "INSUFFICIENT_LIQUIDITY");
        liquidity -= amount;
    }

    /**
     * @notice Returns the total balance of both tokens in the pool (only owner)
     * @return balance0 The balance of token0 held by this contract
     * @return balance1 The balance of token1 held by this contract
     */
    function getTotalBalance() external view onlyOwner returns (uint256 balance0, uint256 balance1) {
        balance0 = IERC20(token0).balanceOf(address(this));
        balance1 = IERC20(token1).balanceOf(address(this));
    }

    /**
     * @notice Returns pool reserves and the tracked liquidity (only owner)
     * @return reserve0 The balance of token0 in the pool
     * @return reserve1 The balance of token1 in the pool
     * @return _liquidity The tracked liquidity value
     */
    function getReserves() external view onlyOwner returns (
        uint256 reserve0, 
        uint256 reserve1, 
        uint128 _liquidity
    ) {
        reserve0 = IERC20(token0).balanceOf(address(this));
        reserve1 = IERC20(token1).balanceOf(address(this));
        _liquidity = liquidity;
    }

    /**
     * @notice Transfers ownership of the pool to a new address
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDRESS");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
} 