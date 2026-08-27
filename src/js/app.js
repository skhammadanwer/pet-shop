App = {
  web3Provider: null,
  contracts: {},

  init: async function() {
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

      // Draw the shop from what is actually on chain
      return App.loadPets();
    });

    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-adopt', App.handleAdopt);
    $(document).on('click', '#connectButton', App.connectWallet);
    $(document).on('click', '#addPetButton', App.handleAddPet);
  },

  // Read every pet out of the contract and render the cards
  loadPets: function() {
    var adoptionInstance;

    return App.contracts.Adoption.deployed()
      .then(function(instance) {
        adoptionInstance = instance;
        return adoptionInstance.getPetCount.call();
      })
      .then(function(count) {
        var total = count.toNumber();
        var requests = [];

        for (var i = 0; i < total; i++) {
          requests.push(adoptionInstance.pets.call(i));
        }

        return Promise.all(requests);
      })
      .then(function(pets) {
        var petsRow = $('#petsRow');
        var petTemplate = $('#petTemplate');

        // Rebuild from scratch so a newly added pet shows up
        petsRow.empty();

        for (var i = 0; i < pets.length; i++) {
          // Struct getter returns: name, breed, age, location, picture
          petTemplate.find('.panel-title').text(pets[i][0]);
          petTemplate.find('.pet-breed').text(pets[i][1]);
          petTemplate.find('.pet-age').text(pets[i][2].toString());
          petTemplate.find('.pet-location').text(pets[i][3]);
          petTemplate.find('img').attr('src', pets[i][4]);
          petTemplate.find('.btn-adopt').attr('data-id', i);

          petsRow.append(petTemplate.html());
        }

        return App.markAdopted();
      })
      .catch(function(err) {
        console.log(err.message);
      });
  },

  markAdopted: function() {
    var adoptionInstance;

    return App.contracts.Adoption.deployed()
      .then(function(instance) {
        adoptionInstance = instance;
        return adoptionInstance.getAdopters.call();
      })
      .then(function(adopters) {
        for (var i = 0; i < adopters.length; i++) {
          if (adopters[i] !== '0x0000000000000000000000000000000000000000') {
            $('.panel-pet').eq(i).find('.btn-adopt').text('Success').attr('disabled', true);
          }
        }
      })
      .catch(function(err) {
        console.log(err.message);
      });
  },

  // Send a new pet to the contract
  handleAddPet: function(event) {
    event.preventDefault();

    var name = $('#petName').val().trim();
    var breed = $('#petBreed').val().trim();
    var age = parseInt($('#petAge').val(), 10);
    var location = $('#petLocation').val().trim();
    var picture = $('#petPicture').val().trim();

    if (!name) {
      alert('Give the pet a name.');
      return;
    }

    if (isNaN(age) || age < 0) {
      age = 0;
    }

    if (!picture) {
      picture = 'images/golden-retriever.jpeg';
    }

    var button = $('#addPetButton');

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
        return;
      }

      if (!accounts || accounts.length === 0) {
        alert('No accounts available. Connect MetaMask first.');
        return;
      }

      var account = accounts[0];

      button.text('Adding...').attr('disabled', true);

      App.contracts.Adoption.deployed()
        .then(function(instance) {
          return instance.addPet(name, breed, age, location, picture, { from: account });
        })
        .then(function(result) {
          console.log('addPet transaction:', result.tx);

          $('#petName, #petBreed, #petAge, #petLocation, #petPicture').val('');

          return App.loadPets();
        })
        .catch(function(err) {
          console.log(err.message);
        })
        .then(function() {
          button.text('Add Pet').attr('disabled', false);
        });
    });
  },

  handleAdopt: function(event) {
    event.preventDefault();

    var petId = parseInt($(event.target).data('id'));

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
          // Execute adopt as a transaction by sending from the selected account
          return instance.adopt(petId, { from: account });
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
