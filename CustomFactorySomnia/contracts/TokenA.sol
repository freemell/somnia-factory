// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenA is ERC20, Ownable {
    constructor()
        ERC20("Test Token A", "TTA")
        Ownable(0x35DaDAb2bb21A6d4e20beC3F603B8426Dc124004)
    {
        _mint(0x35DaDAb2bb21A6d4e20beC3F603B8426Dc124004, 1_000_000 * 10**18);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");
        _mint(to, amount);
    }
} 