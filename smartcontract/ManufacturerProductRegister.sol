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

    event ProductRegistered(uint256 indexed id, string name, string manufacturer, uint256 timestamp);

    function registerProduct(string memory _name, string memory _detail, string memory _manufacturerName) public {
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
}
