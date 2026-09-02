// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * The mainnet stand-in occupying the VAVA slot until the real token is
 * minted on Pons. Mint is OWNER-ONLY: with an open mint (MockVava)
 * anyone could stake free tokens to fake Baron discounts or a
 * presidency, and a single staked unit in the vault would block
 * updateMint - a free griefing lever over the whole token launch.
 */
contract StandInVava {
    string public constant name = "VAVA (stand-in)";
    string public constant symbol = "sVAVA";
    uint8 public constant decimals = 6;
    uint256 public totalSupply;
    address public immutable owner;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor() {
        owner = msg.sender;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == owner, "owner only");
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}
