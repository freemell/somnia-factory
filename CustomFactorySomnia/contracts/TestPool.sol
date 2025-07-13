// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TestPool {
    address public token0;
    address public token1;
    uint24 public fee;
    address public factory;
    bool public initialized;
    
    constructor() {
        // No constructor parameters needed for CREATE2 deployment
    }
    
    function initialize(address _token0, address _token1, uint24 _fee, address _factory) external {
        require(!initialized, "Already initialized");
        require(_token0 != address(0) && _token1 != address(0), "Zero address");
        require(_token0 != _token1, "Identical addresses");
        require(_factory != address(0), "Zero factory");
        
        token0 = _token0;
        token1 = _token1;
        fee = _fee;
        factory = _factory;
        initialized = true;
    }
    
    function getPoolId() external pure returns (bytes32) {
        return keccak256(abi.encodePacked("test-pool"));
    }
} 