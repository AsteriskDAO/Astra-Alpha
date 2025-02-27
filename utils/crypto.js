const crypto = require('crypto');

/**
 * Encrypts file data using a signature as the encryption key
 * @param {File} file - The file to encrypt
 * @param {string} signature - The signature to use as encryption key
 * @returns {Promise<string>} - Returns encrypted data as base64 string
 */
async function serverSideEncrypt(file, signature) {
    try {
        // Convert signature to key material
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.digest(
            'SHA-256',
            encoder.encode(signature)
        );

        // Generate encryption key
        const key = await crypto.subtle.importKey(
            'raw',
            keyMaterial,
            { name: 'AES-CBC' },
            false,
            ['encrypt']
        );

        // Generate random IV
        const iv = crypto.getRandomValues(new Uint8Array(16));

        // Read and encrypt file data
        const fileData = await file.arrayBuffer();
        const encryptedData = await crypto.subtle.encrypt(
            {
                name: 'AES-CBC',
                iv: iv
            },
            key,
            fileData
        );

        // Combine IV and encrypted data
        const result = new Uint8Array([...iv, ...new Uint8Array(encryptedData)]);
        
        // Convert to base64
        return btoa(String.fromCharCode(...result));
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error(`Encryption failed: ${error.message}`);
    }
}

/**
 * Encrypts a message with a public key
 * @param {string} message - Message to encrypt
 * @param {string} publicKey - Public key to encrypt with
 * @returns {Promise<string>} - Returns encrypted message
 */
async function encryptWithWalletPublicKey(message, publicKey) {
    // This function is used in vana.js but implementation depends on the specific encryption 
    // requirements of your blockchain network
    // You might want to use something like ecies-js or ethereum-encryption libraries
    throw new Error('Not implemented');
}

module.exports = {
    serverSideEncrypt,
    encryptWithWalletPublicKey
}; 