 /**
 * @title Configuration Service
 * @notice Centralized configuration management
 */
const config = {
    pinata: {
        apiKey: process.env.PINATA_API_KEY,
        apiSecret: process.env.PINATA_API_SECRET
    },
    akave: {
        
        endpoint: process.env.AKAVE_ENDPOINT,
        region: process.env.AKAVE_REGION,
        accessKey: process.env.AKAVE_ACCESS_KEY,
        secretKey: process.env.AKAVE_SECRET_KEY,
        buckets: {
            health: process.env.AKAVE_BUCKET_NAME_HEALTH,
            checkin: process.env.AKAVE_BUCKET_NAME_CHECKIN
        }
    },
    vana: {
        rpcUrl: process.env.VANA_RPC_URL,
        contracts: {
            dlp: process.env.VANA_CONTRACTS_DLP,
            registry: process.env.VANA_CONTRACTS_REGISTRY,
            teePool: process.env.VANA_CONTRACTS_TEEP_POOL
        },
        proofUrl: "https://github.com/Boka44/asterisk-vana-proof/releases/download/v15/my-proof-15.tar.gz",
        refinementUrl: {
            checkin: "https://github.com/Boka44/vana-asterisk-data-refinement-checkin/releases/download/v7/refiner-7.tar.gz",
            health: "https://github.com/Boka44/vana-asterisk-data-refinement-health-data/releases/download/v5/refiner-5.tar.gz"
        },
        refinementServiceUrl: process.env.VANA_REFINER_SERVICE_URL,
        refinerIds: {
            checkin: process.env.VANA_REFINER_CHECKIN_ID,
            health: process.env.VANA_REFINER_HEALTH_ID
        },
        refinementEncryptionKey: "0x04fdb1b931c1c61849105a11f02a6c1519ad5e248d682ce2f65351453ff42523f10b98f1d9cd1fe3f47cfe4223c827a4401fd4dda7c23c3bec7dc59359af9974a1",
        dlpId: process.env.VANA_DLP_ID
    },
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    }
};

module.exports = config;