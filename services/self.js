const { SelfBackendVerifier, getUserIdentifier } = require('@selfxyz/core');

const selfBackendVerifier = new SelfBackendVerifier(
    "gender-verification", // the scope that you chose to identify your app
    process.env.SERVER_URL + "/api/users/verify-gender" // The API endpoint of this backend
);


/**
 * Verify a proof using Self's backend verifier
 * @param {string} proof - The proof to verify
 * @param {string} publicSignals - The public signals to verify
 * @returns {Promise<{result: boolean, userId: string}>} - True if the proof is valid, false otherwise, and the user ID
 */
const verifyProof = async (proof, publicSignals) => {
    const result = await selfBackendVerifier.verify(proof, publicSignals);
    const userId = await getUserIdentifier(publicSignals);
    return {
        result,
        userId
    };
};


module.exports = { verifyProof };