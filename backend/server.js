const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Auto-migration
const migrations = [
  'ALTER TABLE users ADD COLUMN clickPower INT DEFAULT 50;',
  'ALTER TABLE users ADD COLUMN energy INT DEFAULT 100;',
  'ALTER TABLE users ADD COLUMN maxEnergy INT DEFAULT 100;',
  'ALTER TABLE users ADD COLUMN autoClicker INT DEFAULT 0;'
];
migrations.forEach(q => {
  db.query(q, (err) => {
    // Ignore errors if columns already exist
  });
});

// GET USER
app.get('/user', (req, res) => {
  db.query('SELECT * FROM users LIMIT 1', (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.length === 0) {
      db.query('INSERT INTO users (email) VALUES ("guest")', (err, insertResult) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.query('SELECT * FROM users LIMIT 1', (err, data) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json(data[0]);
        });
      });
    } else {
      res.json(result[0]);
    }
  });
});

// TAP GAME
app.post('/play', (req, res) => {
  db.query('SELECT * FROM users LIMIT 1', (err, result) => {
    let user = result[0];
    
    let energy = user.energy !== null && user.energy !== undefined ? user.energy : 100;
    if (energy <= 0) {
      return res.status(400).json({ error: "Energi habis! Tunggu sebentar." });
    }

    let clickPower = user.clickPower || 50;
    let coins = user.coins + clickPower;
    
    // Dynamic level scaling
    let reqXp = user.level * 100 + ((user.level - 1) * 50);
    let xp = user.xp + 20;
    let level = user.level;

    if (xp >= reqXp) {
      level++;
      xp = 0;
    }

    energy -= 10; // Deduct 10 energy per click

    db.query(
      'UPDATE users SET coins=?, xp=?, level=?, energy=? WHERE id=?',
      [coins, xp, level, energy, user.id],
      () => {
        db.query('SELECT * FROM users WHERE id=?', [user.id], (err, data) => {
          res.json({ user: data[0], clickPower });
        });
      }
    );
  });
});

// TRUE IDLE (CALLED ON STARTUP)
app.post('/idle', (req, res) => {
  db.query('SELECT * FROM users LIMIT 1', (err, result) => {
    let user = result[0];

    let now = new Date();
    let last = new Date(user.lastLogin);
    let diff = Math.floor((now - last) / 1000); // seconds passed
    
    if (diff < 0) diff = 0;
    
    let baseReward = diff * 2;
    let autoClickerLevel = user.autoClicker || 0;
    let clickPower = user.clickPower || 50;
    
    // Auto clicker earns (clickPower / 5) per second offline per level
    let autoClickerReward = diff * Math.floor(clickPower / 5) * autoClickerLevel;
    let totalReward = baseReward + autoClickerReward;
    
    let coins = user.coins + totalReward;

    // Energy regen (1 per second)
    let maxEnergy = user.maxEnergy || 100;
    let currentEnergy = user.energy !== null && user.energy !== undefined ? user.energy : 100;
    let newEnergy = Math.min(maxEnergy, currentEnergy + diff);

    db.query(
      'UPDATE users SET coins=?, lastLogin=?, energy=? WHERE id=?',
      [coins, now, newEnergy, user.id],
      () => {
        res.json({ 
          reward: totalReward, 
          energy: newEnergy,
          diffSeconds: diff 
        });
      }
    );
  });
});

// UPGRADE SHOP
app.post('/upgrade', (req, res) => {
  const { type } = req.body;
  db.query('SELECT * FROM users LIMIT 1', (err, result) => {
    let user = result[0];
    let coins = user.coins;
    let clickPower = user.clickPower || 50;
    let maxEnergy = user.maxEnergy || 100;
    let autoClicker = user.autoClicker || 0;
    
    if (type === 'barista' && coins >= 500) {
      coins -= 500;
      clickPower += 50;
    } else if (type === 'machine' && coins >= 300) {
      coins -= 300;
      maxEnergy += 50;
    } else if (type === 'robot' && coins >= 2000) {
      coins -= 2000;
      autoClicker += 1;
    } else {
      return res.status(400).json({ error: "Koin tidak cukup atau tipe tidak valid" });
    }
    
    db.query(
      'UPDATE users SET coins=?, clickPower=?, maxEnergy=?, autoClicker=? WHERE id=?',
      [coins, clickPower, maxEnergy, autoClicker, user.id],
      () => {
        db.query('SELECT * FROM users WHERE id=?', [user.id], (err, data) => {
          res.json(data[0]);
        });
      }
    );
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on ${PORT}`));