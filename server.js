require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Email Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER || 'mr.extraterrestrial.alien@gmail.com',
        pass: process.env.GMAIL_PASSWORD || ''
    }
});

// Dev Password Management
let devPassword = null;
let devPasswordGeneration = 0; // Incremented each time a new password is generated
let lastPasswordGenerationTime = 0;
const PASSWORD_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const PASSWORD_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function generateRandomPassword(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'playcounts.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            playCount INTEGER DEFAULT 0,
            lastPlayed DATETIME
        )
    `);
}

// Routes

// Get all songs with play counts
app.get('/api/songs', (req, res) => {
    db.all('SELECT * FROM songs ORDER BY id', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get a single song
app.get('/api/songs/:id', (req, res) => {
    db.get('SELECT * FROM songs WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Song not found' });
            return;
        }
        res.json(row);
    });
});

// Increment play count for a song
app.post('/api/songs/:id/play', (req, res) => {
    const now = new Date().toISOString();
    db.run(
        'UPDATE songs SET playCount = playCount + 1, lastPlayed = ? WHERE id = ?',
        [now, req.params.id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Song not found' });
                return;
            }
            res.json({ success: true, id: req.params.id });
        }
    );
});

// Initialize songs from songList (run once)
app.post('/api/songs/init/:id/:title/:artist', (req, res) => {
    db.run(
        'INSERT OR IGNORE INTO songs (id, title, artist, playCount) VALUES (?, ?, ?, 0)',
        [req.params.id, req.params.title, req.params.artist],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true });
        }
    );
});

// Developer Admin Routes (play count management)
app.post('/api/admin/reset-all', (req, res) => {
    db.run('UPDATE songs SET playCount = 0', function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true, message: 'All play counts reset to 0' });
    });
});

app.post('/api/admin/reset/:id', (req, res) => {
    db.run('UPDATE songs SET playCount = 0 WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Song not found' });
            return;
        }
        res.json({ success: true, message: `Play count for song ${req.params.id} reset to 0` });
    });
});

app.post('/api/admin/set/:id/:count', (req, res) => {
    const count = parseInt(req.params.count);
    if (isNaN(count) || count < 0) {
        res.status(400).json({ error: 'Invalid count value' });
        return;
    }
    db.run('UPDATE songs SET playCount = ? WHERE id = ?', [count, req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Song not found' });
            return;
        }
        res.json({ success: true, message: `Play count for song ${req.params.id} set to ${count}` });
    });
});

// Developer Password Management Routes
app.post('/api/admin/request-password', async (req, res) => {
    const now = Date.now();
    
    // Check if password was recently generated
    if (now - lastPasswordGenerationTime < PASSWORD_COOLDOWN_MS) {
        const remainingTime = Math.ceil((PASSWORD_COOLDOWN_MS - (now - lastPasswordGenerationTime)) / 1000 / 60);
        res.status(429).json({ 
            error: `Password can only be generated every 30 minutes. Try again in ${remainingTime} minute(s).`,
            remainingTime: remainingTime
        });
        return;
    }
    
    // Generate new password - increment generation to invalidate old password
    devPassword = generateRandomPassword();
    devPasswordGeneration++; // Increment to invalidate all old passwords
    lastPasswordGenerationTime = now;
    
    // Send password via email
    const mailOptions = {
        from: 'mr.extraterrestrial.alien@gmail.com',
        to: 'mr.extraterrestrial.alien@gmail.com',
        subject: '_xtraterrestrial Sounds - Dev Panel Password',
        html: `
            <h2>Your Dev Panel Password</h2>
            <p>A new password has been generated for the developer panel.</p>
            <p><strong>Password:</strong> <code style="background: #f0f0f0; padding: 5px 10px; font-family: monospace; font-size: 16px;">${devPassword}</code></p>
            <p><em>This password is valid until a new one is generated.</em></p>
            <p><em>You can request a new password in 30 minutes.</em></p>
        `
    };
    
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('Error sending email:', err);
            console.error('Email config - User:', process.env.GMAIL_USER || 'not set');
            console.error('Email config - Password:', process.env.GMAIL_PASSWORD ? 'set' : 'not set');
            res.status(500).json({ error: 'Failed to send password email: ' + err.message });
            return;
        }
        console.log('Password email sent:', info.response);
        res.json({ 
            success: true, 
            message: 'Password sent to mr.extraterrestrial.alien@gmail.com',
            expiresIn: '24 hours',
            nextRequestIn: '30 minutes'
        });
    });
});

app.post('/api/admin/verify-password', (req, res) => {
    const { password } = req.body;
    
    if (!devPassword) {
        res.status(401).json({ error: 'No password has been generated yet. Request one first.' });
        return;
    }
    
    const now = Date.now();
    
    // Check if password has expired
    if (now - lastPasswordGenerationTime > PASSWORD_EXPIRY_MS) {
        devPassword = null;
        res.status(401).json({ error: 'Password has expired. Request a new one.' });
        return;
    }
    
    // Check if password is current (old passwords from previous generations are rejected)
    if (password === devPassword) {
        res.json({ 
            success: true, 
            message: 'Password verified',
            generation: devPasswordGeneration
        });
    } else {
        res.status(401).json({ error: 'Invalid password or password has been regenerated. Request a new one.' });
    }
});

app.get('/api/admin/password-status', (req, res) => {
    const now = Date.now();
    const hasPassword = devPassword !== null;
    const timeSinceGeneration = now - lastPasswordGenerationTime;
    const canRequestNew = timeSinceGeneration >= PASSWORD_COOLDOWN_MS;
    const minutesUntilNext = Math.ceil((PASSWORD_COOLDOWN_MS - timeSinceGeneration) / 1000 / 60);
    const passwordExpired = hasPassword && timeSinceGeneration > PASSWORD_EXPIRY_MS;
    
    res.json({
        hasPassword: hasPassword && !passwordExpired,
        canRequestNew: canRequestNew,
        minutesUntilNextRequest: canRequestNew ? 0 : minutesUntilNext,
        passwordExpired: passwordExpired,
        generation: devPasswordGeneration
    });
});

// Serve static files
app.use(express.static(__dirname));

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        }
        process.exit(0);
    });
});
