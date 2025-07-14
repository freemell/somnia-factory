// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CustomPool is ReentrancyGuard {
    address public factory;
    address public token0;
    address public token1;
    uint24 public fee;
    int24 public tickSpacing;
    uint128 public liquidity;

    constructor(address _token0, address _token1, uint24 _fee, int24 _tickSpacing) {
        factory = msg.sender;
        require(_token0 != address(0) && _token1 != address(0), "ZERO_ADDRESS");
        require(_token0 != _token1, "IDENTICAL_ADDRESSES");
        token0 = _token0;
        token1 = _token1;
        fee = _fee;
        tickSpacing = _tickSpacing;
    }

    function addLiquidity(uint128 amount) external nonReentrant {
        liquidity += amount;
    }

    function removeLiquidity(uint128 amount) external nonReentrant {
        require(liquidity >= amount, "INSUFFICIENT_LIQUIDITY");
        liquidity -= amount;
    }
} 