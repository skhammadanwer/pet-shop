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
        petTemplate.find('.btn-view-vaccinations').attr('data-id', data[i].id);
        petTemplate.find('.btn-add-vaccination').attr('data-id', data[i].id);
        petTemplate.find('.btn-save-vaccination').attr('data-id', data[i].id);
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

      await App.checkAdmin(accounts[0]);

    } catch (error) {
      console.error('Error requesting accounts:', error);
    }
  },

checkAdmin: async function(account) {
  try {
    
    var adoptionInstance =
      await App.contracts.Adoption.deployed();

    var admin =
      await adoptionInstance.admin.call();

    console.log("Current account:", account);
    console.log("Admin account:", admin);

    if (
      account.toLowerCase() ===
      admin.toLowerCase()
    ) {

      console.log("Admin detected.");

      $('.btn-add-vaccination').show();

    } else {

      console.log("Regular user detected.");

      $('.btn-add-vaccination').hide();

    }

  } catch (error) {

      console.error(
        "Error checking admin:",
        error
      );

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
    $(document).on('click', '.btn-view-vaccinations', App.handleViewVaccinations);
    $(document).on('click', '.btn-add-vaccination', App.handleShowVaccinationForm);
    $(document).on('click', '.btn-save-vaccination', App.handleSaveVaccination);
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
        button
          .prop('disabled', false)
          .text('Save Vaccination');
        return;
      }

      if (!accounts || accounts.length === 0) {
        console.log('No accounts available. Make sure MetaMask is connected.');
        button
          .prop('disabled', false)
          .text('Save Vaccination');
        
        var message = petCard.find('.vaccination-message');

        message
          .removeClass('alert-success')
          .addClass('alert alert-danger')
          .html('✕ Please connect MetaMask first.')
          .show();

        setTimeout(function() {
          message.fadeOut();
        }, 3000);

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
  },

  // Because blockchain is designed to provide an immutable history. 
  // Vaccination records should be append-only instead of editable or removable.
  // So we plan to just implement View vaccination and Add vaccination
  loadVaccinationRecords: async function(petId, petCard) {
    var historyContainer = petCard.find('.vaccination-history');
    var adoptionInstance;

    console.log("Loading vaccination records for pet:", petId);

    historyContainer
      .show()
      .html('<p>Loading...</p>');

    try {

      adoptionInstance =
        await App.contracts.Adoption.deployed();

      var count =
        await adoptionInstance.getVaccinationCount.call(petId);

      var vaccinationCount =
        parseInt(count.toString());

      console.log(
        "Vaccination count:",
        vaccinationCount
      );

      if (vaccinationCount === 0) {

        historyContainer.html(
          '<p>No vaccination records found.</p>'
        );

        return;
      }

      var records = [];

      // Read all vaccination records from blockchain
      for (var i = 0; i < vaccinationCount; i++) {

        var record =
          await adoptionInstance
            .getVaccinationRecord
            .call(petId, i);

        records.push({
          vaccineName: record[0],
          vaccinationDate: record[1],
          clinicName: record[2]
        });
      }

      // Sort by vaccination date: newest first
      records.sort(function(a, b) {
        return new Date(b.vaccinationDate) - new Date(a.vaccinationDate);
      });

      var html =
        '<h4>Vaccination History</h4>';

      for (var j = 0; j < records.length; j++) {

        var record = records[j];

        html +=
          '<div class="well well-sm vaccination-record">' +

            '<p><strong>💉 ' +
            record.vaccineName +
            '</strong></p>' +

            '<p>📅 ' +
            new Date(record.vaccinationDate).toLocaleDateString(
              'en-CA',
              {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }
            ) +
            '</p>' +

            '<p>🏥 ' +
            record.clinicName +
            '</p>' +

          '</div>';
      }

      historyContainer.html(html);

    } catch (err) {

      console.log(err.message);

      historyContainer.html(
        '<p>Error loading vaccination records.</p>'
      );
    }
  },

  handleViewVaccinations: async function(event) {
    event.preventDefault();
    var button = $(event.currentTarget);
    var petCard = button.closest('.panel-pet');
    var historyContainer = petCard.find('.vaccination-history');
    var petId = parseInt(button.data('id'));

    // If records are currently visible, hide them
    if (
      historyContainer.is(':visible') &&
      historyContainer.html().trim() !== ''
    ) {
      historyContainer.hide();
      button.text('View Records');
      return;
    }

    // Otherwise load and show records
    await App.loadVaccinationRecords(petId, petCard);

    button.text('Hide Records');
  },

  handleShowVaccinationForm: function(event) {
    event.preventDefault();
    var button = $(event.currentTarget);

    var form = button
      .closest('.panel-pet')
      .find('.vaccination-form');

    form.toggle();

    if (form.is(':visible')) {
      button.text('✕ Close');
    } else {
      button.text('+ Add Vaccination');
    }
  },

  handleSaveVaccination: function(event) {
    event.preventDefault();
    var button = $(event.currentTarget);
    var petCard = button.closest('.panel-pet');
    var petId = parseInt(button.data('id'));
    var vaccineName = petCard
      .find('.vaccine-name')
      .val()
      .trim();
    var vaccinationDate = petCard
      .find('.vaccine-date')
      .val();
    var clinicName = petCard
      .find('.clinic-name')
      .val()
      .trim();

    // console.log("Pet ID:", petId);
    // console.log("Vaccine:", vaccineName);
    // console.log("Date:", vaccinationDate);
    // console.log("Clinic:", clinicName);
    
    // Basic validation
    if (
      vaccineName === '' ||
      vaccinationDate === '' ||
      clinicName === ''
    ) {
      //alert('Please complete all vaccination fields.');
      var message = petCard.find('.vaccination-message');

      message
        .removeClass('alert-success')
        .addClass('alert alert-danger')
        .html('✕ Please complete all vaccination fields.')
        .show();

      setTimeout(function() {
        message.fadeOut();
      }, 3000);

      return;
    }
    
    var selectedDate = new Date(vaccinationDate);
    var today = new Date();

    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate > today) {

      var message = petCard.find('.vaccination-message');

      message
        .removeClass('alert-success')
        .addClass('alert alert-danger')
        .html('✕ Vaccination date cannot be in the future.')
        .show();

      setTimeout(function() {
        message.fadeOut();
      }, 3000);

      return;
    }

    button
      .prop('disabled', true)
      .text('Saving...');

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

      App.contracts.Adoption.deployed()
        .then(function(instance) {

          return instance.addVaccinationRecord(
            petId,
            vaccineName,
            vaccinationDate,
            clinicName,
            {
              from: account
            }
          );

        })
        .then(async function(result) {
          console.log(
            'Vaccination record saved:',
            result
          );

          // alert('Vaccination record saved successfully.');
          var message = petCard.find('.vaccination-message')
          message
            .removeClass('alert-danger')
            .addClass('alert alert-success')
            .html('✓ Vaccination record saved successfully.')
            .show();
          
          setTimeout(function() {
            message.fadeOut();
          }, 3000);

          // Clear the form
          petCard.find('.vaccine-name').val('');
          petCard.find('.vaccine-date').val('');
          petCard.find('.clinic-name').val('');

          // Hide the form
          petCard.find('.vaccination-form').hide();

          // Change button text back
          petCard
            .find('.btn-add-vaccination')
            .text('+ Add Vaccination');
          
          button
            .prop('disabled', false)
            .text('Save Vaccination');

          // Automatically refresh vaccination records
          await App.loadVaccinationRecords(petId, petCard);

          petCard
            .find('.btn-view-vaccinations')
            .text('Hide Records');
        })
        .catch(function(err) {
          console.log(err.message);

          button
            .prop('disabled', false)
            .text('Save Vaccination');

          // alert(
          //   'Could not save vaccination record. ' +
          //   err.message
          // );
          var message = petCard.find('.vaccination-message');
          
          var errorMessage;

          if (
            err.message &&
            err.message.includes("User denied")
          ) {

            errorMessage =
              '⚠ Transaction cancelled by user.';

          } else {

            errorMessage =
              '✕ Could not save vaccination record.';

          }

          message
            .removeClass('alert-success')
            .addClass('alert alert-danger')
            .html(errorMessage)
            .show();

          setTimeout(function() {
            message.fadeOut();
          }, 4000);

        });

    });
  },

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
