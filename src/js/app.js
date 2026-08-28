App = {
  web3Provider: null,
  contracts: {},
  pets: [],
  selectedBreed: 'all',
  selectedStatus: 'all',
  showMyPetsOnly: false,
  adopters: null,
  currentAccount: null,
  emptyAddress: '0x0000000000000000000000000000000000000000',

  init: async function() {
    return await App.initWeb3();
  },

  truncateAddress: function(address, emptyLabel) {
    if (!address || address === App.emptyAddress) {
      return emptyLabel || 'Available';
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

  loadPets: function() {
    if (!App.contracts.Adoption) {
      return Promise.resolve();
    }

    var adoptionInstance;

    return App.contracts.Adoption.deployed()
      .then(function(instance) {
        adoptionInstance = instance;
        return adoptionInstance.getPetCount.call();
      })
      .then(function(count) {
        var total = count.toNumber ? count.toNumber() : Number(count);
        var requests = [];

        for (var i = 0; i < total; i++) {
          requests.push(adoptionInstance.pets.call(i));
        }

        return Promise.all(requests);
      })
      .then(function(pets) {
        App.pets = pets.map(function(pet, index) {
          var age = pet[2];
          if (age && typeof age.toNumber === 'function') {
            age = age.toNumber();
          }

          return {
            id: index,
            name: pet[0],
            breed: pet[1],
            age: age,
            location: pet[3],
            picture: pet[4]
          };
        });

        App.renderBreedFilters();
        return App.renderPets();
      })
      .catch(function(err) {
        console.log(err.message);
      });
  },

  renderBreedFilters: function() {
    var counts = {};
    for (var i = 0; i < App.pets.length; i++) {
      var breed = App.pets[i].breed || 'Unknown';
      counts[breed] = (counts[breed] || 0) + 1;
    }

    if (App.selectedBreed !== 'all' && !counts[App.selectedBreed]) {
      App.selectedBreed = 'all';
    }

    var $container = $('#breedFilters');
    $container.empty();

    var breeds = Object.keys(counts).sort();
    var buttons = [{ breed: 'all', label: 'All (' + App.pets.length + ')' }].concat(
      breeds.map(function(breed) {
        return { breed: breed, label: breed + ' (' + counts[breed] + ')' };
      })
    );

    for (var j = 0; j < buttons.length; j++) {
      var isSelected = buttons[j].breed === App.selectedBreed;
      var btnClass = isSelected ? 'btn btn-primary' : 'btn btn-default';
      $container.append(
        '<button type="button" class="' + btnClass + ' btn-breed-filter" data-breed="' +
          buttons[j].breed +
          '" style="margin: 0 4px 8px;">' +
          buttons[j].label +
        '</button>'
      );
    }
  },

  renderPets: function() {
    if (!App.contracts.Adoption) {
      App.drawPetCards(App.getFilteredPets());
      return;
    }

    App.contracts.Adoption.deployed()
      .then(function(instance) {
        return instance.getAdopters.call();
      })
      .then(function(adopters) {
        App.adopters = adopters;
        return App.resolveCurrentAccount();
      })
      .then(function() {
        App.drawPetCards(App.getFilteredPets());
        if (App.currentAccount) {
          return App.checkAdmin(App.currentAccount);
        }
      })
      .catch(function(err) {
        console.log(err.message);
      });
  },

  resolveCurrentAccount: function() {
    return new Promise(function(resolve) {
      web3.eth.getAccounts(function(error, accounts) {
        App.currentAccount = null;
        if (!error && accounts && accounts.length > 0) {
          App.currentAccount = accounts[0].toLowerCase();
        }
        App.updateMyPetsToggle();
        resolve();
      });
    });
  },

  getFilteredPets: function() {
    var adopters = App.adopters;

    return App.pets.filter(function(pet) {
      if (App.selectedBreed !== 'all' && pet.breed !== App.selectedBreed) {
        return false;
      }

      if (adopters) {
        var owner = adopters[pet.id];
        var isOwned = owner && owner !== App.emptyAddress;

        if (App.selectedStatus === 'available' && isOwned) {
          return false;
        }

        if (App.selectedStatus === 'adopted' && !isOwned) {
          return false;
        }

        if (App.showMyPetsOnly) {
          if (!App.currentAccount) {
            return false;
          }
          if (!isOwned || owner.toLowerCase() !== App.currentAccount) {
            return false;
          }
        }
      }

      return true;
    });
  },

  drawPetCards: function(filtered) {
    var petsRow = $('#petsRow');
    var petTemplate = $('#petTemplate');
    petsRow.empty();

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
      petTemplate.find('.btn-view-vaccinations').attr('data-id', filtered[i].id).text('View Records');
      petTemplate.find('.btn-add-vaccination').attr('data-id', filtered[i].id).text('+ Add Vaccination').hide();
      petTemplate.find('.btn-save-vaccination').attr('data-id', filtered[i].id);
      petTemplate.find('.vaccination-form').hide();
      petTemplate.find('.vaccination-message').hide().text('');
      petTemplate.find('.vaccination-history').hide().empty();

      petsRow.append(petTemplate.html());
    }

    if (filtered.length === 0) {
      var emptyMessage = 'No pets match these filters.';
      if (App.showMyPetsOnly && !App.currentAccount) {
        emptyMessage = 'Connect your wallet to see your pets.';
      }
      petsRow.append(
        '<div class="col-xs-12 text-center"><p class="text-muted">' + emptyMessage + '</p></div>'
      );
    }

    var countLabel = filtered.length === 1
      ? 'Showing 1 pet'
      : 'Showing ' + filtered.length + ' pets';
    $('#filterCount').text(countLabel);

    App.markAdopted();
  },

  updateMyPetsToggle: function() {
    var $toggle = $('#myPetsToggle');
    var $hint = $('#myPetsHint');

    if (App.showMyPetsOnly) {
      $toggle.removeClass('btn-default').addClass('btn-primary').text('My pets only (on)');
    } else {
      $toggle.removeClass('btn-primary').addClass('btn-default').text('My pets only');
    }

    if (App.showMyPetsOnly && !App.currentAccount) {
      $hint.show();
    } else {
      $hint.hide();
    }
  },

  initWeb3: async function() {
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
    } else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    } else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
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

      await App.checkAdmin(accounts[0]);
      App.renderPets();
    } catch (error) {
      console.error('Error requesting accounts:', error);
    }
  },

  checkAdmin: async function(account) {
    try {
      var adoptionInstance = await App.contracts.Adoption.deployed();
      var admin = await adoptionInstance.admin.call();

      if (account.toLowerCase() === admin.toLowerCase()) {
        $('.btn-add-vaccination').show();
      } else {
        $('.btn-add-vaccination').hide();
      }
    } catch (error) {
      console.error('Error checking admin:', error);
    }
  },

  initContract: function() {
    $.getJSON('Adoption.json', function(data) {
      var AdoptionArtifact = data;
      App.contracts.Adoption = TruffleContract(AdoptionArtifact);
      App.contracts.Adoption.setProvider(App.web3Provider);
      return App.loadPets();
    });

    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-adopt', App.handleAdopt);
    $(document).on('click', '.btn-transfer', App.handleTransfer);
    $(document).on('click', '#connectButton', App.connectWallet);
    $(document).on('click', '#addPetButton', App.handleAddPet);
    $(document).on('click', '.btn-breed-filter', App.handleBreedFilter);
    $(document).on('click', '.btn-status-filter', App.handleStatusFilter);
    $(document).on('click', '#myPetsToggle', App.handleMyPetsToggle);
    $(document).on('click', '.btn-view-vaccinations', App.handleViewVaccinations);
    $(document).on('click', '.btn-add-vaccination', App.handleShowVaccinationForm);
    $(document).on('click', '.btn-save-vaccination', App.handleSaveVaccination);
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

  handleStatusFilter: function(event) {
    event.preventDefault();

    App.selectedStatus = $(event.target).attr('data-status');

    $('.btn-status-filter')
      .removeClass('btn-primary')
      .addClass('btn-default');
    $(event.target)
      .removeClass('btn-default')
      .addClass('btn-primary');

    App.renderPets();
  },

  handleMyPetsToggle: function(event) {
    event.preventDefault();

    App.showMyPetsOnly = !App.showMyPetsOnly;
    App.renderPets();
  },

  showAddPetMessage: function(message, isError) {
    var $message = $('#addPetMessage');
    $message
      .toggleClass('text-danger', !!isError)
      .toggleClass('text-muted', !isError)
      .text(message)
      .show();
  },

  handleAddPet: function(event) {
    event.preventDefault();

    var name = $('#petName').val().trim();
    var breed = $('#petBreed').val().trim();
    var age = parseInt($('#petAge').val(), 10);
    var location = $('#petLocation').val().trim();
    var picture = $('#petPicture').val().trim();
    var button = $('#addPetButton');

    if (!name) {
      App.showAddPetMessage('Give the pet a name.', true);
      return;
    }

    if (isNaN(age) || age < 0) {
      age = 0;
    }

    if (!picture) {
      picture = 'images/eagle.JPG';
    }

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        App.showAddPetMessage(error.message || 'Could not read wallet accounts.', true);
        return;
      }

      if (!accounts || accounts.length === 0) {
        App.showAddPetMessage('Connect your wallet first.', true);
        return;
      }

      var account = accounts[0];

      button.text('Adding...').attr('disabled', true);
      App.showAddPetMessage('Submitting transaction...', false);

      App.contracts.Adoption.deployed()
        .then(function(instance) {
          return instance.addPet(name, breed, age, location, picture, { from: account });
        })
        .then(function() {
          $('#petName, #petBreed, #petAge, #petLocation, #petPicture').val('');
          App.showAddPetMessage('Pet added to the shop.', false);
          return App.loadPets();
        })
        .catch(function(err) {
          App.showAddPetMessage(err.message || 'Could not add pet.', true);
        })
        .then(function() {
          button.text('Add Pet').attr('disabled', false);
        });
    });
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
            '<li>' + App.truncateAddress(owners[i], 'Returned') + (when ? ' · ' + when : '') + '</li>'
          );
        }
      });
  },

  markAdopted: function() {
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
        App.adopters = adopters;

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
          return instance.adopt(petId, { from: account });
        })
        .then(function(result) {
          return App.renderPets();
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
          return App.renderPets();
        })
        .catch(function(err) {
          App.showPanelError(
            $panel,
            err.message || 'Transfer failed. Only the current owner can transfer this pet.'
          );
        });
    });
  },

  loadVaccinationRecords: async function(petId, petCard) {
    var historyContainer = petCard.find('.vaccination-history');

    historyContainer.show().html('<p>Loading...</p>');

    try {
      var adoptionInstance = await App.contracts.Adoption.deployed();
      var count = await adoptionInstance.getVaccinationCount.call(petId);
      var vaccinationCount = parseInt(count.toString());

      if (vaccinationCount === 0) {
        historyContainer.html('<p>No vaccination records found.</p>');
        return;
      }

      var records = [];

      for (var i = 0; i < vaccinationCount; i++) {
        var record = await adoptionInstance.getVaccinationRecord.call(petId, i);
        records.push({
          vaccineName: record[0],
          vaccinationDate: record[1],
          clinicName: record[2]
        });
      }

      records.sort(function(a, b) {
        return new Date(b.vaccinationDate) - new Date(a.vaccinationDate);
      });

      var html = '<h4>Vaccination History</h4>';

      for (var j = 0; j < records.length; j++) {
        var r = records[j];
        html +=
          '<div class="well well-sm vaccination-record">' +
            '<p><strong>' + r.vaccineName + '</strong></p>' +
            '<p>' + new Date(r.vaccinationDate).toLocaleDateString('en-CA', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }) + '</p>' +
            '<p>' + r.clinicName + '</p>' +
          '</div>';
      }

      historyContainer.html(html);
    } catch (err) {
      console.log(err.message);
      historyContainer.html('<p>Error loading vaccination records.</p>');
    }
  },

  handleViewVaccinations: async function(event) {
    event.preventDefault();
    var button = $(event.currentTarget);
    var petCard = button.closest('.panel-pet');
    var historyContainer = petCard.find('.vaccination-history');
    var petId = parseInt(button.data('id'));

    if (historyContainer.is(':visible') && historyContainer.html().trim() !== '') {
      historyContainer.hide();
      button.text('View Records');
      return;
    }

    await App.loadVaccinationRecords(petId, petCard);
    button.text('Hide Records');
  },

  handleShowVaccinationForm: function(event) {
    event.preventDefault();
    var button = $(event.currentTarget);
    var form = button.closest('.panel-pet').find('.vaccination-form');

    form.toggle();

    if (form.is(':visible')) {
      button.text('Close');
    } else {
      button.text('+ Add Vaccination');
    }
  },

  handleSaveVaccination: function(event) {
    event.preventDefault();
    var button = $(event.currentTarget);
    var petCard = button.closest('.panel-pet');
    var petId = parseInt(button.data('id'));
    var vaccineName = petCard.find('.vaccine-name').val().trim();
    var vaccinationDate = petCard.find('.vaccine-date').val();
    var clinicName = petCard.find('.clinic-name').val().trim();
    var message = petCard.find('.vaccination-message');

    if (vaccineName === '' || vaccinationDate === '' || clinicName === '') {
      message
        .removeClass('alert-success')
        .addClass('alert alert-danger')
        .html('Please complete all vaccination fields.')
        .show();
      setTimeout(function() { message.fadeOut(); }, 3000);
      return;
    }

    var selectedDate = new Date(vaccinationDate);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
      message
        .removeClass('alert-success')
        .addClass('alert alert-danger')
        .html('Vaccination date cannot be in the future.')
        .show();
      setTimeout(function() { message.fadeOut(); }, 3000);
      return;
    }

    button.prop('disabled', true).text('Saving...');

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        button.prop('disabled', false).text('Save Vaccination');
        return;
      }

      if (!accounts || accounts.length === 0) {
        alert('Please connect MetaMask first.');
        button.prop('disabled', false).text('Save Vaccination');
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
            { from: account }
          );
        })
        .then(async function(result) {
          message
            .removeClass('alert-danger')
            .addClass('alert alert-success')
            .html('Vaccination record saved successfully.')
            .show();

          setTimeout(function() { message.fadeOut(); }, 3000);

          petCard.find('.vaccine-name').val('');
          petCard.find('.vaccine-date').val('');
          petCard.find('.clinic-name').val('');
          petCard.find('.vaccination-form').hide();
          petCard.find('.btn-add-vaccination').text('+ Add Vaccination');
          button.prop('disabled', false).text('Save Vaccination');

          await App.loadVaccinationRecords(petId, petCard);
          petCard.find('.btn-view-vaccinations').text('Hide Records');
        })
        .catch(function(err) {
          console.log(err.message);
          button.prop('disabled', false).text('Save Vaccination');

          var errorMessage = err.message && err.message.includes('User denied')
            ? 'Transaction cancelled by user.'
            : 'Could not save vaccination record.';

          message
            .removeClass('alert-success')
            .addClass('alert alert-danger')
            .html(errorMessage)
            .show();

          setTimeout(function() { message.fadeOut(); }, 4000);
        });
    });
  }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
