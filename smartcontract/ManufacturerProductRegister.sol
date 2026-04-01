// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ManufacturerProductRegister {

    struct Product {
        uint256 id;          // Auto-incremented sequential ID
        string productId;    // String product ID (e.g., "PROD-A100")
        string productType;  // Product category/type
        string detail;       // Product description
        string manufacturerName;
        uint256 quantity;    // Number of units
        string invoiceId;    // Generated invoice ID
        uint256 timestamp;
        address currentOwner;
    }

    mapping(uint256 => Product) public products;
    uint256 public productCount;

    // --- Fee System ---
    address public owner;
    uint256 public registrationFee = 0.001 ether;

    event ProductRegistered(
        uint256 indexed id,
        string productId,
        string productType,
        string manufacturerName,
        uint256 quantity,
        string invoiceId,
        uint256 timestamp
    );

    constructor() {
        owner = msg.sender;
    }

    function registerProduct(
        string memory _productId,
        string memory _productType,
        string memory _detail,
        string memory _manufacturerName,
        uint256 _quantity,
        string memory _invoiceId
    ) public payable {
        require(msg.value >= registrationFee, "Insufficient fee provided");
        require(_quantity > 0, "Quantity must be greater than zero");

        productCount++;
        products[productCount] = Product(
            productCount,
            _productId,
            _productType,
            _detail,
            _manufacturerName,
            _quantity,
            _invoiceId,
            block.timestamp,
            msg.sender
        );

        emit ProductRegistered(
            productCount,
            _productId,
            _productType,
            _manufacturerName,
            _quantity,
            _invoiceId,
            block.timestamp
        );
    }

    function withdrawFees() public {
        require(msg.sender == owner, "Only owner can withdraw");
        (bool success, ) = payable(owner).call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }
}
