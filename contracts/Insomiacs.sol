// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Insomiacs
 * @dev ERC-20 token for the Insomiacs project on Somnia Testnet
 * @dev Minting is restricted to the contract owner
 * @dev Initial supply: 1,000,000 tokens with 18 decimals
 */
contract Insomiacs is ERC20, Ownable {
    
    /**
     * @dev Constructor initializes the token with name, symbol, and initial supply
     * @param initialOwner The address that will be the owner and receive initial supply
     */
    constructor(address initialOwner) 
        ERC20("Insomiacs", "INSOM") 
        Ownable(initialOwner)
    {
        // Mint initial supply of 1,000,000 tokens to the owner
        // 1,000,000 * 10^18 = 1,000,000,000,000,000,000,000,000 wei
        _mint(initialOwner, 1000000 * 10**decimals());
    }
    
    /**
     * @dev Mint new tokens. Only callable by the contract owner.
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(to != address(0), "Insomiacs: cannot mint to zero address");
        require(amount > 0, "Insomiacs: amount must be greater than 0");
        
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens from the caller's balance
     * @param amount The amount of tokens to burn
     */
    function burn(uint256 amount) public {
        require(amount > 0, "Insomiacs: amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insomiacs: insufficient balance");
        
        _burn(msg.sender, amount);
    }
    
    /**
     * @dev Burn tokens from a specific address. Only callable by the contract owner.
     * @param from The address to burn tokens from
     * @param amount The amount of tokens to burn
     */
    function burnFrom(address from, uint256 amount) public onlyOwner {
        require(from != address(0), "Insomiacs: cannot burn from zero address");
        require(amount > 0, "Insomiacs: amount must be greater than 0");
        require(balanceOf(from) >= amount, "Insomiacs: insufficient balance");
        
        uint256 currentAllowance = allowance(from, msg.sender);
        require(currentAllowance >= amount, "Insomiacs: burn amount exceeds allowance");
        
        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
    }
    
    /**
     * @dev Override decimals to return 18 (standard for ERC-20 tokens)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
    
    /**
     * @dev Override transfer to include additional validation
     * @param to The address to transfer tokens to
     * @param amount The amount of tokens to transfer
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Insomiacs: cannot transfer to zero address");
        require(amount > 0, "Insomiacs: amount must be greater than 0");
        
        return super.transfer(to, amount);
    }
    
    /**
     * @dev Override transferFrom to include additional validation
     * @param from The address to transfer tokens from
     * @param to The address to transfer tokens to
     * @param amount The amount of tokens to transfer
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        require(from != address(0), "Insomiacs: cannot transfer from zero address");
        require(to != address(0), "Insomiacs: cannot transfer to zero address");
        require(amount > 0, "Insomiacs: amount must be greater than 0");
        
        return super.transferFrom(from, to, amount);
    }
} 