const { ethers } = require('ethers');
const crypto = require('crypto');
require('dotenv').config();

class VanaService {
    constructor() {
        // Initialize connection to Moksha network
        this.provider = new ethers.providers.JsonRpcProvider('https://rpc.moksha.vana.xyz');
        this.wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, this.provider);

        // Contract addresses on Moksha
        this.DATA_REGISTRY_ADDRESS = '0x8C8788f98385F6ba1adD4234e551ABba0f82Cb7C';
        this.TEE_POOL_ADDRESS = '0x3c92fD91639b41f13338CE62f19131e7d19eaa0D';
        this.ROOT_NETWORK_ADDRESS = '0xff14346dF2B8Fd0c95BF34f1c92e49417b508AD5';
    }

    /**
     * Step 1: Deploy DLP and Token contracts
     * This only needs to be done once when setting up your Vana integration
     */
    async deployDLPAndToken() {
        try {
            // Deploy Token contract first
            const TokenFactory = await ethers.getContractFactory('DAT', this.wallet);
            const token = await TokenFactory.deploy(
                process.env.DLP_TOKEN_NAME,
                process.env.DLP_TOKEN_SYMBOL,
                process.env.OWNER_ADDRESS
            );
            await token.deployed();
            console.log('Token deployed to:', token.address);

            // Deploy DLP contract
            const DLPFactory = await ethers.getContractFactory('DataLiquidityPool', this.wallet);
            const dlp = await DLPFactory.deploy();
            await dlp.deployed();
            console.log('DLP deployed to:', dlp.address);

            // Initialize DLP with necessary parameters
            await dlp.initialize({
                trustedForwarder: process.env.TRUSTED_FORWARDER_ADDRESS,
                ownerAddress: process.env.OWNER_ADDRESS,
                tokenAddress: token.address,
                dataRegistryAddress: this.DATA_REGISTRY_ADDRESS,
                teePoolAddress: this.TEE_POOL_ADDRESS,
                name: process.env.DLP_NAME,
                publicKey: process.env.DLP_PUBLIC_KEY,
                proofInstruction: process.env.DLP_PROOF_INSTRUCTION,
                fileRewardFactor: process.env.DLP_FILE_REWARD_FACTOR
            });

            // Register DLP with RootNetwork (required to participate in rewards)
            const rootNetwork = new ethers.Contract(
                this.ROOT_NETWORK_ADDRESS,
                ['function registerDlp(tuple(address,address,address,uint256,string,string,string,string))'],
                this.wallet
            );

            await rootNetwork.registerDlp({
                dlpAddress: dlp.address,
                ownerAddress: process.env.OWNER_ADDRESS,
                treasuryAddress: process.env.OWNER_ADDRESS,
                stakersPercentage: ethers.utils.parseEther('50'), // 50% to stakers
                name: process.env.DLP_NAME,
                iconUrl: '',
                website: '',
                metadata: ''
            }, { value: ethers.utils.parseEther('100') }); // Required stake amount

            return { dlpAddress: dlp.address, tokenAddress: token.address };
        } catch (error) {
            console.error('Deployment error:', error);
            throw error;
        }
    }

    /**
     * Step 2: Encrypt file data
     * This function encrypts the file URL before uploading to Vana
     */
    async encryptData(fileUrl) {
        // Generate a random encryption key
        const encryptionKey = crypto.randomBytes(32);
        
        // Create cipher
        const cipher = crypto.createCipheriv(
            'aes-256-gcm',
            encryptionKey,
            crypto.randomBytes(12)
        );

        // Encrypt the file URL
        let encryptedData = cipher.update(fileUrl, 'utf8', 'hex');
        encryptedData += cipher.final('hex');
        
        // Get auth tag
        const authTag = cipher.getAuthTag();

        // Encrypt the encryption key with DLP's public key
        // Note: You'll need to implement proper encryption of the key using the DLP's public key
        // This is a placeholder for the actual encryption
        const encryptedKey = await this.encryptKeyForDLP(encryptionKey);

        return {
            encryptedData,
            encryptedKey,
            authTag: authTag.toString('hex')
        };
    }

    /**
     * Step 3: Upload encrypted file to Vana
     * This handles the full upload process including encryption and TEE attestation
     */
    async uploadFileToVana(originalFileUrl) {
        try {
            // 1. Encrypt the file URL
            const { encryptedData, encryptedKey, authTag } = await this.encryptData(originalFileUrl);

            // 2. Create the encrypted URL format that Vana expects
            const vanaEncryptedUrl = JSON.stringify({
                data: encryptedData,
                key: encryptedKey,
                authTag,
                version: '1.0'
            });

            // 3. Add encrypted file to Data Registry
            const dataRegistry = new ethers.Contract(
                this.DATA_REGISTRY_ADDRESS,
                ['function addFile(string memory url, address[] memory permissions)'],
                this.wallet
            );

            const tx = await dataRegistry.addFile(
                vanaEncryptedUrl,
                [process.env.DLP_ADDRESS] // Give permission to your DLP
            );
            const receipt = await tx.wait();

            // 4. Get file ID from event logs
            const fileId = receipt.events[0].args.fileId;

            // 5. Request TEE attestation
            const teePool = new ethers.Contract(
                this.TEE_POOL_ADDRESS,
                ['function addJob(uint256 fileId, string memory instruction)'],
                this.wallet
            );

            await teePool.addJob(fileId, process.env.DLP_PROOF_INSTRUCTION);

            return {
                fileId,
                status: 'success',
                message: 'File uploaded and attestation requested'
            };
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }

    /**
     * Helper function to encrypt the encryption key with DLP's public key
     * This needs to be implemented based on your specific encryption requirements
     */
    async encryptKeyForDLP(key) {
        // TODO: Implement proper encryption using DLP's public key
        // This is where you'd use the DLP_PUBLIC_KEY from your env to encrypt the key
        throw new Error('encryptKeyForDLP needs to be implemented');
    }
}

// Example implementation of encryptKeyForDLP using the Vana standards
async function encryptKeyForDLP(key) {
    // The DLP public key should be in your .env file
    // Format: 0x04{64 bytes for X coordinate}{64 bytes for Y coordinate}
    const dlpPublicKey = process.env.DLP_PUBLIC_KEY;
    
    // You'll need to use a library like eccrypto or secp256k1
    // to perform the encryption with the DLP's public key
    const encryptedKey = await eccrypto.encrypt(
        Buffer.from(dlpPublicKey.slice(2), 'hex'),
        Buffer.from(key)
    );
    
    return encryptedKey;
}

class VanaTransactionManager {
    constructor(provider) {
        this.provider = provider;
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY = 5000; // 5 seconds
    }

    async executeWithRetry(transaction) {
        let attempts = 0;
        while (attempts < this.MAX_RETRIES) {
            try {
                const tx = await transaction();
                const receipt = await tx.wait();
                
                // Monitor transaction status
                if (receipt.status === 1) {
                    return receipt;
                } else {
                    throw new Error('Transaction failed');
                }
            } catch (error) {
                attempts++;
                if (attempts === this.MAX_RETRIES) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
            }
        }
    }

    async monitorTransaction(txHash) {
        const receipt = await this.provider.waitForTransaction(txHash);
        return {
            status: receipt.status === 1 ? 'success' : 'failed',
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            events: receipt.logs
        };
    }
}

class VanaErrorHandler {
    static async handleError(error, context) {
        // Categorize errors
        if (error.code === 'INSUFFICIENT_FUNDS') {
            console.error('Wallet needs more VANA tokens');
            // Implement notification system
            await this.notifyAdmin('Insufficient funds for Vana transactions');
        } else if (error.code === 'NETWORK_ERROR') {
            console.error('Moksha network connection issue');
            // Log to monitoring service
            await this.logToMonitoring({
                type: 'NETWORK_ERROR',
                timestamp: new Date(),
                details: error
            });
        }

        // Log to your logging service
        await this.logError(error, context);

        throw new VanaError(error.message, context);
    }
}


class VanaIntegrationService {
    constructor() {
        this.vanaService = new VanaService();
        this.txManager = new VanaTransactionManager(this.vanaService.provider);
        this.initialized = false;
    }

    async initialize() {
        try {
            // 1. Check environment variables
            this.validateEnvironment();

            // 2. Check wallet balance
            await this.checkWalletBalance();

            // 3. Deploy contracts if not already deployed
            if (!process.env.DLP_ADDRESS) {
                const contracts = await this.vanaService.deployDLPAndToken();
                // Store these addresses securely
                await this.storeContractAddresses(contracts);
            }

            // 4. Verify DLP registration
            await this.verifyDLPRegistration();

            this.initialized = true;
        } catch (error) {
            await VanaErrorHandler.handleError(error, 'initialization');
        }
    }

    async uploadFile(fileUrl) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // 1. Validate file URL
            if (!this.isValidUrl(fileUrl)) {
                throw new Error('Invalid file URL');
            }

            // 2. Upload to Vana with retry logic
            const result = await this.txManager.executeWithRetry(
                () => this.vanaService.uploadFileToVana(fileUrl)
            );

            // 3. Monitor the upload transaction
            const status = await this.txManager.monitorTransaction(result.transactionHash);

            // 4. Store upload record
            await this.storeUploadRecord({
                fileUrl,
                fileId: result.fileId,
                status,
                timestamp: new Date()
            });

            return result;
        } catch (error) {
            await VanaErrorHandler.handleError(error, 'file_upload');
        }
    }

    // Helper methods
    async validateEnvironment() {
        const requiredEnvVars = [
            'DEPLOYER_PRIVATE_KEY',
            'OWNER_ADDRESS',
            'DLP_NAME',
            'DLP_PUBLIC_KEY',
            'DLP_TOKEN_NAME',
            'DLP_TOKEN_SYMBOL',
            'DLP_FILE_REWARD_FACTOR',
            'DLP_PROOF_INSTRUCTION'
        ];

        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`Missing required environment variable: ${envVar}`);
            }
        }
    }

    async checkWalletBalance() {
        const balance = await this.vanaService.provider.getBalance(this.vanaService.wallet.address);
        if (balance.lt(ethers.utils.parseEther('1'))) {
            throw new Error('Insufficient VANA balance for transactions');
        }
    }
}

// Example implementation in your application
async function setupVanaIntegration() {
    const vanaIntegration = new VanaIntegrationService();
    await vanaIntegration.initialize();
    
    // Store the instance for reuse
    global.vanaIntegration = vanaIntegration;
}

// Example upload endpoint
async function handleFileUpload(fileUrl) {
    try {
        const result = await global.vanaIntegration.uploadFile(fileUrl);
        return result;
    } catch (error) {
        // Handle error appropriately
        console.error('File upload failed:', error);
        throw error;
    }
}


module.exports = VanaService;