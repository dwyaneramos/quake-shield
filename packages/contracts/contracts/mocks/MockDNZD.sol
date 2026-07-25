// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockDNZD
 * @notice Mock dNZD token for testing on testnet
 * @dev 6 decimals to match real dNZD
 */
contract MockDNZD is ERC20 {
    constructor() ERC20("NewMoney dNZD", "DNZD") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice Mint tokens (for testing only)
     * @param to Recipient address
     * @param amount Amount in DNZD (6 decimals)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
