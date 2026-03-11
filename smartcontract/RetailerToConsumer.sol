// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RetailerToConsumer {

    struct Sale {
        uint256 productId;
        address retailer;
        string consumerName;
        uint256 salePrice;
        uint256 timestamp;
    }

    mapping(uint256 => Sale) public sales;
    
    event ProductSoldToConsumer(uint256 indexed productId, string consumer, uint256 price, uint256 timestamp);

    function sellProduct(uint256 _productId, string memory _consumerName, uint256 _price) public {
        // In a real system, verify msg.sender is the current retailer/owner
        sales[_productId] = Sale(
            _productId,
            msg.sender,
            _consumerName,
            _price,
            block.timestamp
        );

        emit ProductSoldToConsumer(_productId, _consumerName, _price, block.timestamp);
    }
    
    function verifyPurchase(uint256 _productId) public view returns (string memory consumer, uint256 timestamp) {
        Sale memory sale = sales[_productId];
        return (sale.consumerName, sale.timestamp);
    }
}
