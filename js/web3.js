// Web3 Service Layer using ethers.js v6

let provider = null;
let signer = null;
let contract = null;
let userAddress = null;

// Replace with your deployed contract address
const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // Placeholder

const Web3Service = {
    isConnected: false,

    async connectWallet() {
        if (!window.ethereum) {
            showToast("MetaMask not found. Please install a wallet extension.", true);
            console.log("MetaMask not found. Falling back to dummy data mode.");
            return false;
        }

        try {
            provider = new ethers.BrowserProvider(window.ethereum);
            signer = await provider.getSigner();
            userAddress = await signer.getAddress();

            // Initialize contract if valid address provided (skip for now if placeholder)
            if (CONTRACT_ADDRESS && CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000") {
                contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            }

            this.isConnected = true;
            this.updateUI(userAddress);
            showToast("Wallet connected successfully!");
            return true;

        } catch (error) {
            console.error("Connection Error:", error);
            showToast("Failed to connect wallet.", true);
            return false;
        }
    },

    updateUI(address) {
        const addrDisplay = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        const walletBadge = document.getElementById('wallet-badge');

        if (walletBadge) {
            walletBadge.innerHTML = `
                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                <span class="text-xs text-slate-300 font-mono">${addrDisplay}</span>
            `;
            walletBadge.onclick = null; // Remove connect handler if already connected
            walletBadge.classList.replace('cursor-pointer', 'cursor-default');
        }
    },

    async registerProduct(name, origin) {
        if (!this.isConnected || !contract) {
            console.log("Web3 not connected or contract addr missing. Simulating only.");
            return null; // Return null to indicate fallback to dummy/supabase
        }

        try {
            console.log(`Sending transaction: registerProduct(${name}, ${origin})`);
            const tx = await contract.registerProduct(name, origin);
            showToast("Transaction sent! Waiting for confirmation...");
            await tx.wait();
            showToast("Transaction confirmed on blockchain!");
            return tx.hash;
        } catch (error) {
            console.error("Web3 Error:", error);
            showToast(`Blockchain Error: ${error.reason || error.message}`, true);
            return null;
        }
    },

    async transferProduct(productId, toAddress, stage) {
        if (!this.isConnected || !contract) return null;

        try {
            // Need to parse productId to uint256 if your contract uses uint256
            // Assumes productId is numeric or parseable
            // For now, if productId is string like 'PROD-102', this might fail on contract side if it expects uint
            // The provided FoodTraceability contract expects uint256 _id. 
            // We'll assume the real world usage would map this mapped ID. 
            // For this demo, we'll just log if it's not a number.

            const numericId = parseInt(productId.match(/\d+/)?.[0]);
            if (!numericId) {
                console.warn("Could not extract numeric ID for contract from:", productId);
                return null;
            }

            console.log(`Sending tx: transferProduct(${numericId}, ${toAddress}, ${stage})`);
            const tx = await contract.transferProduct(numericId, toAddress, stage);
            showToast("Transaction sent! Waiting...");
            await tx.wait();
            return tx.hash;
        } catch (error) {
            console.error("Web3 Error:", error);
            showToast(`Blockchain Error: ${error.reason || error.message}`, true);
            return null;
        }
    }
};

// Expose to window for app.js
window.Web3Service = Web3Service;
