const CONTRACTS_CONFIG = {
  "ManufacturerProductRegister": {
    "address": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    "abi": [
      {
        "type": "event",
        "anonymous": false,
        "name": "ProductRegistered",
        "inputs": [
          {
            "type": "uint256",
            "name": "id",
            "indexed": true
          },
          {
            "type": "string",
            "name": "name",
            "indexed": false
          },
          {
            "type": "string",
            "name": "manufacturer",
            "indexed": false
          },
          {
            "type": "uint256",
            "name": "timestamp",
            "indexed": false
          }
        ]
      },
      {
        "type": "function",
        "name": "productCount",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
          {
            "type": "uint256",
            "name": ""
          }
        ]
      },
      {
        "type": "function",
        "name": "products",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
          {
            "type": "uint256",
            "name": ""
          }
        ],
        "outputs": [
          {
            "type": "uint256",
            "name": "id"
          },
          {
            "type": "string",
            "name": "name"
          },
          {
            "type": "string",
            "name": "detail"
          },
          {
            "type": "string",
            "name": "manufacturerName"
          },
          {
            "type": "uint256",
            "name": "timestamp"
          },
          {
            "type": "address",
            "name": "currentOwner"
          }
        ]
      },
      {
        "type": "function",
        "name": "registerProduct",
        "constant": false,
        "payable": false,
        "inputs": [
          {
            "type": "string",
            "name": "_name"
          },
          {
            "type": "string",
            "name": "_detail"
          },
          {
            "type": "string",
            "name": "_manufacturerName"
          }
        ],
        "outputs": []
      }
    ]
  },
  "ManufacturerToRetailer": {
    "address": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    "abi": [
      {
        "type": "event",
        "anonymous": false,
        "name": "ShipmentCreated",
        "inputs": [
          {
            "type": "uint256",
            "name": "productId",
            "indexed": true
          },
          {
            "type": "address",
            "name": "from",
            "indexed": false
          },
          {
            "type": "address",
            "name": "to",
            "indexed": false
          },
          {
            "type": "uint256",
            "name": "timestamp",
            "indexed": false
          }
        ]
      },
      {
        "type": "event",
        "anonymous": false,
        "name": "ShipmentReceived",
        "inputs": [
          {
            "type": "uint256",
            "name": "productId",
            "indexed": true
          },
          {
            "type": "address",
            "name": "retailer",
            "indexed": false
          },
          {
            "type": "uint256",
            "name": "timestamp",
            "indexed": false
          }
        ]
      },
      {
        "type": "function",
        "name": "confirmReceipt",
        "constant": false,
        "payable": false,
        "inputs": [
          {
            "type": "uint256",
            "name": "_productId"
          }
        ],
        "outputs": []
      },
      {
        "type": "function",
        "name": "shipProduct",
        "constant": false,
        "payable": false,
        "inputs": [
          {
            "type": "uint256",
            "name": "_productId"
          },
          {
            "type": "address",
            "name": "_retailer"
          }
        ],
        "outputs": []
      },
      {
        "type": "function",
        "name": "shipments",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
          {
            "type": "uint256",
            "name": ""
          }
        ],
        "outputs": [
          {
            "type": "uint256",
            "name": "productId"
          },
          {
            "type": "address",
            "name": "manufacturer"
          },
          {
            "type": "address",
            "name": "retailer"
          },
          {
            "type": "string",
            "name": "status"
          },
          {
            "type": "uint256",
            "name": "timestamp"
          }
        ]
      }
    ]
  },
  "RetailerToConsumer": {
    "address": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    "abi": [
      {
        "type": "event",
        "anonymous": false,
        "name": "ProductSoldToConsumer",
        "inputs": [
          {
            "type": "uint256",
            "name": "productId",
            "indexed": true
          },
          {
            "type": "string",
            "name": "consumer",
            "indexed": false
          },
          {
            "type": "uint256",
            "name": "price",
            "indexed": false
          },
          {
            "type": "uint256",
            "name": "timestamp",
            "indexed": false
          }
        ]
      },
      {
        "type": "function",
        "name": "sales",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
          {
            "type": "uint256",
            "name": ""
          }
        ],
        "outputs": [
          {
            "type": "uint256",
            "name": "productId"
          },
          {
            "type": "address",
            "name": "retailer"
          },
          {
            "type": "string",
            "name": "consumerName"
          },
          {
            "type": "uint256",
            "name": "salePrice"
          },
          {
            "type": "uint256",
            "name": "timestamp"
          }
        ]
      },
      {
        "type": "function",
        "name": "sellProduct",
        "constant": false,
        "payable": false,
        "inputs": [
          {
            "type": "uint256",
            "name": "_productId"
          },
          {
            "type": "string",
            "name": "_consumerName"
          },
          {
            "type": "uint256",
            "name": "_price"
          }
        ],
        "outputs": []
      },
      {
        "type": "function",
        "name": "verifyPurchase",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
          {
            "type": "uint256",
            "name": "_productId"
          }
        ],
        "outputs": [
          {
            "type": "string",
            "name": "consumer"
          },
          {
            "type": "uint256",
            "name": "timestamp"
          }
        ]
      }
    ]
  }
};