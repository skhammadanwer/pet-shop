App = {
  web3Provider: null,
  contracts: {},
  pets: [],
  selectedBreed: 'all',
  emptyAddress: '0x0000000000000000000000000000000000000000',

  init: async function() {
    // Load pets from pets.json and render cards
    $.getJSON('../pets.json', function(data) {
      App.pets = data;
      App.renderPets();
    });

    return await App.initWeb3();
  },

  truncateAddress: function(address) {
    if (!address || address === App.emptyAddress) {
      return 'Available';
    }
    return address.slice(0, 6) + '...' + address.slice(-4);
  },

  isAddress: function(value) {
    if (!value) {
      return false;
    }
    if (web3.utils && web3.utils.isAddress) {
      return web3.utils.isAddress(value);
    }
    if (web3.isAddress) {
      return web3.isAddress(value);
    }
    return /^0x[0-9a-fA-F]{40}$/.test(value);
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
      petTemplate.find('.pet-owner').text('Available');
      petTemplate.find('.pet-history').html('<li class="text-muted">None yet</li>');
      petTemplate.find('.pet-transfer-address').val('');
      petTemplate.find('.pet-transfer-error').hide().text('');
      petTemplate.find('.btn-adopt').attr('data-id', filtered[i].id).text('Adopt').attr('disabled', false);
      petTemplate.find('.btn-transfer').attr('data-id', filtered[i].id);

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
    $(document).on('click', '.btn-transfer', App.handleTransfer);
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

  showPanelError: function($panel, message) {
    $panel.find('.pet-transfer-error').text(message).show();
  },

  loadHistory: function(adoptionInstance, $panel, petId) {
    return adoptionInstance.getHistory.call(petId)
      .then(function(result) {
        var owners = result[0];
        var timestamps = result[1];
        var $list = $panel.find('.pet-history');
        $list.empty();

        if (!owners || owners.length === 0) {
          $list.append('<li class="text-muted">None yet</li>');
          return;
        }

        for (var i = 0; i < owners.length; i++) {
          var ts = timestamps[i];
          if (ts && typeof ts.toNumber === 'function') {
            ts = ts.toNumber();
          } else {
            ts = Number(ts);
          }
          var when = isNaN(ts) ? '' : new Date(ts * 1000).toLocaleString();
          $list.append(
            '<li>' + App.truncateAddress(owners[i]) + (when ? ' · ' + when : '') + '</li>'
          );
        }
      });
  },

  markAdopted: function(adopters, account) {
    if (!App.contracts.Adoption) {
      return;
    }

    var adoptionInstance;

    App.contracts.Adoption.deployed()
      .then(function(instance) {
        adoptionInstance = instance;
        return adoptionInstance.getAdopters.call();
      })
      .then(function(adopters) {
        $('.panel-pet').each(function() {
          var $panel = $(this);
          var petId = parseInt($panel.find('.btn-adopt').attr('data-id'), 10);
          var owner = adopters[petId];
          var isOwned = owner && owner !== App.emptyAddress;

          $panel.find('.pet-owner').text(
            isOwned ? App.truncateAddress(owner) : 'Available'
          );

          if (isOwned) {
            $panel.find('.btn-adopt').text('Success').attr('disabled', true);
          } else {
            $panel.find('.btn-adopt').text('Adopt').attr('disabled', false);
          }

          App.loadHistory(adoptionInstance, $panel, petId);
        });
      })
      .catch(function(err) {
        console.log(err.message);
      });
  },

  handleAdopt: function(event) {
    event.preventDefault();

    var $btn = $(event.target);
    var $panel = $btn.closest('.panel-pet');
    var petId = parseInt($btn.attr('data-id'), 10);
    var adoptionInstance;

    $panel.find('.pet-transfer-error').hide().text('');

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        App.showPanelError($panel, error.message || 'Could not read wallet accounts.');
        return;
      }

      if (!accounts || accounts.length === 0) {
        App.showPanelError($panel, 'No accounts available. Make sure MetaMask is connected.');
        return;
      }

      var account = accounts[0];

      App.contracts.Adoption.deployed()
        .then(function(instance) {
          adoptionInstance = instance;
          return adoptionInstance.adopt(petId, { from: account });
        })
        .then(function(result) {
          return App.markAdopted();
        })
        .catch(function(err) {
          App.showPanelError($panel, err.message || 'Adoption failed.');
        });
    });
  },

  handleTransfer: function(event) {
    event.preventDefault();

    var $btn = $(event.target);
    var $panel = $btn.closest('.panel-pet');
    var petId = parseInt($btn.attr('data-id'), 10);
    var newOwner = ($panel.find('.pet-transfer-address').val() || '').trim();
    var $err = $panel.find('.pet-transfer-error');
    $err.hide().text('');

    if (!App.isAddress(newOwner)) {
      App.showPanelError($panel, 'Enter a valid wallet address.');
      return;
    }

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        App.showPanelError($panel, error.message || 'Could not read wallet accounts.');
        return;
      }

      if (!accounts || accounts.length === 0) {
        App.showPanelError($panel, 'No accounts available. Make sure MetaMask is connected.');
        return;
      }

      var account = accounts[0];

      App.contracts.Adoption.deployed()
        .then(function(instance) {
          return instance.transfer(petId, newOwner, { from: account });
        })
        .then(function(result) {
          $panel.find('.pet-transfer-address').val('');
          return App.markAdopted();
        })
        .catch(function(err) {
          App.showPanelError(
            $panel,
            err.message || 'Transfer failed. Only the current owner can transfer this pet.'
          );
        });
    });
  }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
