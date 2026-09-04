module.exports = {
    token: '',
    clientId: '',
    prefix: '!',                      
  
    // Oyun Ayarları
    startingBudget: 50000000,
    maxTrainingPerDay: 2,
    trainingGainMin: 1,
    trainingGainMax: 3,
    formBase: 50,
    formPerTraining: 2,
    formMin: 20,
    formMax: 100,
  
    // Nitelikler
    attributes: ['sut', 'pas', 'defans', 'hiz', 'fizik', 'top_kontrolu'],
  
    // Renkler
    colors: {
      success: 0x00FF00,
      error: 0xFF0000,
      info: 0x0099FF,
      warning: 0xFFD700,
      primary: 0x5865F2
    },

    roles: {
      kayitYetkilisi: '',
      baskan: '',
      td: '',
      serbest: ''
    } 
  
  
  
  };