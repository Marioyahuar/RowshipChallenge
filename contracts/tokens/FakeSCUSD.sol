// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FakeSCUSD is ERC20 {
    constructor() ERC20("Fake Shadow USD", "fscUSD") {
        _mint(msg.sender, 1000000 * 10**18); // 1M tokens, 18 decimales
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount); // Para testing
    }
}