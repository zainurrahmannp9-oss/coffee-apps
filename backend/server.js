const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

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

    let coins = user.coins + 50;
    let xp = user.xp + 20;
    let level = user.level;

    if (xp >= 100) {
      level++;
      xp = 0;
    }

    db.query(
      'UPDATE users SET coins=?, xp=?, level=? WHERE id=?',
      [coins, xp, level, user.id],
      () => {
        db.query('SELECT * FROM users WHERE id=?', [user.id], (err, data) => {
          res.json(data[0]);
        });
      }
    );
  });
});

// IDLE
app.post('/idle', (req, res) => {
  db.query('SELECT * FROM users LIMIT 1', (err, result) => {
    let user = result[0];

    let now = new Date();
    let last = new Date(user.lastLogin);
    let diff = Math.floor((now - last) / 1000);
    let reward = diff * 2;

    let coins = user.coins + reward;

    db.query(
      'UPDATE users SET coins=?, lastLogin=? WHERE id=?',
      [coins, now, user.id],
      () => {
        res.json({ reward });
      }
    );
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on ${PORT}`));