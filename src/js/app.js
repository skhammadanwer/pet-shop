App = {
  web3Provider: null,
  contracts: {},

  init: async function() {
    // Load pets from pets.json and render cards
    $.getJSON('../pets.json', function(data) {
      var petsRow = $('#petsRow');
      var petTemplate = $('#petTemplate');

      for (var i = 0; i < data.length; i++) {
        petTemplate.find('.panel-title').text(data[i].name);
        petTemplate.find('img').attr('src', data[i].picture);
        petTemplate.find('.pet-breed').text(data[i].breed);
        petTemplate.find('.pet-age').text(data[i].age);
        petTemplate.find('.pet-location').text(data[i].location);
        petTemplate.find('.btn-adopt').attr('data-id', data[i].id);

        petsRow.append(petTemplate.html());
      }
    });

    return await App.initWeb3();
  },

  initWeb3: async function() {
    // Modern dapp browsers
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
    }
    // Legacy dapp browsers
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }
    // Fallback to Ganache (local)
    else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }

    // Initialize web3 with the provider
    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  // Explicit user-initiated connection to MetaMask
  connectWallet: async function() {
    if (!window.ethereum) {
      alert('MetaMask is not available in this browser.');
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      console.log('Connected account:', accounts[0]);

      var btn = document.getElementById('connectButton');
      if (btn && accounts && accounts[0]) {
        btn.textContent =
          'Connected: ' +
          accounts[0].slice(0, 6) +
          '...' +
          accounts[0].slice(-4);
      }
    } catch (error) {
      console.error('Error requesting accounts:', error);
    }
  },

  initContract: function() {
    $.getJSON('Adoption.json', function(data) {
      var AdoptionArtifact = data;
      App.contracts.Adoption = TruffleContract(AdoptionArtifact);

      // Set the provider for our contract
      App.contracts.Adoption.setProvider(App.web3Provider);

      // Mark already adopted pets
      return App.markAdopted();
    });

    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-adopt', App.handleAdopt);
    $(document).on('click', '#connectButton', App.connectWallet);
  },

  markAdopted: function(adopters, account) {
    var adoptionInstance;

    App.contracts.Adoption.deployed()
      .then(function(instance) {
        adoptionInstance = instance;
        return adoptionInstance.getAdopters.call();
      })
      .then(function(adopters) {
        for (var i = 0; i < adopters.length; i++) {
          if (adopters[i] !== '0x0000000000000000000000000000000000000000') {
            $('.panel-pet').eq(i).find('button').text('Success').attr('disabled', true);
          }
        }
      })
      .catch(function(err) {
        console.log(err.message);
      });
  },

  handleAdopt: function(event) {
    event.preventDefault();

    var petId = parseInt($(event.target).data('id'));
    var adoptionInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
        return;
      }

      if (!accounts || accounts.length === 0) {
        console.log('No accounts available. Make sure MetaMask is connected.');
        return;
      }

      var account = accounts[0];

      App.contracts.Adoption.deployed()
        .then(function(instance) {
          adoptionInstance = instance;

          // Execute adopt as a transaction by sending from the selected account
          return adoptionInstance.adopt(petId, { from: account });
        })
        .then(function(result) {
          return App.markAdopted();
        })
        .catch(function(err) {
          console.log(err.message);
        });
    });
  }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
