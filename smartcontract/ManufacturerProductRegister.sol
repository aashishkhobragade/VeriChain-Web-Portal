// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ManufacturerProductRegister {
    
    struct Product {
        uint256 id;
        string name;
        string detail;
        string manufacturerName;
        uint256 timestamp;
        address currentOwner;
    }

    mapping(uint256 => Product) public products;
    uint256 public productCount;

    // --- NEW: Fee System ---
    address public owner;
    uint256 public registrationFee = 0.001 ether;

    event ProductRegistered(uint256 indexed id, string name, string manufacturer, uint256 timestamp);

    // Set the deployer as the owner to collect fees
    constructor() {
        owner = msg.sender;
    }

    // --- MODIFIED: Added payable and fee requirement ---
    function registerProduct(string memory _name, string memory _detail, string memory _manufacturerName) public payable {
        require(msg.value >= registrationFee, "Insufficient fee provided");
        productCount++;
        products[productCount] = Product(
            productCount,
            _name,
            _detail,
            _manufacturerName,
            block.timestamp,
            msg.sender
        );

        emit ProductRegistered(productCount, _name, _manufacturerName, block.timestamp);
    }

    // --- NEW: Withdraw function for owner to collect fees ---
    function withdrawFees() public {
        require(msg.sender == owner, "Only owner can withdraw");
        payable(owner).transfer(address(this).balance);
    }
}
