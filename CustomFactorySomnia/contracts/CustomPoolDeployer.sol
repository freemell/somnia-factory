// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface ICustomPool {
    function initialize(address _token0, address _token1, uint24 _fee, address _factory) external;
}

/// @title CustomPoolDeployer
/// @notice Deploys Algebra V3 pools via CREATE2, restricted to CustomFactory
contract CustomPoolDeployer is Ownable {
    address public factory;
    bytes public poolBytecode;

    event FactorySet(address indexed factory);
    event BytecodeSet(bytes bytecode);
    event PoolDeployed(address indexed token0, address indexed token1, uint24 fee, address pool);

    modifier onlyFactory() {
        require(msg.sender == factory, "Not factory");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {
        factory = address(0);
    }

    /// @notice Set the factory address (one-time, onlyOwner)
    function setFactory(address _factory) external onlyOwner {
        require(factory == address(0), "Factory already set");
        require(_factory != address(0), "Zero address");
        factory = _factory;
        emit FactorySet(_factory);
    }

    /// @notice Set the pool bytecode (onlyOwner)
    function setPoolBytecode(bytes memory _bytecode) external onlyOwner {
        require(_bytecode.length > 0, "Empty bytecode");
        poolBytecode = _bytecode;
        emit BytecodeSet(_bytecode);
    }

    /// @notice Deploy a new Algebra pool using CREATE2 (only callable by factory)
    function deployPool(address token0, address token1, uint24 fee, bytes32 salt) external onlyFactory returns (address pool) {
        require(token0 != address(0) && token1 != address(0), "Zero address");
        require(token0 != token1, "Identical addresses");
        require(poolBytecode.length > 0, "Bytecode not set");
        
        bytes memory bytecode = poolBytecode;
        assembly {
            pool := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            if iszero(pool) { revert(0, 0) }
        }
        
        // Check if pool was deployed successfully
        require(pool != address(0), "Pool deployment failed");
        
        // Initialize the pool
        try ICustomPool(pool).initialize(token0, token1, fee, factory) {
            // Success
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("Pool initialization failed: ", reason)));
        } catch {
            revert("Pool initialization failed with no reason");
        }
        
        emit PoolDeployed(token0, token1, fee, pool);
    }
} 