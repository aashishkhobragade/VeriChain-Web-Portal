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
    
    address public owner;
    uint256 public sellingFee = 0.001 ether;

    event ProductSoldToConsumer(uint256 indexed productId, string consumer, uint256 price, uint256 timestamp);

    constructor() {
        owner = msg.sender;
    }

    function setSellingFee(uint256 _fee) public {
        require(msg.sender == owner, "Only owner can change fee");
        sellingFee = _fee;
    }

    function sellProduct(uint256 _productId, string memory _consumerName, uint256 _price) public payable {
        require(msg.value == sellingFee, "Insufficient selling fee");
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

    function withdrawFees() public {
        require(msg.sender == owner, "Only owner can withdraw");
        payable(owner).transfer(address(this).balance);
    }
}
