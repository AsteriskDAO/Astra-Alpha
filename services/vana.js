const ethers = require('ethers');
const { encryptWithWalletPublicKey } = require('../utils/crypto.js');
const crypto = require('crypto');

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

const contractAddress = "0x02C6C80EDe873285b5e1a06ae425e5fE277BB310";
const dataRegistryContractAddress = "0x8C8788f98385F6ba1adD4234e551ABba0f82Cb7C";
const teePoolContractAddress = "0xE8EC6BD73b23Ad40E6B9a6f4bD343FAc411bD99A";
const FIXED_MESSAGE = "Please sign to retrieve your encryption key";

const provider = new ethers.JsonRpcProvider("https://rpc.moksha.vana.org");

// Define the state interface
const VANA_UPLOAD_STEPS = {
    FILE_REGISTERED: 'file_registered',
    CONTRIBUTION_PROOF_REQUESTED: 'contribution_proof_requested',
    TEE_PROOF_SUBMITTED: 'tee_proof_submitted',
    REWARD_CLAIMED: 'reward_claimed'
};

function getChecksum(data) {
    if (Buffer.isBuffer(data)) {
        return crypto.createHash('sha256').update(data).digest('hex');
    } else if (typeof data === 'string') {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
    return 'unknown-type';
}

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
        console.log("Raw job details:", jobDetails);

        // Get TEE info
        const teeInfo = await teePoolContract.tees(jobDetails.teeAddress);
        console.log("TEE info:", teeInfo);

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
        throw new Error(`Failed to fetch TEE details: ${error.message}`);
    }
};

const fileJobIds = async (teePoolContract, fileId) => {
    const jobIds = await teePoolContract.fileJobIds(fileId);
    console.log("Job IDs:", jobIds);
    return jobIds.map(Number);
};

const handleFileUpload = async (encryptedFileUrl, signature, previousState = {}) => {
    // Initialize state with previous values and default flags if they don't exist
    let state = { 
        ...previousState,
        file_registered: previousState.file_registered || false,
        contribution_proof_requested: previousState.contribution_proof_requested || false,
        tee_proof_submitted: previousState.tee_proof_submitted || false,
        reward_claimed: previousState.reward_claimed || false
    };

    try {
        console.log("Starting upload with state:", state);
        let fileId = state.fileId;
        const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
        const wallet = new ethers.Wallet(privateKey, provider);
        const signer = wallet.connect(provider);

        // Use the same IV and ephemeral key throughout the process
        let fixed_iv = state.fixed_iv;
        let fixed_ephemeral_key = state.fixed_ephemeral_key;

        if (!state.fixed_iv) {
            fixed_iv = new Uint8Array([
                0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c,
                0x0d, 0x0e, 0x0f, 0x10,
            ]);
            // Store both buffer and hex
            state.fixed_iv_buffer = Buffer.from(fixed_iv);
            state.fixed_iv = state.fixed_iv_buffer.toString('hex');
        }
        if (!state.fixed_ephemeral_key) {
            fixed_ephemeral_key = new Uint8Array([
                0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc,
                0xdd, 0xee, 0xff, 0x00, 0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80,
                0x90, 0xa0, 0xb0, 0xc0, 0xd0, 0xe0, 0xf0, 0x00,
            ]);
            // Store both buffer and hex
            state.fixed_ephemeral_key_buffer = Buffer.from(fixed_ephemeral_key);
            state.fixed_ephemeral_key = state.fixed_ephemeral_key_buffer.toString('hex');
        }

        const dlpContract = new ethers.Contract(contractAddress, DataLiquidityPoolABI.abi, signer);
        const dataRegistryContract = new ethers.Contract(dataRegistryContractAddress, DataRegistryImplementationABI.abi, signer);
        const teePoolContract = new ethers.Contract(teePoolContractAddress, TeePoolImplementationABI.abi, signer);

        const publicKey = await dlpContract.publicKey();
        
        const ivChecksum = getChecksum(state.fixed_iv);
        const ephemeralKeyChecksum = getChecksum(state.fixed_ephemeral_key);
        const publicKeyChecksum = getChecksum(publicKey);
        const dlpAddressChecksum = getChecksum(contractAddress);
        // Only do initial file registration if not already done
        if (!state.file_registered) {
            console.log("Registering file...");

            

            // Register file
            const encryptedKey = await encryptWithWalletPublicKey(
                signature, 
                publicKey,
                state.fixed_iv_buffer,  // Use buffer for encryption
                state.fixed_ephemeral_key_buffer  // Use buffer for encryption
            );

            console.log("Contract address:", contractAddress.toLowerCase());
            console.log("Public key:", publicKey);
            console.log("Fixed IV:", state.fixed_iv.toString('hex'));
            console.log("Fixed ephemeral key:", state.fixed_ephemeral_key.toString('hex'));
            console.log("Encrypted key for file registration:", encryptedKey);

            console.log("Wallet address:", wallet.address.toLowerCase());
            
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
                    console.log("File registered with ID:", fileId);
                } catch (e) {
                    throw new Error("Failed to parse file ID from logs");
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
            console.log("Receipt:", receipt);
            
            const jobIds = await fileJobIds(teePoolContract, fileId);
            console.log("Job IDs:", jobIds);
            const latestJobId = jobIds[jobIds.length - 1];
            console.log("Contribution proof requested, job ID:", latestJobId);
            
            // Get the job details from the contract
            const jobDetails = await getTeeDetails(teePoolContract, latestJobId);
            console.log("Job details:", jobDetails);
            
            state.jobDetails = jobDetails;
            state.contribution_proof_requested = true;
        }

        // Submit proof to TEE if not already done
        if (!state.tee_proof_submitted && state.jobDetails) {
            console.log("Submitting proof to TEE...");

            const nonce = await provider.getTransactionCount(wallet.address);
            

            const ivChecksum2 = getChecksum(state.fixed_iv);
            const ephemeralKeyChecksum2 = getChecksum(state.fixed_ephemeral_key);
            const publicKeyChecksum2 = getChecksum(publicKey);
            const dlpAddressChecksum2 = getChecksum(contractAddress);

            // check if the checksums are the same
            if (ivChecksum2 !== ivChecksum || ephemeralKeyChecksum2 !== ephemeralKeyChecksum || publicKeyChecksum2 !== publicKeyChecksum || dlpAddressChecksum2 !== dlpAddressChecksum) {
                console.log("--------------------------------------------------------------")
                console.log("Checksums do not match");
                console.log("--------------------------------------------------------------")
                throw new Error("Checksums do not match");
            } else {
                console.log("--------------------------------------------------------------")
                console.log("Checksums match");
                console.log("--------------------------------------------------------------")
            }
            
            const requestBody = {
                job_id: state.jobDetails.jobId,
                file_id: fileId,
                nonce: nonce,
                proof_url: "https://github.com/Boka44/asterisk-vana-proof/releases/download/v10/my-proof-10.tar.gz",
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
                    console.log("Encrypting key with TEE public key...");
                    const encryptedKey = await encryptWithWalletPublicKey(
                        signature,
                        state.jobDetails.teePublicKey,
                        state.fixed_iv_buffer,
                        state.fixed_ephemeral_key_buffer
                    );
                    console.log("Encrypted key for TEE:", encryptedKey);
                    requestBody.encrypted_encryption_key = encryptedKey;
                } catch (error) {
                    console.error("Failed to encrypt key with TEE public key:", error);
                    requestBody.encryption_key = signature;
                }
            } else {
                requestBody.encryption_key = signature;
            }
            

            console.log("Request body:", requestBody);
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
            console.log(response)
            console.log("TEE proof submitted successfully");
        }

        // Claim reward if not already done
        if (!state.reward_claimed) {
            console.log("Claiming reward...");
            const claimTx = await dlpContract.requestReward(fileId, 1);
            await claimTx.wait();
            state.reward_claimed = true;
            console.log("Reward claimed");
        }

        return { 
            uploadedFileId: fileId, 
            message: "File uploaded & reward requested successfully",
            state 
        };
    } catch (error) {
        console.error("Error in handleFileUpload:", error);
        throw { error, state };
    }
};

module.exports = { handleFileUpload };


// DLP is only needed at the last step for rewarding the contributor
// aka points

