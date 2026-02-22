// utils/generateToken.js
const crypto = require("crypto");

const generateToken = () => {
  return crypto.randomBytes(10).toString("hex");
};

module.exports = generateToken;
