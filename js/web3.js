// Web3 Service Layer using ethers.js v6

let provider = null;
let signer = null;
let contract = null;
let userAddress = null;

// Replace with your deployed contract address
const CONTRACT_ADDRESS = "0x4ca64a3A6e6DCB47017186be94c913e2b7c8Aa4C"; // Placeholder
const CONTRACT_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "manufacturer",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "name": "ProductRegistered",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_name",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_detail",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_manufacturerName",
                "type": "string"
            }
        ],
        "name": "registerProduct",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "withdrawFees",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [
            {
                "internalType": "address payable",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "productCount",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "products",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "detail",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "manufacturerName",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "currentOwner",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "registrationFee",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];


const Web3Service = {
    isConnected: false,

    async connectWallet() {
        if (!window.ethereum) {
            showToast("MetaMask not found. Please install a wallet extension.", true);
            return false;
        }

        try {
            showToast("Requesting wallet access...", false);
            // Simulate a short delay for "Connecting" feel
            await new Promise(r => setTimeout(r, 800));

            provider = new ethers.BrowserProvider(window.ethereum);
            signer = await provider.getSigner();
            userAddress = await signer.getAddress();

            if (CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000") {
                contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            }

            this.isConnected = true;
            this.updateUI(userAddress);
            showToast("Secure connection established with VeriChain Wallet.");
            return true;

        } catch (error) {
            console.error("Connection Error:", error);
            showToast("Connection rejected by user.", true);
            return false;
        }
    },

    updateUI(address) {
        const addrDisplay = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        const walletBadge = document.getElementById('wallet-badge');

        if (walletBadge) {
            walletBadge.innerHTML = `
                <div class="relative">
                    <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div class="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
                </div>
                <span class="text-xs text-slate-300 font-mono">${addrDisplay}</span>
            `;
            walletBadge.onclick = null;
            walletBadge.classList.replace('cursor-pointer', 'cursor-default');
            walletBadge.classList.add('border-green-500/30', 'bg-green-900/20');
        }
    },

    async registerProduct(name, detail, manufacturer) {
        if (!this.isConnected || !contract) {
            // Fallback for demo when not connected, still show modal for effect
            this.showTxModal("Registering Product", "Initiating secure handshake...");
            await new Promise(r => setTimeout(r, 1500));
            this.updateTxModal("Signing virtual transaction...");
            await new Promise(r => setTimeout(r, 1500));
            this.updateTxModal("Broadcasting to VeriChain Node...");
            await new Promise(r => setTimeout(r, 1000));
            this.hideTxModal();
            return `TX-DEMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        }

        try {
            this.showTxModal("Registering Product", "Please confirm transaction (includes 0.001 ETH fee)...");

            // Generate the fee using Ethers v6 utility
            const registrationFee = ethers.parseEther("0.001");

            // CRITICAL FIX: The Solidity contract requires 3 arguments: _name, _detail, _manufacturerName
            // We now also pass an override object `{ value: registrationFee }` because the function is `payable`
            const tx = await contract.registerProduct(name, detail, manufacturer, { value: registrationFee });

            this.updateTxModal("Broadcasting to Ethereum Network...");
            await tx.wait();

            this.updateTxModal("Transaction Confirmed!");
            setTimeout(() => this.hideTxModal(), 1000);
            return tx.hash;
        } catch (error) {
            console.error("Web3 Error:", error);
            this.hideTxModal();
            showToast(`Transaction Failed: ${error.reason || "User rejected"}`, true);
            return null;
        }
    },

    async transferProduct(productId, toAddress, stage) {
        if (!this.isConnected || !contract) {
            // Demo Fallback
            this.showTxModal("Updating Status", "Syncing with supply chain ledger...");
            await new Promise(r => setTimeout(r, 1500));
            this.updateTxModal("Encrypting update metadata...");
            await new Promise(r => setTimeout(r, 1200));
            this.hideTxModal();
            return `TX-DEMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        }

        try {
            // Numeric ID extraction logic
            const numericId = parseInt(productId.match(/\d+/)?.[0]);
            if (!numericId) {
                console.warn("Invalid ID for contract");
                return null;
            }

            this.showTxModal("Updating Status", "Awaiting wallet signature...");
            const tx = await contract.transferProduct(numericId, toAddress, stage);

            this.updateTxModal("Mining transaction block...");
            await tx.wait();

            this.updateTxModal("Update Verified on Blockchain!");
            setTimeout(() => this.hideTxModal(), 1000);
            return tx.hash;

        } catch (error) {
            console.error("Web3 Error:", error);
            this.hideTxModal();
            showToast(`Update Failed: ${error.reason || "User rejected"}`, true);
            return null;
        }
    },

    // Modal Helpers
    showTxModal(title, status) {
        const modal = document.getElementById('txModal');
        const titleEl = document.getElementById('txModalTitle');
        const statusEl = document.getElementById('txModalStatus');

        if (modal && titleEl && statusEl) {
            titleEl.textContent = title;
            statusEl.textContent = status;
            modal.classList.remove('hidden');
            modal.classList.add('flex', 'fade-in');
        }
    },

    updateTxModal(status) {
        const statusEl = document.getElementById('txModalStatus');
        if (statusEl) statusEl.textContent = status;
    },

    hideTxModal() {
        const modal = document.getElementById('txModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex', 'fade-in');
        }
    }
};

// Expose to window for app.js
window.Web3Service = Web3Service;

