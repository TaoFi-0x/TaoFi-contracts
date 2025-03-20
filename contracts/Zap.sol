// SPDX-License-Identifier: ISC
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./interfaces/ISTAO.sol";
import "./interfaces/IUniswapV2Router02.sol";

contract TaoUSDSTAOZap is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable taoUSD;
    IERC20 public immutable sTAO;
    IUniswapV2Router02 public immutable uniswapRouter;

    constructor(address _taoUSD, address _sTAO, address _uniswapRouter) {
        taoUSD = IERC20(_taoUSD);
        sTAO = IERC20(_sTAO);
        uniswapRouter = IUniswapV2Router02(_uniswapRouter);

        // Approve tokens
        taoUSD.approve(_uniswapRouter, type(uint256).max);
        sTAO.approve(_uniswapRouter, type(uint256).max);
    }

    function zapAddLiquidity(uint256 taoUSDAmount, uint256 minTaoUSDAmount, uint256 minSTAOAmount)
        external
        payable
        nonReentrant
        returns (uint256 liquidity)
    {
        // Transfer taoUSD from user
        taoUSD.safeTransferFrom(msg.sender, address(this), taoUSDAmount);

        // Deposit TAO to get sTAO
        uint256 networkFee = ISTAO(address(sTAO)).networkFee();
        ISTAO(address(sTAO)).deposit{value: msg.value - networkFee}(address(this), minSTAOAmount);

        // Add liquidity to Uniswap
        (,, liquidity) = uniswapRouter.addLiquidity(
            address(taoUSD),
            address(sTAO),
            taoUSDAmount,
            sTAO.balanceOf(address(this)),
            minTaoUSDAmount,
            minSTAOAmount,
            msg.sender,
            block.timestamp
        );

        // Return the rest to the user. Safe to return everything because this contract should not hold any assets
        taoUSD.safeTransfer(msg.sender, taoUSD.balanceOf(address(this)));
        sTAO.safeTransfer(msg.sender, sTAO.balanceOf(address(this)));

        return liquidity;
    }
}
