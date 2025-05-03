const crypto = require('crypto');

function createUserHash(user_id) {
  // Deterministic SHA-256 hash, hex encoded
  return crypto.createHash('sha256').update(user_id).digest('hex');
}

function compareUserHash(plainUserId, hashedUserId) {
  // Re-hash and compare
  return createUserHash(plainUserId) === hashedUserId;
}

module.exports = {
  createUserHash,
  compareUserHash
};
