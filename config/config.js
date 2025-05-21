 /**
 * @title Configuration Service
 * @notice Centralized configuration management
 */
const config = {
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
        }
    },
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    }
};

module.exports = config;