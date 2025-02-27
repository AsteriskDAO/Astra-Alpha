const bcrypt = require('bcryptjs');

function createUserHash(user_id) {
  const salt = bcrypt.genSaltSync(10);
  const hashedUserId = bcrypt.hashSync(user_id, salt);
  return hashedUserId;
}

function compareUserHash(plainUserId, hashedUserId) {
    return bcrypt.compareSync(plainUserId, hashedUserId);  // Returns true if the hashes match
  }
  

module.exports = {
    createUserHash,
    compareUserHash
};
