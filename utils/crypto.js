// const crypto = require('crypto');
const eccrypto = require('eccrypto');
const openpgp = require('openpgp');

/**
 * Converts JSON data to a File object
 * @param {object} data - JSON data to convert
 * @returns {File} - File object containing JSON data
 */
function jsonToFile(data) {
    const jsonString = JSON.stringify(data);
    const blob = new Blob([jsonString], { type: 'application/json' });
    return new File([blob], '', { type: 'application/octet-stream' });
}

/**
 * Encrypts file data using OpenPGP (exact match with template)
 * @param {File} file - The file to encrypt
 * @param {string} signature - The signature to use as encryption password
 * @returns {Promise<File>} - Returns encrypted file
 */
async function serverSideEncrypt(file, signature) {
    try {
        // Match template exactly
        const fileBuffer = await file.arrayBuffer();
        const message = await openpgp.createMessage({
            binary: new Uint8Array(fileBuffer)
        });

        const encrypted = await openpgp.encrypt({
            message,
            passwords: [signature],
            format: 'binary'
        });

        // Convert WebStream to File exactly like template
        const response = new Response(encrypted);
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const encryptedBlob = new Blob([uint8Array], {
            type: "application/octet-stream"
        });
        
        const encryptedFile = new File(
            [encryptedBlob],
            "",
            {
                type: "application/octet-stream"
            }
        );

        return new Blob([encryptedFile], { type: "application/octet-stream" });
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error(`Encryption failed: ${error.message}`);
    }
}

/**
 * Format a hex string public key for ECIES encryption
 * @param {string} publicKey - Hex string public key from DLP contract
 * @returns {Buffer} - Formatted public key buffer
 */
function formatPublicKey(publicKey) {
    // Remove '0x' prefix if present
    const cleanKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
    
    // Convert hex string to buffer
    const publicKeyBytes = Buffer.from(cleanKey, 'hex');
    
    // Add '04' prefix if key is compressed (64 bytes)
    const uncompressedKey = publicKeyBytes.length === 64 
        ? Buffer.concat([Buffer.from([4]), publicKeyBytes]) 
        : publicKeyBytes;
    
    console.log("Original key length:", publicKeyBytes.length);
    console.log("Uncompressed key length:", uncompressedKey.length);
    
    return uncompressedKey;
}

/**
 * Encrypts a message with a public key
 * @param {string} message - Message to encrypt
 * @param {string} publicKey - Public key to encrypt with
 * @returns {Promise<string>} - Returns encrypted message
 */
async function encryptWithWalletPublicKey(message, publicKey, iv, ephemeralKey) {
    try {
        console.log("Starting encryption...");
        
        // Convert message to Buffer if it's a string
        const messageBuffer = Buffer.from(message);
        console.log("Message buffer created, length:", messageBuffer.length);
        
        // Format the public key correctly
        const formattedKey = formatPublicKey(publicKey);
        console.log("Formatted key length:", formattedKey.length);
        console.log("Formatted key:", formattedKey.toString('hex'));
        
        console.log("About to call eccrypto.encrypt...");
        // Let eccrypto handle IV and ephemeral key generation
        const encryptedBuffer = await eccrypto.encrypt(
            formattedKey,
            messageBuffer,
            iv,
            ephemeralKey
        );
        console.log("Encryption completed");

        // Combine all parts as in the template
        console.log("Combining encrypted parts...");
        const result = Buffer.concat([
            encryptedBuffer.iv,
            encryptedBuffer.ephemPublicKey,
            encryptedBuffer.ciphertext,
            encryptedBuffer.mac
        ]);
        console.log("Parts combined");
        
        const hexResult = result.toString('hex');
        console.log("Hex string created, length:", hexResult.length);
        
        return hexResult;
    } catch (error) {
        console.error('Error encrypting with public key:', error);
        console.error('Input details:', {
            messageLength: message.length,
            publicKeyLength: publicKey.length,
            publicKey: publicKey
        });
        throw new Error(`Public key encryption failed: ${error.message}`);
    }
}

module.exports = {
    serverSideEncrypt,
    encryptWithWalletPublicKey,
    jsonToFile
}; 