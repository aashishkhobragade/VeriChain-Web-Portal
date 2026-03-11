// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ManufacturerToRetailer {
    
    struct Shipment {
        uint256 productId;
        address manufacturer;
        address retailer;
        string status; // e.g., "Shipped", "In Transit", "Received"
        uint256 timestamp;
    }

    mapping(uint256 => Shipment) public shipments;
    
    event ShipmentCreated(uint256 indexed productId, address from, address to, uint256 timestamp);
    event ShipmentReceived(uint256 indexed productId, address retailer, uint256 timestamp);

    function shipProduct(uint256 _productId, address _retailer) public {
        // In a real system, verify msg.sender is the current owner
        shipments[_productId] = Shipment(
            _productId,
            msg.sender,
            _retailer,
            "Shipped",
            block.timestamp
        );

        emit ShipmentCreated(_productId, msg.sender, _retailer, block.timestamp);
    }

    function confirmReceipt(uint256 _productId) public {
        Shipment storage shipment = shipments[_productId];
        require(msg.sender == shipment.retailer, "Only designated retailer can confirm receipt");
        
        shipment.status = "Received";
        emit ShipmentReceived(_productId, msg.sender, block.timestamp);
    }
}
