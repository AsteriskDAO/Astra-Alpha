const { SelfBackendVerifier, AllIds, DefaultConfigStore } = require('@selfxyz/core');

// Create configuration storage with verification requirements
const configStore = new DefaultConfigStore({
  excludedCountries: [],  // No country exclusions for gender verification
  ofac: false,  // Disable OFAC checking for gender verification
  gender: true
});

const selfBackendVerifier = new SelfBackendVerifier(
  "gender-verification", // scope - must match frontend
  process.env.SERVER_URL + "/api/users/verify-gender", // endpoint
  false, // mockPassport: false for production, true for testing
  AllIds, // allowedIds: accept all document types
  configStore, // configStorage: our verification configuration
  "uuid" // userIdentifierType: using UUID for user identification
);

/**
 * Verify a proof using Self's backend verifier
 * @param {number} attestationId - The attestation ID (1 for passport, 2 for EU ID)
 * @param {Object} proof - The zero-knowledge proof object
 * @param {Array} publicSignals - The public signals from the proof
 * @param {string} userContextData - User context data (hex-encoded)
 * @returns {Promise<Object>} - Verification result with user data and credential subject
 */
const verifyProof = async (attestationId, proof, publicSignals, userContextData) => {
  try {
    const result = await selfBackendVerifier.verify(
      attestationId,
      proof,
      publicSignals,
      userContextData
    );
    
    return {
      isValid: result.isValidDetails.isValid,
      credentialSubject: result.discloseOutput,
      userData: result.userData,
      isValidDetails: result.isValidDetails
    };
  } catch (error) {
    console.error('Proof verification error:', error);
    throw error;
  }
};

module.exports = { verifyProof };