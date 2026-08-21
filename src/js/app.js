App = {
  web3Provider: null,
  contracts: {},

  init: async function() {
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
        petTemplate.find('.btn-return').attr('data-id', data[i].id);

        petsRow.append(petTemplate.html());
      }
    });

    return await App.initWeb3();
  },

  initWeb3: async function() {
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
    } else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    } else {
      App.web3Provider = new Web3.providers.HttpProvider(
        'http://localhost:7545'
      );
    }

    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

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

      App.markAdopted();
    } catch (error) {
      console.error('Error requesting accounts:', error);
    }
  },

  initContract: function() {
    $.getJSON('Adoption.json', function(data) {
      var AdoptionArtifact = data;

      App.contracts.Adoption = TruffleContract(AdoptionArtifact);

      App.contracts.Adoption.setProvider(App.web3Provider);

      App.markAdopted();
    });

    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-adopt', App.handleAdopt);
    $(document).on('click', '.btn-return', App.handleReturn);
    $(document).on('click', '#connectButton', App.connectWallet);

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', function() {
        App.markAdopted();
      });
    }
  },

  markAdopted: function() {
    var adoptionInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
        return;
      }

      var currentAccount = null;

      if (accounts && accounts.length > 0) {
        currentAccount = accounts[0].toLowerCase();
      }

      App.contracts.Adoption
        .deployed()
        .then(function(instance) {
          adoptionInstance = instance;

          return adoptionInstance.getAdopters.call();
        })
        .then(function(adopters) {
          for (var i = 0; i < adopters.length; i++) {
            var petPanel = $('.panel-pet').eq(i);

            var adoptButton = petPanel.find('.btn-adopt');
            var returnButton = petPanel.find('.btn-return');

            var adopter = adopters[i].toLowerCase();

            var emptyAddress =
              '0x0000000000000000000000000000000000000000';

            if (adopter === emptyAddress) {
              adoptButton
                .text('Adopt')
                .attr('disabled', false);

              returnButton
                .text('Return Pet')
                .attr('disabled', true);
            } else if (
              currentAccount &&
              adopter === currentAccount
            ) {
              adoptButton
                .text('Adopted')
                .attr('disabled', true);

              returnButton
                .text('Return Pet (0.01 ETH)')
                .attr('disabled', false);
            } else {
              adoptButton
                .text('Adopted')
                .attr('disabled', true);

              returnButton
                .text('Return Pet')
                .attr('disabled', true);
            }
          }
        })
        .catch(function(err) {
          console.log(err.message);
        });
    });
  },

  handleAdopt: function(event) {
    event.preventDefault();

    var petId = parseInt(
      $(event.target).data('id')
    );

    var adoptionInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
        return;
      }

      if (!accounts || accounts.length === 0) {
        alert('Please connect MetaMask first.');
        return;
      }

      var account = accounts[0];

      App.contracts.Adoption
        .deployed()
        .then(function(instance) {
          adoptionInstance = instance;

          return adoptionInstance.adopt(
            petId,
            {
              from: account
            }
          );
        })
        .then(function(result) {
          console.log(
            'Pet adopted successfully:',
            result
          );

          return App.markAdopted();
        })
        .catch(function(err) {
          console.log(err.message);

          alert(
            'Adoption failed. Check MetaMask or the browser console.'
          );
        });
    });
  },

  handleReturn: function(event) {
    event.preventDefault();

    var petId = parseInt(
      $(event.target).data('id')
    );

    var adoptionInstance;

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
        return;
      }

      if (!accounts || accounts.length === 0) {
        alert('Please connect MetaMask first.');
        return;
      }

      var account = accounts[0];

      App.contracts.Adoption
        .deployed()
        .then(function(instance) {
          adoptionInstance = instance;

          return adoptionInstance.returnPet(
            petId,
            {
              from: account,
              value: web3.toWei(0.01, 'ether')
            }
          );
        })
        .then(function(result) {
          console.log(
            'Pet returned successfully:',
            result
          );

          alert(
            'Pet returned successfully. Return fee: 0.01 ETH.'
          );

          return App.markAdopted();
        })
        .catch(function(err) {
          console.log(err.message);

          alert(
            'Return failed. Make sure you are the adopter and have enough ETH for the fee.'
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