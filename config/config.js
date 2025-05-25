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
        // TODO: update to production endpoint
        endpoint: process.env.AKAVE_ENDPOINT,
        region: process.env.AKAVE_REGION,
        accessKey: process.env.AKAVE_ACCESS_KEY,
        secretKey: process.env.AKAVE_SECRET_KEY,
        buckets: {
            health: process.env.AKAVE_BUCKET_NAME_HEALTH_TEST,
            checkin: process.env.AKAVE_BUCKET_NAME_CHECKIN_TEST
        }
    },
    vana: {
        // TODO: update to production rpc url
        rpcUrl: "https://rpc.moksha.vana.org",
        contracts: {
            dlp: "0x02C6C80EDe873285b5e1a06ae425e5fE277BB310",
            registry: "0x8C8788f98385F6ba1adD4234e551ABba0f82Cb7C",
            teePool: "0xE8EC6BD73b23Ad40E6B9a6f4bD343FAc411bD99A"
        },
        proofUrl: "https://github.com/Boka44/asterisk-vana-proof/releases/download/v10/my-proof-10.tar.gz",
        refinementUrl: {
            checkin: "https://github.com/Boka44/vana-asterisk-data-refinement-checkin/releases/download/v1/refiner-1.tar.gz",
            health: "https://github.com/Boka44/vana-asterisk-data-refinement-health-data/releases/download/v2/refiner-2.tar.gz"
        },
        refinementServiceUrl: "https://a7df0ae43df690b889c1201546d7058ceb04d21b-8000.dstack-prod5.phala.network/refine",
        refinerIds: {
            checkin: 26,
            health: 27
        },
        refinementEncryptionKey: "0x04fdb1b931c1c61849105a11f02a6c1519ad5e248d682ce2f65351453ff42523f10b98f1d9cd1fe3f47cfe4223c827a4401fd4dda7c23c3bec7dc59359af9974a1",
        dlpId: 50
    },
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    }
};

module.exports = config;