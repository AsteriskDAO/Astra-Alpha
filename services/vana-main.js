const ethers = require('ethers');
const { serverSideEncrypt } = require('./utils/crypto.js');

// Contract configuration
const CONFIG = {
    provider: new ethers.JsonRpcProvider("https://rpc.moksha.vana.org"),
    contracts: {
        dlp: {
            address: "0xE317bF090911AF03fEa09c1707Ec370EdFf8C0A8",
            abi: require("./public/contracts/DataLiquidityPoolLightImplementation.json").abi
        },
        registry: {
            address: "0xEA882bb75C54DE9A08bC46b46c396727B4BFe9a5",
            abi: require("./public/contracts/DataRegistryImplementation.json").abi
        },
        teePool: {
            address: "0xF084Ca24B4E29Aa843898e0B12c465fAFD089965",
            abi: require("./public/contracts/TeePoolImplementation.json").abi
        }
    }
};

/**
 * Handles file upload to Vana network
 * @param {File} file - File to upload
 * @param {string} privateKey - User's private key
 * @returns {Promise<{uploadedFileId: number, message: string}>}
 */
async function uploadFile(file, privateKey) {
    try {
        // Setup wallet and contracts
        const wallet = new ethers.Wallet(privateKey, CONFIG.provider);
        const contracts = {
            dlp: new ethers.Contract(CONFIG.contracts.dlp.address, CONFIG.contracts.dlp.abi, wallet),
            registry: new ethers.Contract(CONFIG.contracts.registry.address, CONFIG.contracts.registry.abi, wallet),
            teePool: new ethers.Contract(CONFIG.contracts.teePool.address, CONFIG.contracts.teePool.abi, wallet)
        };

        // Encrypt file
        const signature = await wallet.signMessage("Please sign to retrieve your encryption key");
        const encryptedData = await serverSideEncrypt(file, signature);
        
        // Get DLP public key and encrypt the signature
        const publicKey = await contracts.dlp.masterKey();
        const encryptedKey = await encryptWithWalletPublicKey(signature, publicKey);

        // Add file to registry
        const tx = await contracts.registry.addFileWithPermissions(
            encryptedData, 
            wallet.address, 
            [{ account: CONFIG.contracts.dlp.address, key: encryptedKey }]
        );
        const receipt = await tx.wait();
        
        // Get file ID from receipt
        const uploadedFileId = receipt.logs?.[0]?.args?.[0]?.toNumber();
        if (!uploadedFileId) throw new Error("Failed to retrieve file ID");

        // Request contribution proof
        const teeFee = await contracts.teePool.teeFee();
        await contracts.teePool.requestContributionProof(uploadedFileId, { value: teeFee })
            .then(tx => tx.wait());

        // Request reward
        await contracts.dlp.requestReward(uploadedFileId, 1)
            .then(tx => tx.wait());

        return {
            uploadedFileId,
            message: "File uploaded & reward requested successfully"
        };

    } catch (error) {
        console.error("Upload error:", error);
        throw new Error(`Upload failed: ${error.message}`);
    }
}

module.exports = { uploadFile };