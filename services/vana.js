const ethers = require('ethers');
const { encryptWithWalletPublicKey } = require('../utils/crypto.js');
const crypto = require('crypto');
const config = require('../config/config');
/**
 * @title Vana Service
 * @notice Manages data contribution to Vana data liquidity pool
 * @dev Handles file registration, TEE proofs, and reward claiming
 */

// Import ABIs correctly
const DataLiquidityPoolABI = {
    abi: require("../contracts/DataLiquidityPoolLightImplementation.json")
};
const TeePoolImplementationABI = {
    abi: require("../contracts/TeePoolImplementation.json")
};
const DataRegistryImplementationABI = {
    abi: require("../contracts/DataRegistryImplementation.json")
};

const contractAddress = config.vana.contracts.dlp;
const dataRegistryContractAddress = config.vana.contracts.registry;
const teePoolContractAddress = config.vana.contracts.teePool;
const FIXED_MESSAGE = "Please sign to retrieve your encryption key";

const provider = new ethers.JsonRpcProvider(config.vana.rpcUrl);

/**
 * Get TEE details for a job
 * @param {Contract} teePoolContract - The TEE pool contract instance
 * @param {string} jobId - The job ID to get details for
 * @returns {Promise<Object>} - Job details with TEE info
 */
const getTeeDetails = async (teePoolContract, jobId) => {
    try {
        // Get job details directly from contract
        const jobDetails = await teePoolContract.jobs(jobId);
        // console.log("Raw job details:", jobDetails);

        // Get TEE info
        const teeInfo = await teePoolContract.tees(jobDetails.teeAddress);
        // console.log("TEE info:", teeInfo);

        // Return combined info
        return {
            jobId,
            teeAddress: jobDetails.teeAddress,
            teeUrl: teeInfo.url,
            teePublicKey: teeInfo.publicKey,
            status: jobDetails.status
        };
    } catch (error) {
        console.error("Error fetching job details:", error);
        throw { error: new Error(`Failed to fetch TEE details: ${error.message}`), state, status: false };
    }
};

/**
 * Get job IDs for a file
 * @param {Contract} teePoolContract - The TEE pool contract instance
 * @param {number} fileId - The ID of the file to get job IDs for
 * @returns {Promise<Array>} - Array of job IDs
 */
const fileJobIds = async (teePoolContract, fileId) => {
    const jobIds = await teePoolContract.fileJobIds(fileId);
    // console.log("Job IDs:", jobIds);
    return jobIds.map(Number);
};

/**
 * Handle complete file upload process to Vana
 * @param {string} encryptedFileUrl - URL of encrypted file on O3
 * @param {string} signature - User signature for encryption
 * @param {Object} previousState - Previous upload state for retries
 * @returns {Promise<{uploadedFileId: number, message: string, state: Object}>}
 * @dev Manages the full flow: registration, proof request, TEE submission, reward claim
 */

const handleFileUpload = async (encryptedFileUrl, signature, data_type, previousState = {}) => {
    // Initialize state with previous values and default flags
    let state = { 
        ...previousState,
        status: false  // Will be set to true only when complete
    };

    try {
        let fileId = state.fileId;
        const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
        const wallet = new ethers.Wallet(privateKey, provider);
        const signer = wallet.connect(provider);

        // Use the same IV and ephemeral key throughout the process
        let fixed_iv;
        let fixed_ephemeral_key;

        if (!state.fixed_iv) {
            fixed_iv = crypto.getRandomValues(new Uint8Array(16));
            // Store both buffer and hex
            state.fixed_iv_buffer = Buffer.from(fixed_iv);
            state.fixed_iv = state.fixed_iv_buffer.toString('hex');
        } else {
            fixed_iv = state.fixed_iv_buffer;
        }

        if (!state.fixed_ephemeral_key) {
            fixed_ephemeral_key = crypto.getRandomValues(new Uint8Array(32))
            state.fixed_ephemeral_key_buffer = Buffer.from(fixed_ephemeral_key);
            state.fixed_ephemeral_key = state.fixed_ephemeral_key_buffer.toString('hex');
        } else {
            fixed_ephemeral_key = state.fixed_ephemeral_key_buffer;
        }

        const dlpContract = new ethers.Contract(contractAddress, DataLiquidityPoolABI.abi, signer);
        const dataRegistryContract = new ethers.Contract(dataRegistryContractAddress, DataRegistryImplementationABI.abi, signer);
        const teePoolContract = new ethers.Contract(teePoolContractAddress, TeePoolImplementationABI.abi, signer);

        const publicKey = await dlpContract.publicKey();
        
        // File Registration Stage
        if (!state.file_registered) {
            console.log("Registering file...");
            try {
                const encryptedKey = await encryptWithWalletPublicKey(
                    signature, 
                    publicKey,
                    state.fixed_iv_buffer,
                    state.fixed_ephemeral_key_buffer
                );
                
                const tx = await dataRegistryContract.addFileWithPermissions(
                    encryptedFileUrl, 
                    wallet.address,
                    [{ account: contractAddress.toLowerCase(), key: encryptedKey }] 
                );
                const receipt = await tx.wait();

                if (receipt.logs && receipt.logs.length > 0) {
                    const log = receipt.logs[0];
                    const parsedLog = dataRegistryContract.interface.parseLog({
                        topics: log.topics,
                        data: log.data
                    });
                    fileId = Number(parsedLog?.args[0]);
                    state.fileId = fileId;
                    state.file_registered = true;
                } else {
                    return { ...state, error: "Failed to parse file ID from logs", message: "Failed to parse file ID from logs" };
                }
            } catch (error) {
                return { ...state, error: `File registration failed`, message: error.message };
            }
        }

        // Contribution Proof Stage
        if (!state.contribution_proof_requested) {
            console.log("Requesting contribution proof...");
            try {
                const teeFee = await teePoolContract.teeFee();
                const tx = await teePoolContract.requestContributionProof(fileId, { value: teeFee });
                await tx.wait();

                const jobIds = await fileJobIds(teePoolContract, fileId);
                const latestJobId = jobIds[jobIds.length - 1];
                const jobDetails = await getTeeDetails(teePoolContract, latestJobId);
                
                state.jobDetails = jobDetails;
                state.contribution_proof_requested = true;
            } catch (error) {
                    return { ...state, error: `Contribution proof request failed`, message: error.message };
            }
        }

        // TEE Proof Submission Stage
        if (!state.tee_proof_submitted && state.jobDetails) {
            console.log("Submitting proof to TEE...");
            try {
                const nonce = await provider.getTransactionCount(wallet.address);
                const requestBody = {
                    job_id: state.jobDetails.jobId,
                    file_id: fileId,
                    nonce: nonce,
                    proof_url: config.vana.proofUrl,
                    encryption_seed: FIXED_MESSAGE,
                    validate_permissions: [{
                        address: contractAddress.toLowerCase(),
                        public_key: publicKey,
                        iv: state.fixed_iv,
                        ephemeral_key: state.fixed_ephemeral_key,
                    }]
                };

                if (state.jobDetails.teePublicKey) {
                    const encryptedKey = await encryptWithWalletPublicKey(
                        signature,
                        state.jobDetails.teePublicKey,
                        state.fixed_iv_buffer,
                        state.fixed_ephemeral_key_buffer
                    );
                    requestBody.encrypted_encryption_key = encryptedKey;
                } else {
                    requestBody.encryption_key = signature;
                }

                const response = await fetch(`${state.jobDetails.teeUrl}/RunProof`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                }); 
                
                if (!response.ok) {
                    const errorData = await response.json();
                    return { ...state, error: `TEE proof submission failed`, message: errorData.detail?.error?.details || 'Unknown error' };
                }

                state.tee_proof_submitted = true;
            } catch (error) {
                return { ...state, error: `TEE proof submission failed`, message: error.message };
            }
        }

        // Data Refinement Stage
        if (!state.data_refined) {
            console.log("Refining data...");
            try {
                const refinerId = config.vana.refinerIds[data_type];
                const response = await fetch(config.vana.refinementServiceUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        file_id: fileId,
                        encryption_key: signature,
                        refiner_id: refinerId,
                        env_vars: {
                            PINATA_API_KEY: config.pinata.apiKey,
                            PINATA_API_SECRET: config.pinata.apiSecret
                        }
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    return { ...state, error: 'Data refinement failed', message: errorData.detail?.error?.details || 'Unknown error' };
                }

                await response.json();
                state.data_refined = true;
            } catch (error) {
                return { ...state, error: `Data refinement failed`, message: error.message };
            }
        }
        
        // Reward Claim Stage
        if (!state.reward_claimed) {
            console.log("Claiming reward...");
            try {
                const claimTx = await dlpContract.requestReward(fileId, 1);
                await claimTx.wait();
                state.reward_claimed = true;
            } catch (error) {
                return { ...state, error: `Reward claim failed`, message: error.message };
            }
        }

        console.log("File uploaded & reward requested successfully");
        return { 
            uploadedFileId: fileId, 
            message: "File uploaded & reward requested successfully",
            state: { ...state, status: true }
        };

    } catch (error) {
        console.error("Error in handleFileUpload:", error);
        return { ...state, error: `Unexpected error`, message: error.message };
    }
};

module.exports = { handleFileUpload };


// DLP is only needed at the last step for rewarding the contributor
// aka points

