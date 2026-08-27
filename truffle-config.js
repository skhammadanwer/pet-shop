const path = require("path");

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*"
    },
    develop: {
      port: 8545,
      network_id: "*"
    }
  },

  compilers: {
    solc: {
      version: path.resolve(__dirname, "custom-solc-0.5.16", "index.js"),
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
};