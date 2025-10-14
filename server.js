// ==========================================
// FILE 1: server.js - Backend Server
// ==========================================
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database Setup
const db = new sqlite3.Database('./arcade.db');

// Create Tables
db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        google_id TEXT UNIQUE,
        username TEXT NOT NULL,
        avatar_url TEXT,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        prestige INTEGER DEFAULT 0,
        total_games_played INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Game Scores Table
    db.run(`CREATE TABLE IF NOT EXISTS game_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        game_name TEXT NOT NULL,
        score INTEGER NOT NULL,
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Achievements Table
    db.run(`CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        xp_reward INTEGER DEFAULT 100
    )`);

    // User Achievements Table
    db.run(`CREATE TABLE IF NOT EXISTS user_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        achievement_id INTEGER NOT NULL,
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (achievement_id) REFERENCES achievements(id)
    )`);

    // Insert Default Achievements
    const achievements = [
        ['First Steps', 'Play your first game', '🎮', 100],
        ['Getting Started', 'Reach Level 5', '⭐', 200],
        ['Dedicated Player', 'Reach Level 10', '🌟', 500],
        ['High Roller', 'Score 10,000 points in any game', '💯', 300],
        ['Winner', 'Win 10 games', '🏆', 250],
        ['Champion', 'Win 50 games', '👑', 1000],
        ['Master', 'Complete all games at least once', '🎯', 2000],
        ['Century Club', 'Play 100 games', '💯', 500],
        ['Elite', 'Reach Level 25', '💎', 1000],
        ['Legend', 'Reach Level 50', '👑', 2500]
    ];

    const stmt = db.prepare('INSERT OR IGNORE INTO achievements (name, description, icon, xp_reward) VALUES (?, ?, ?, ?)');
    achievements.forEach(achievement => stmt.run(achievement));
    stmt.finalize();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'diane-keaton-arcade-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport Configuration
passport.use(new LocalStrategy(
    { usernameField: 'email' },
    (email, password, done) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
            if (err) return done(err);
            if (!user) return done(null, false, { message: 'Incorrect email.' });
            
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) return done(err);
                if (!isMatch) return done(null, false, { message: 'Incorrect password.' });
                return done(null, user);
            });
        });
    }
));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET',
    callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
    db.get('SELECT * FROM users WHERE google_id = ?', [profile.id], (err, user) => {
        if (err) return done(err);
        
        if (user) {
            return done(null, user);
        } else {
            // Create new user
            const email = profile.emails[0].value;
            const username = profile.displayName;
            const avatar_url = profile.photos[0]?.value;
            
            db.run(
                'INSERT INTO users (email, google_id, username, avatar_url) VALUES (?, ?, ?, ?)',
                [email, profile.id, username, avatar_url],
                function(err) {
                    if (err) return done(err);
                    db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
                        return done(err, newUser);
                    });
                }
            );
        }
    });
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
        done(err, user);
    });
});

// ==========================================
// ROUTES
// ==========================================

// Register with Email
app.post('/api/register', async (req, res) => {
    const { email, password, username } = req.body;
    
    if (!email || !password || !username) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(
            'INSERT INTO users (email, password, username) VALUES (?, ?, ?)',
            [email, hashedPassword, username],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Email already exists' });
                    }
                    return res.status(500).json({ error: 'Registration failed' });
                }
                
                res.json({ 
                    success: true, 
                    message: 'Registration successful!',
                    userId: this.lastID 
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login with Email
app.post('/api/login', passport.authenticate('local'), (req, res) => {
    res.json({ 
        success: true, 
        user: {
            id: req.user.id,
            email: req.user.email,
            username: req.user.username,
            level: req.user.level,
            xp: req.user.xp,
            prestige: req.user.prestige,
            avatar_url: req.user.avatar_url
        }
    });
});

// Google OAuth
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/');
    }
);

// Logout
app.post('/api/logout', (req, res) => {
    req.logout(() => {
        res.json({ success: true });
    });
});

// Get Current User
app.get('/api/user', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    res.json({
        id: req.user.id,
        email: req.user.email,
        username: req.user.username,
        level: req.user.level,
        xp: req.user.xp,
        prestige: req.user.prestige,
        avatar_url: req.user.avatar_url,
        total_games_played: req.user.total_games_played
    });
});

// Save Game Score
app.post('/api/game/score', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { game_name, score } = req.body;
    const user_id = req.user.id;

    db.run(
        'INSERT INTO game_scores (user_id, game_name, score) VALUES (?, ?, ?)',
        [user_id, game_name, score],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to save score' });
            }

            // Update user stats
            db.run(
                'UPDATE users SET total_games_played = total_games_played + 1 WHERE id = ?',
                [user_id]
            );

            // Check for achievements
            checkAchievements(user_id, score);

            res.json({ success: true, scoreId: this.lastID });
        }
    );
});

// Get Leaderboard
app.get('/api/leaderboard', (req, res) => {
    const query = `
        SELECT 
            u.id,
            u.username,
            u.avatar_url,
            u.level,
            u.prestige,
            u.xp,
            SUM(gs.score) as total_score,
            COUNT(gs.id) as games_played
        FROM users u
        LEFT JOIN game_scores gs ON u.id = gs.user_id
        GROUP BY u.id
        ORDER BY u.prestige DESC, u.level DESC, total_score DESC
        LIMIT 100
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to get leaderboard' });
        }
        res.json(rows);
    });
});

// Get User Achievements
app.get('/api/user/achievements', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const query = `
        SELECT 
            a.id,
            a.name,
            a.description,
            a.icon,
            a.xp_reward,
            ua.unlocked_at
        FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
        ORDER BY ua.unlocked_at DESC, a.id ASC
    `;

    db.all(query, [req.user.id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to get achievements' });
        }
        res.json(rows);
    });
});

// Get User Profile
app.get('/api/user/profile/:userId', (req, res) => {
    const userId = req.params.userId;

    const query = `
        SELECT 
            u.*,
            COUNT(DISTINCT gs.id) as total_games,
            COUNT(DISTINCT ua.id) as achievements_unlocked,
            MAX(gs.score) as highest_score
        FROM users u
        LEFT JOIN game_scores gs ON u.id = gs.user_id
        LEFT JOIN user_achievements ua ON u.id = ua.user_id
        WHERE u.id = ?
        GROUP BY u.id
    `;

    db.get(query, [userId], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    });
});

// Helper: Check and unlock achievements
function checkAchievements(userId, score) {
    // Check various achievement conditions
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) return;

        // First game achievement
        if (user.total_games_played === 1) {
            unlockAchievement(userId, 1);
        }

        // Level achievements
        if (user.level === 5) unlockAchievement(userId, 2);
        if (user.level === 10) unlockAchievement(userId, 3);
        if (user.level === 25) unlockAchievement(userId, 9);
        if (user.level === 50) unlockAchievement(userId, 10);

        // Score achievement
        if (score >= 10000) unlockAchievement(userId, 4);

        // Games played achievements
        if (user.total_games_played === 100) unlockAchievement(userId, 8);
    });

    // Check win achievements
    db.get('SELECT COUNT(*) as wins FROM game_scores WHERE user_id = ? AND score > 0', [userId], (err, result) => {
        if (result && result.wins === 10) unlockAchievement(userId, 5);
        if (result && result.wins === 50) unlockAchievement(userId, 6);
    });
}

function unlockAchievement(userId, achievementId) {
    db.run(
        'INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
        [userId, achievementId],
        function(err) {
            if (this.changes > 0) {
                // Give XP reward
                db.get('SELECT xp_reward FROM achievements WHERE id = ?', [achievementId], (err, achievement) => {
                    if (achievement) {
                        db.run('UPDATE users SET xp = xp + ? WHERE id = ?', [achievement.xp_reward, userId]);
                    }
                });
            }
        }
    );
}

// Start Server
app.listen(PORT, () => {
    console.log(`🎮 Diane's Arcade Server running on http://localhost:${PORT}`);
});

// ==========================================
// FILE 2: package.json
// ==========================================

{
  "name": "dianes-arcade",
  "version": "1.0.0",
  "description": "Diane Keaton's Arcade - Retro games with achievements and leaderboards",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "passport": "^0.6.0",
    "passport-local": "^1.0.0",
    "passport-google-oauth20": "^2.0.0",
    "bcrypt": "^5.1.1",
    "sqlite3": "^5.1.6"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
*/
