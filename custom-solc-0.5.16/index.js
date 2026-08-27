// index.js
// This file turns your raw soljson file into a proper solc module for Truffle.

const path = require("path");
// The wrapper is part of the solc project. You need the wrapper code available.
const solcWrapper = require("solc/wrapper");  // See notes below
const soljson = require(path.join(__dirname, "soljson-0.5.16.js"));

module.exports = solcWrapper(soljson);