// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SupplyChainTracker
 * @notice Single unified contract that handles the entire supply chain lifecycle.
 *         Every action (registration + each stage transition) requires a fee.
 *
 *  Stage flow:
 *   registerConsignment()         — Manufacturer registers, pays registrationFee
 *   logManufacturerToLogistics()  — Manufacturer hands off to Logistics, pays transferFee
 *   logLogisticsToRetailer()      — Logistics confirms delivery to Retailer, pays transferFee
 *   logRetailerToConsumer()       — Retailer sells to Consumer, pays transferFee
 */
contract SupplyChainTracker {

    // ── Enums & Structs ──────────────────────────────────────────────────────

    enum Stage { None, Registered, ManufacturerToLogistics, LogisticsToRetailer, RetailerToConsumer }

    struct Consignment {
        string  consignmentId;
        string  productType;
        string  productDetail;
        uint256 quantity;
        string  invoiceId;
        address manufacturer;
        address retailerAddress;
        uint256 registeredAt;
        Stage   currentStage;
    }

    struct TransferRecord {
        bytes32 transferHash;
        address from;
        address to;
        Stage   stage;
        uint256 timestamp;
        string  notes;
    }

    // ── State ────────────────────────────────────────────────────────────────

    address public owner;
    uint256 public registrationFee = 0.001 ether;   // Fee to register a consignment
    uint256 public transferFee     = 0.0005 ether;  // Fee per stage transition

    // consignmentId => Consignment metadata
    mapping(string => Consignment)               public consignments;
    // consignmentId => stage => TransferRecord
    mapping(string => mapping(uint8 => TransferRecord)) public records;
    // running count
    uint256 public consignmentCount;

    // ── Events ───────────────────────────────────────────────────────────────

    event ConsignmentRegistered(
        string  indexed consignmentId,
        string          productType,
        uint256         quantity,
        string          invoiceId,
        address         manufacturer,
        address         retailerAddress,
        uint256         timestamp
    );

    event TransferLogged(
        string  indexed consignmentId,
        uint8           stage,
        bytes32         transferHash,
        address         from,
        address         to,
        uint256         timestamp,
        string          notes
    );

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier consignmentExists(string memory _id) {
        require(consignments[_id].registeredAt != 0, "Consignment not found");
        _;
    }

    // ── Stage 0: Registration (Payable) ──────────────────────────────────────

    /**
     * @notice Register a new consignment. Requires registrationFee.
     * @param _consignmentId  Unique ID (e.g. "CSG-A100")
     * @param _productType    Category (e.g. "Electronics")
     * @param _productDetail  Description
     * @param _quantity       Number of units
     * @param _invoiceId      Pre-generated invoice ID (from frontend)
     * @param _retailerAddress  Destination retailer's address
     */
    function registerConsignment(
        string  memory _consignmentId,
        string  memory _productType,
        string  memory _productDetail,
        uint256        _quantity,
        string  memory _invoiceId,
        address        _retailerAddress
    ) external payable {
        require(msg.value >= registrationFee, "Insufficient registration fee");
        require(_quantity > 0, "Quantity must be > 0");
        require(consignments[_consignmentId].registeredAt == 0, "Consignment already registered");

        consignmentCount++;

        consignments[_consignmentId] = Consignment({
            consignmentId:    _consignmentId,
            productType:      _productType,
            productDetail:    _productDetail,
            quantity:         _quantity,
            invoiceId:        _invoiceId,
            manufacturer:     msg.sender,
            retailerAddress:  _retailerAddress,
            registeredAt:     block.timestamp,
            currentStage:     Stage.Registered
        });

        emit ConsignmentRegistered(
            _consignmentId, _productType, _quantity,
            _invoiceId, msg.sender, _retailerAddress, block.timestamp
        );
    }

    // ── Stage 1: Manufacturer → Logistics (Payable) ──────────────────────────

    /**
     * @notice Log hand-off from Manufacturer to Logistics provider.
     *         Generates a keccak256 hash for this transition.
     */
    function logManufacturerToLogistics(
        string  memory _consignmentId,
        address        _retailerAddress,
        string  memory _notes
    ) external payable consignmentExists(_consignmentId) returns (bytes32 hash) {
        require(msg.value >= transferFee, "Insufficient transfer fee");

        hash = keccak256(abi.encodePacked(
            _consignmentId, msg.sender, _retailerAddress,
            block.timestamp, uint8(Stage.ManufacturerToLogistics)
        ));

        records[_consignmentId][uint8(Stage.ManufacturerToLogistics)] = TransferRecord({
            transferHash: hash,
            from:         msg.sender,
            to:           _retailerAddress,
            stage:        Stage.ManufacturerToLogistics,
            timestamp:    block.timestamp,
            notes:        _notes
        });

        consignments[_consignmentId].currentStage = Stage.ManufacturerToLogistics;

        emit TransferLogged(
            _consignmentId, uint8(Stage.ManufacturerToLogistics),
            hash, msg.sender, _retailerAddress, block.timestamp, _notes
        );
    }

    // ── Stage 2: Logistics → Retailer (Payable) ──────────────────────────────

    /**
     * @notice Log delivery from Logistics to Retailer.
     */
    function logLogisticsToRetailer(
        string  memory _consignmentId,
        address        _retailerAddress,
        string  memory _notes
    ) external payable consignmentExists(_consignmentId) returns (bytes32 hash) {
        require(msg.value >= transferFee, "Insufficient transfer fee");

        hash = keccak256(abi.encodePacked(
            _consignmentId, msg.sender, _retailerAddress,
            block.timestamp, uint8(Stage.LogisticsToRetailer)
        ));

        records[_consignmentId][uint8(Stage.LogisticsToRetailer)] = TransferRecord({
            transferHash: hash,
            from:         msg.sender,
            to:           _retailerAddress,
            stage:        Stage.LogisticsToRetailer,
            timestamp:    block.timestamp,
            notes:        _notes
        });

        consignments[_consignmentId].currentStage = Stage.LogisticsToRetailer;

        emit TransferLogged(
            _consignmentId, uint8(Stage.LogisticsToRetailer),
            hash, msg.sender, _retailerAddress, block.timestamp, _notes
        );
    }

    // ── Stage 3: Retailer → Consumer (Payable) ───────────────────────────────

    /**
     * @notice Log final sale from Retailer to Consumer.
     *         Consumer is identified by name (not an ETH address).
     */
    function logRetailerToConsumer(
        string memory _consignmentId,
        string memory _consumerName,
        string memory _notes
    ) external payable consignmentExists(_consignmentId) returns (bytes32 hash) {
        require(msg.value >= transferFee, "Insufficient transfer fee");

        hash = keccak256(abi.encodePacked(
            _consignmentId, msg.sender, _consumerName,
            block.timestamp, uint8(Stage.RetailerToConsumer)
        ));

        records[_consignmentId][uint8(Stage.RetailerToConsumer)] = TransferRecord({
            transferHash: hash,
            from:         msg.sender,
            to:           address(0),
            stage:        Stage.RetailerToConsumer,
            timestamp:    block.timestamp,
            notes:        _notes
        });

        consignments[_consignmentId].currentStage = Stage.RetailerToConsumer;

        emit TransferLogged(
            _consignmentId, uint8(Stage.RetailerToConsumer),
            hash, msg.sender, address(0), block.timestamp, _notes
        );
    }

    // ── View Functions ───────────────────────────────────────────────────────

    function getConsignment(string memory _id)
        external view
        returns (
            string  memory productType,
            uint256        quantity,
            string  memory invoiceId,
            address        manufacturer,
            address        retailerAddress,
            uint256        registeredAt,
            uint8          currentStage
        )
    {
        Consignment storage c = consignments[_id];
        return (c.productType, c.quantity, c.invoiceId,
                c.manufacturer, c.retailerAddress, c.registeredAt, uint8(c.currentStage));
    }

    function getRecord(string memory _consignmentId, uint8 _stage)
        external view
        returns (
            bytes32 transferHash,
            address from,
            address to,
            uint256 timestamp,
            string  memory notes
        )
    {
        TransferRecord storage r = records[_consignmentId][_stage];
        return (r.transferHash, r.from, r.to, r.timestamp, r.notes);
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    function setFees(uint256 _registrationFee, uint256 _transferFee) external onlyOwner {
        registrationFee = _registrationFee;
        transferFee     = _transferFee;
    }

    function withdrawFees() external onlyOwner {
        (bool success, ) = payable(owner).call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }
}
