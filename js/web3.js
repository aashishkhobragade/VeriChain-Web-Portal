// Web3 Service Layer using ethers.js v6

let provider = null;
let signer = null;
let contract = null;   // SupplyChainTracker (single unified contract)
let userAddress = null;

// ── SupplyChainTracker — Unified Contract ────────────────────────────────────
// Replace with your deployed address after: npx hardhat run scripts/deploy.js --network <net>
const CONTRACT_ADDRESS = "0x56278645f2Db0fB87AB1A1bcd5A7BA9880576F1D";

const CONTRACT_ABI = [
    // ── Events ──────────────────────────────────────────────────────────────
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "string", "name": "consignmentId", "type": "string" },
            { "indexed": false, "internalType": "string", "name": "productType", "type": "string" },
            { "indexed": false, "internalType": "uint256", "name": "quantity", "type": "uint256" },
            { "indexed": false, "internalType": "string", "name": "invoiceId", "type": "string" },
            { "indexed": false, "internalType": "address", "name": "manufacturer", "type": "address" },
            { "indexed": false, "internalType": "address", "name": "retailerAddress", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "ConsignmentRegistered",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "internalType": "string", "name": "consignmentId", "type": "string" },
            { "indexed": false, "internalType": "uint8", "name": "stage", "type": "uint8" },
            { "indexed": false, "internalType": "bytes32", "name": "transferHash", "type": "bytes32" },
            { "indexed": false, "internalType": "address", "name": "from", "type": "address" },
            { "indexed": false, "internalType": "address", "name": "to", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" },
            { "indexed": false, "internalType": "string", "name": "notes", "type": "string" }
        ],
        "name": "TransferLogged",
        "type": "event"
    },

    // ── Constructor ──────────────────────────────────────────────────────────
    { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },

    // ── Stage 0: registerConsignment (payable) ───────────────────────────────
    {
        "inputs": [
            { "internalType": "string", "name": "_consignmentId", "type": "string" },
            { "internalType": "string", "name": "_productType", "type": "string" },
            { "internalType": "string", "name": "_productDetail", "type": "string" },
            { "internalType": "uint256", "name": "_quantity", "type": "uint256" },
            { "internalType": "string", "name": "_invoiceId", "type": "string" },
            { "internalType": "address", "name": "_retailerAddress", "type": "address" }
        ],
        "name": "registerConsignment",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },

    // ── Stage 1: logManufacturerToLogistics (payable) ────────────────────────
    {
        "inputs": [
            { "internalType": "string", "name": "_consignmentId", "type": "string" },
            { "internalType": "address", "name": "_retailerAddress", "type": "address" },
            { "internalType": "string", "name": "_notes", "type": "string" }
        ],
        "name": "logManufacturerToLogistics",
        "outputs": [{ "internalType": "bytes32", "name": "hash", "type": "bytes32" }],
        "stateMutability": "payable",
        "type": "function"
    },

    // ── Stage 2: logLogisticsToRetailer (payable) ────────────────────────────
    {
        "inputs": [
            { "internalType": "string", "name": "_consignmentId", "type": "string" },
            { "internalType": "address", "name": "_retailerAddress", "type": "address" },
            { "internalType": "string", "name": "_notes", "type": "string" }
        ],
        "name": "logLogisticsToRetailer",
        "outputs": [{ "internalType": "bytes32", "name": "hash", "type": "bytes32" }],
        "stateMutability": "payable",
        "type": "function"
    },

    // ── Stage 3: logRetailerToConsumer (payable) ─────────────────────────────
    {
        "inputs": [
            { "internalType": "string", "name": "_consignmentId", "type": "string" },
            { "internalType": "string", "name": "_consumerName", "type": "string" },
            { "internalType": "string", "name": "_notes", "type": "string" }
        ],
        "name": "logRetailerToConsumer",
        "outputs": [{ "internalType": "bytes32", "name": "hash", "type": "bytes32" }],
        "stateMutability": "payable",
        "type": "function"
    },

    // ── View Functions ───────────────────────────────────────────────────────
    {
        "inputs": [{ "internalType": "string", "name": "_id", "type": "string" }],
        "name": "getConsignment",
        "outputs": [
            { "internalType": "string", "name": "productType", "type": "string" },
            { "internalType": "uint256", "name": "quantity", "type": "uint256" },
            { "internalType": "string", "name": "invoiceId", "type": "string" },
            { "internalType": "address", "name": "manufacturer", "type": "address" },
            { "internalType": "address", "name": "retailerAddress", "type": "address" },
            { "internalType": "uint256", "name": "registeredAt", "type": "uint256" },
            { "internalType": "uint8", "name": "currentStage", "type": "uint8" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "string", "name": "_consignmentId", "type": "string" },
            { "internalType": "uint8", "name": "_stage", "type": "uint8" }
        ],
        "name": "getRecord",
        "outputs": [
            { "internalType": "bytes32", "name": "transferHash", "type": "bytes32" },
            { "internalType": "address", "name": "from", "type": "address" },
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
            { "internalType": "string", "name": "notes", "type": "string" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "registrationFee",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "transferFee",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "consignmentCount",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },

    // ── Admin ────────────────────────────────────────────────────────────────
    {
        "inputs": [
            { "internalType": "uint256", "name": "_registrationFee", "type": "uint256" },
            { "internalType": "uint256", "name": "_transferFee", "type": "uint256" }
        ],
        "name": "setFees",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "withdrawFees",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// ── ETH → INR Rate ───────────────────────────────────────────────────────────
const ETH_INR_FALLBACK = 250000;
const REGISTRATION_FEE_ETH = 0.001;
const TRANSFER_FEE_ETH = 0.0005;
window.ethInrRate = ETH_INR_FALLBACK;

async function fetchEthInrRate() {
    try {
        const resp = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr',
            { signal: AbortSignal.timeout(5000) }
        );
        if (!resp.ok) throw new Error('Rate fetch failed');
        const json = await resp.json();
        if (json.ethereum && json.ethereum.inr) {
            window.ethInrRate = json.ethereum.inr;
        }
    } catch (_) { /* use fallback */ }
    updateFeeLabels();
    return window.ethInrRate;
}

function getFeeInr() { return Math.round(window.ethInrRate * REGISTRATION_FEE_ETH).toLocaleString('en-IN'); }
function getTransferFeeInr() { return Math.round(window.ethInrRate * TRANSFER_FEE_ETH).toLocaleString('en-IN'); }

function updateFeeLabels() {
    const regFeeStr = `₹${getFeeInr()} Transaction Security Fee`;
    const btnText = document.querySelector('#registerProductForm .button-text');
    if (btnText) btnText.textContent = `Register Consignment (${regFeeStr})`;

    const invFeeEl = document.getElementById('inv-blockchain-fee');
    if (invFeeEl) invFeeEl.textContent = regFeeStr;
}

// ── Web3 Service ─────────────────────────────────────────────────────────────
const Web3Service = {
    isConnected: false,

    async connectWallet() {
        if (!window.ethereum) {
            showToast("MetaMask not found. Please install a wallet extension.", true);
            return false;
        }
        try {
            showToast("Requesting wallet access...", false);
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

    // ── Stage 0: Register Consignment (payable 0.001 ETH) ─────────────────────
    async registerProduct(consignmentId, productType, detail, _ignoredManufacturer, quantity, invoiceId, retailerAddress) {
        const feeStr = `₹${getFeeInr()} Transaction Security Fee`;
        const ethFee = ethers.parseEther("0.001");

        if (!this.isConnected || !contract) {
            this.showTxModal("Registering Consignment", `Demo mode — ${feeStr}`);
            await new Promise(r => setTimeout(r, 1400));
            this.updateTxModal("Signing virtual transaction...");
            await new Promise(r => setTimeout(r, 1200));
            this.updateTxModal("Broadcasting to VeriChain Node...");
            await new Promise(r => setTimeout(r, 800));
            this.hideTxModal();
            return `TX-DEMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        }

        try {
            // Retailer address: use zero address if not a valid ETH address
            let retailerAddr = ethers.ZeroAddress;
            if (retailerAddress && retailerAddress.startsWith('0x') && retailerAddress.length === 42) {
                retailerAddr = retailerAddress;
            }

            this.showTxModal("Registering Consignment", `Please confirm — ${feeStr} (0.001 ETH)...`);
            const tx = await contract.registerConsignment(
                consignmentId, productType, detail, quantity, invoiceId, retailerAddr,
                { value: ethFee }
            );
            this.updateTxModal("Broadcasting to Ethereum Network...");
            await tx.wait();
            this.updateTxModal("Consignment Registered on Blockchain!");
            setTimeout(() => this.hideTxModal(), 1000);
            return tx.hash;
        } catch (error) {
            console.error("Web3 Error:", error);
            this.hideTxModal();
            showToast(`Transaction Failed: ${error.reason || "User rejected"}`, true);
            return null;
        }
    },

    // ── Stages 1-3: Transfer (payable 0.0005 ETH each) ────────────────────────
    async logTransfer(consignmentId, retailerAddressOrConsumer, stage, notes = "") {
        const transferFeeStr = `₹${getTransferFeeInr()} Transfer Security Fee`;
        const ethFee = ethers.parseEther("0.0005");
        const demoHash = () => `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;

        if (!this.isConnected || !contract) {
            this.showTxModal("Logging Transfer", `Demo mode — ${stage}...`);
            await new Promise(r => setTimeout(r, 1200));
            this.updateTxModal("Generating cryptographic hash...");
            await new Promise(r => setTimeout(r, 800));
            this.hideTxModal();
            return demoHash();
        }

        try {
            let tx;
            this.showTxModal("Logging Transfer", `Confirm — ${transferFeeStr} (0.0005 ETH) for ${stage}...`);

            // Resolve retailer address (use zero address as fallback for non-ETH strings)
            let retailerAddr = ethers.ZeroAddress;
            if (retailerAddressOrConsumer && retailerAddressOrConsumer.startsWith('0x')
                && retailerAddressOrConsumer.length === 42) {
                retailerAddr = retailerAddressOrConsumer;
            }

            if (stage === "manufacturer-to-logistics") {
                tx = await contract.logManufacturerToLogistics(
                    consignmentId, retailerAddr, notes, { value: ethFee }
                );
            } else if (stage === "logistics-to-retailer") {
                tx = await contract.logLogisticsToRetailer(
                    consignmentId, retailerAddr, notes, { value: ethFee }
                );
            } else if (stage === "retailer-to-consumer") {
                tx = await contract.logRetailerToConsumer(
                    consignmentId, retailerAddressOrConsumer, notes, { value: ethFee }
                );
            } else {
                this.hideTxModal();
                return demoHash();
            }

            this.updateTxModal("Mining transaction block...");
            await tx.wait();
            this.updateTxModal("Hash Verified on Blockchain!");
            setTimeout(() => this.hideTxModal(), 1000);
            return tx.hash;
        } catch (error) {
            console.error("Transfer Web3 Error:", error);
            this.hideTxModal();
            showToast(`Transfer Failed: ${error.reason || "User rejected"}`, true);
            return demoHash();
        }
    },

    // ── Modal Helpers ─────────────────────────────────────────────────────────
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

window.Web3Service = Web3Service;
window.fetchEthInrRate = fetchEthInrRate;
window.getFeeInr = getFeeInr;
window.getTransferFeeInr = getTransferFeeInr;
window.updateFeeLabels = updateFeeLabels;

// Fetch live INR rate as soon as the script loads
fetchEthInrRate();
