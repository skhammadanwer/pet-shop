App = {
  web3Provider: null,
  contracts: {},
  pets: [],
  selectedBreed: 'all',

  init: async function() {
    // Load pets from pets.json and render cards
    $.getJSON('../pets.json', function(data) {
      App.pets = data;
      App.renderPets();
    });

    return await App.initWeb3();
  },

  renderPets: function() {
    var petsRow = $('#petsRow');
    var petTemplate = $('#petTemplate');
    petsRow.empty();

    var filtered = App.pets.filter(function(pet) {
      return App.selectedBreed === 'all' || pet.breed === App.selectedBreed;
    });

    for (var i = 0; i < filtered.length; i++) {
      petTemplate.find('.panel-title').text(filtered[i].name);
      petTemplate.find('img').attr('src', filtered[i].picture);
      petTemplate.find('.pet-breed').text(filtered[i].breed);
      petTemplate.find('.pet-age').text(filtered[i].age);
      petTemplate.find('.pet-location').text(filtered[i].location);
      petTemplate.find('.btn-adopt').attr('data-id', filtered[i].id);

      petsRow.append(petTemplate.html());
    }

    var countLabel = filtered.length === 1
      ? 'Showing 1 pet'
      : 'Showing ' + filtered.length + ' pets';
    $('#filterCount').text(countLabel);

    App.markAdopted();
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
    $(document).on('click', '.btn-breed-filter', App.handleBreedFilter);
  },

  handleBreedFilter: function(event) {
    event.preventDefault();

    App.selectedBreed = $(event.target).attr('data-breed');

    $('.btn-breed-filter')
      .removeClass('btn-primary')
      .addClass('btn-default');
    $(event.target)
      .removeClass('btn-default')
      .addClass('btn-primary');

    App.renderPets();
  },

  markAdopted: function(adopters, account) {
    if (!App.contracts.Adoption) {
      return;
    }

    var adoptionInstance;
    var emptyAddress = '0x0000000000000000000000000000000000000000';

    App.contracts.Adoption.deployed()
      .then(function(instance) {
        adoptionInstance = instance;
        return adoptionInstance.getAdopters.call();
      })
      .then(function(adopters) {
        $('.btn-adopt').each(function() {
          var petId = parseInt($(this).attr('data-id'), 10);
          if (adopters[petId] && adopters[petId] !== emptyAddress) {
            $(this).text('Success').attr('disabled', true);
          }
        });
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
