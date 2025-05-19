// createTestUserHash.js
const bcrypt = require('bcryptjs');

// Hier das gewünschte Passwort für den Testuser eintragen
const plainPassword = '123'; // Ändere das zu deinem gewünschten Testpasswort
const saltRounds = 10; // Dieser Wert sollte konsistent mit deiner API sein (Standard ist oft 10)

bcrypt.hash(plainPassword, saltRounds, function(err, hash) {
  if (err) {
    console.error('Fehler beim Hashen des Passworts:', err);
    return;
  }
  console.log(`Das Klartext-Passwort ist: ${plainPassword}`);
  console.log('----------------------------------------------------------------');
  console.log(`Der generierte Hash (für die Datenbank) ist: ${hash}`);
  console.log('----------------------------------------------------------------');
  console.log('Bitte diesen Hash im nächsten Schritt für den SQL-Befehl verwenden.');
});