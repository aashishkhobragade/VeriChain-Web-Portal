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

    address public owner;
    uint256 public registrationFee = 0.001 ether;

    event ProductRegistered(uint256 indexed id, string name, string manufacturer, uint256 timestamp);

    constructor() {
        owner = msg.sender;
    }

    function setRegistrationFee(uint256 _fee) public {
        require(msg.sender == owner, "Only owner can change fee");
        registrationFee = _fee;
    }

    function registerProduct(string memory _name, string memory _detail, string memory _manufacturerName) public payable {
        require(msg.value == registrationFee, "Insufficient registration fee");

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

    function withdrawFees() public {
        require(msg.sender == owner, "Only owner can withdraw");
        payable(owner).transfer(address(this).balance);
    }
}
