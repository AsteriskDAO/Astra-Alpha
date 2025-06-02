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
    // Initialize state with previous values and default flags if they don't exist
    let state = { 
        ...previousState,
        // file_registered: previousState.file_registered || false,
        // contribution_proof_requested: previousState.contribution_proof_requested || false,
        // tee_proof_submitted: previousState.tee_proof_submitted || false,
        // reward_claimed: previousState.reward_claimed || false
    };

    try {
        let fileId = state.fileId;
        const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
        const wallet = new ethers.Wallet(privateKey, provider);
        const signer = wallet.connect(provider);

        // Use the same IV and ephemeral key throughout the process
        let fixed_iv = state.fixed_iv;
        let fixed_ephemeral_key = state.fixed_ephemeral_key;

        if (!state.fixed_iv) {
            fixed_iv = crypto.getRandomValues(new Uint8Array(16));
            // Store both buffer and hex
            state.fixed_iv_buffer = Buffer.from(fixed_iv);
            state.fixed_iv = state.fixed_iv_buffer.toString('hex');
        }
        if (!state.fixed_ephemeral_key) {
            fixed_ephemeral_key = crypto.getRandomValues(new Uint8Array(32))
            // Store both buffer and hex
            state.fixed_ephemeral_key_buffer = Buffer.from(fixed_ephemeral_key);
            state.fixed_ephemeral_key = state.fixed_ephemeral_key_buffer.toString('hex');
        }

        const dlpContract = new ethers.Contract(contractAddress, DataLiquidityPoolABI.abi, signer);
        const dataRegistryContract = new ethers.Contract(dataRegistryContractAddress, DataRegistryImplementationABI.abi, signer);
        const teePoolContract = new ethers.Contract(teePoolContractAddress, TeePoolImplementationABI.abi, signer);

        const publicKey = await dlpContract.publicKey();
        
        // Check if the file is already registered for retry purposes
        if (!state.file_registered) {
            console.log("Registering file...");

            // Register file with Vana
            const encryptedKey = await encryptWithWalletPublicKey(
                signature, 
                publicKey,
                state.fixed_iv_buffer,  // Use buffer for encryption
                state.fixed_ephemeral_key_buffer  // Use buffer for encryption
            );

            
            const tx = await dataRegistryContract.addFileWithPermissions(
                encryptedFileUrl, 
                wallet.address,
                [{ account: contractAddress.toLowerCase(), key: encryptedKey }] 
            );
            const receipt = await tx.wait();

            // Parse file ID
            if (receipt.logs && receipt.logs.length > 0) {
                const log = receipt.logs[0];
                try {
                    const parsedLog = dataRegistryContract.interface.parseLog({
                        topics: log.topics,
                        data: log.data
                    });
                    fileId = Number(parsedLog?.args[0]);
                    state.fileId = fileId;
                    state.file_registered = true;
                } catch (e) {
                    throw { error: new Error("Failed to parse file ID from logs"), state, status: false };
                }
            }
        }

        // Request contribution proof if not already done
        if (!state.contribution_proof_requested) {
            console.log("Requesting contribution proof...");
            const teeFee = await teePoolContract.teeFee();
            
            // Request proof and get job ID directly
            const tx = await teePoolContract.requestContributionProof(fileId, { value: teeFee });
            const receipt = await tx.wait();
            
            const jobIds = await fileJobIds(teePoolContract, fileId);
            const latestJobId = jobIds[jobIds.length - 1];
            
            // Get the job details from the contract
            const jobDetails = await getTeeDetails(teePoolContract, latestJobId);
            
            state.jobDetails = jobDetails;
            state.contribution_proof_requested = true;
        }

        // Submit proof to TEE if not already done
        if (!state.tee_proof_submitted && state.jobDetails) {
            console.log("Submitting proof to TEE...");

            const nonce = await provider.getTransactionCount(wallet.address);
        

            // Build the request body
            
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
                try {
                    const encryptedKey = await encryptWithWalletPublicKey(
                        signature,
                        state.jobDetails.teePublicKey,
                        state.fixed_iv_buffer,
                        state.fixed_ephemeral_key_buffer
                    );
                    // console.log("Encrypted key for TEE:", encryptedKey);
                    requestBody.encrypted_encryption_key = encryptedKey;
                } catch (error) {
                    console.error("Failed to encrypt key with TEE public key:", error);
                    requestBody.encryption_key = signature;
                    throw { error, state, status: false };
                }
            } else {
                requestBody.encryption_key = signature;
            }
            

            // console.log("Request body:", requestBody);
            // Submit proof to TEE
            const response = await fetch(`${state.jobDetails.teeUrl}/RunProof`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("TEE proof submission failed:", errorData);
                console.error(errorData.detail.error.details);
                throw { error: errorData, state };
            }

            state.tee_proof_submitted = true;
            // console.log(response)
        }

        // Refine data
        if(!state.data_refined) {
            console.log("Refining data...");
            // if checkin, use checkin refiner, if health, use health refiner
            const refinerId = config.vana.refinerIds[data_type];
            // const refinementEncryptionKey = config.vana.refinementEncryptionKey;
            // const refinementUrl = config.vana.refinementUrl[data_type];
            console.log(config.pinata.apiKey)
            try {
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

                const result = await response.json();
                console.log("Refinement successful");
                state.data_refined = true;
            } catch (error) {
                // Log detailed error info
                console.error("Error refining data:", {
                    message: error.message,
                    cause: error.cause,
                    stack: error.stack
                });

                throw { error, state, status: false }; // Rethrow to trigger retry
            }
        }
        
        // Claim reward if not already done
        if (!state.reward_claimed) {
            console.log("Claiming reward...");
            const claimTx = await dlpContract.requestReward(fileId, 1);
            await claimTx.wait();
            state.reward_claimed = true;
        }

        console.log("File uploaded & reward requested successfully");

        return { 
            uploadedFileId: fileId, 
            message: "File uploaded & reward requested successfully",
            state,
            status: true
        };
    } catch (error) {
        console.error("Error in handleFileUpload:", error);
        throw { error, state, status: false };
    }
};

module.exports = { handleFileUpload };


// DLP is only needed at the last step for rewarding the contributor
// aka points

