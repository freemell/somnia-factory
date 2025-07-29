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
        int24 _tickSpacing
    ) external nonReentrant {
        require(msg.sender == factory, "UNAUTHORIZED");
        require(_token0 != address(0) && _token1 != address(0), "ZERO_ADDRESS");
        require(_token0 != _token1, "IDENTICAL_ADDRESSES");
        
        token0 = _token0;
        token1 = _token1;
        fee = _fee;
        tickSpacing = _tickSpacing;
    }

    function addLiquidity(uint128 amount) external nonReentrant {
        // Transfer tokens from sender
        IERC20(token0).transferFrom(msg.sender, address(this), amount);
        IERC20(token1).transferFrom(msg.sender, address(this), amount);
        
        liquidity += amount;
    }

    function addLiquidityWithSTT(uint128 tokenAmount, uint128 sttAmount) external payable nonReentrant {
        require(msg.value == sttAmount, "INSUFFICIENT_STT");
        require(tokenAmount > 0, "INSUFFICIENT_TOKEN_AMOUNT");
        
        // Transfer tokens from sender
        IERC20(token0).transferFrom(msg.sender, address(this), tokenAmount);
        IERC20(token1).transferFrom(msg.sender, address(this), tokenAmount);
        
        // STT is already sent via msg.value
        liquidity += tokenAmount + sttAmount;
    }

    function removeLiquidity(uint128 amount) external nonReentrant {
        require(liquidity >= amount, "INSUFFICIENT_LIQUIDITY");
        liquidity -= amount;
    }

    function getTotalBalance() external view onlyOwner returns (uint256 balance0, uint256 balance1) {
        balance0 = IERC20(token0).balanceOf(address(this));
        balance1 = IERC20(token1).balanceOf(address(this));
    }

    function getReserves() external view onlyOwner returns (
        uint256 reserve0, 
        uint256 reserve1, 
        uint128 _liquidity
    ) {
        reserve0 = IERC20(token0).balanceOf(address(this));
        reserve1 = IERC20(token1).balanceOf(address(this));
        _liquidity = liquidity;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDRESS");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    // Swap functionality
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address tokenIn,
        address tokenOut,
        address to
    ) external nonReentrant returns (uint256 amountOut) {
        require(tokenIn == token0 || tokenIn == token1, "INVALID_TOKEN_IN");
        require(tokenOut == token0 || tokenOut == token1, "INVALID_TOKEN_OUT");
        require(tokenIn != tokenOut, "IDENTICAL_TOKENS");
        require(to != address(0), "ZERO_ADDRESS");
        require(amountIn > 0, "INSUFFICIENT_INPUT_AMOUNT");

        // Calculate amount out using constant product formula
        uint256 reserveIn = IERC20(tokenIn).balanceOf(address(this));
        uint256 reserveOut = IERC20(tokenOut).balanceOf(address(this));
        
        require(reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");
        
        // Calculate fee (0.3% = 3000 basis points)
        uint256 amountInWithFee = amountIn * (10000 - fee) / 10000;
        
        // Calculate amount out using constant product formula: (x * y) / (x + dx)
        amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
        
        require(amountOut >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");
        require(amountOut < reserveOut, "INSUFFICIENT_LIQUIDITY");

        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(to, amountOut);

        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut, to);
    }

    // Swap STT (native token) for tokens
    function swapExactSTTForTokens(
        uint256 amountOutMin,
        address tokenOut,
        address to
    ) external payable nonReentrant returns (uint256 amountOut) {
        require(tokenOut == token0 || tokenOut == token1, "INVALID_TOKEN_OUT");
        require(to != address(0), "ZERO_ADDRESS");
        require(msg.value > 0, "INSUFFICIENT_INPUT_AMOUNT");

        uint256 amountIn = msg.value;
        uint256 reserveIn = address(this).balance - amountIn; // Current STT balance minus incoming
        uint256 reserveOut = IERC20(tokenOut).balanceOf(address(this));
        
        require(reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");
        
        // Calculate fee (0.3% = 3000 basis points)
        uint256 amountInWithFee = amountIn * (10000 - fee) / 10000;
        
        // Calculate amount out using constant product formula
        amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
        
        require(amountOut >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");
        require(amountOut < reserveOut, "INSUFFICIENT_LIQUIDITY");

        // Transfer tokens
        IERC20(tokenOut).transfer(to, amountOut);

        emit Swap(msg.sender, address(0), tokenOut, amountIn, amountOut, to);
    }

    // Swap tokens for STT (native token)
    function swapExactTokensForSTT(
        uint256 amountIn,
        uint256 amountOutMin,
        address tokenIn,
        address to
    ) external nonReentrant returns (uint256 amountOut) {
        require(tokenIn == token0 || tokenIn == token1, "INVALID_TOKEN_IN");
        require(to != address(0), "ZERO_ADDRESS");
        require(amountIn > 0, "INSUFFICIENT_INPUT_AMOUNT");

        uint256 reserveIn = IERC20(tokenIn).balanceOf(address(this));
        uint256 reserveOut = address(this).balance;
        
        require(reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");
        
        // Calculate fee (0.3% = 3000 basis points)
        uint256 amountInWithFee = amountIn * (10000 - fee) / 10000;
        
        // Calculate amount out using constant product formula
        amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
        
        require(amountOut >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");
        require(amountOut < reserveOut, "INSUFFICIENT_LIQUIDITY");

        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Transfer STT
        (bool success, ) = to.call{value: amountOut}("");
        require(success, "STT_TRANSFER_FAILED");

        emit Swap(msg.sender, tokenIn, address(0), amountIn, amountOut, to);
    }

    // Events
    event Swap(
        address indexed sender,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address to
    );

    // Receive function to accept STT
    receive() external payable {}
} 