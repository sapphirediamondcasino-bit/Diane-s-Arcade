// ==========================================
// Diane's Arcade - Backend Server (FIXED)
// Internal Data Store (JSON files)
// ==========================================

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Admin emails - Add your admin emails here
const ADMIN_EMAILS = [
    'admin@dianesarcade.com',
    'your-email@example.com' // ADD YOUR ADMIN EMAIL HERE
];

// ==========================================
// MIDDLEWARE SETUP
// ==========================================

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'diane-arcade-secret-key',
    resave: false,
    saveUninitialized: false, // Changed to false - no guest sessions
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'user-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// ==========================================
// DATA STORAGE - LOCAL JSON FILES
// ==========================================

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
const ACHIEVEMENTS_FILE = path.join(DATA_DIR, 'achievements.json');
const FRIENDS_FILE = path.join(DATA_DIR, 'friends.json');

// Ensure data directory exists
function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

// Load data from JSON files
function loadUsers() {
    ensureDataDir();
    if (fs.existsSync(USERS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        } catch (e) {
            console.error('Error loading users:', e);
            return {};
        }
    }
    return {};
}

function loadScores() {
    ensureDataDir();
    if (fs.existsSync(SCORES_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
        } catch (e) {
            console.error('Error loading scores:', e);
            return [];
        }
    }
    return [];
}

function loadAchievements() {
    ensureDataDir();
    if (fs.existsSync(ACHIEVEMENTS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(ACHIEVEMENTS_FILE, 'utf8'));
        } catch (e) {
            console.error('Error loading achievements:', e);
            return {};
        }
    }
    return {};
}

function loadFriends() {
    ensureDataDir();
    if (fs.existsSync(FRIENDS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(FRIENDS_FILE, 'utf8'));
        } catch (e) {
            console.error('Error loading friends:', e);
            return {};
        }
    }
    return {};
}

// Save data to JSON files
function saveUsers(users) {
    ensureDataDir();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function saveScores(scores) {
    ensureDataDir();
    fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
}

function saveAchievements(achievements) {
    ensureDataDir();
    fs.writeFileSync(ACHIEVEMENTS_FILE, JSON.stringify(achievements, null, 2));
}

function saveFriends(friends) {
    ensureDataDir();
    fs.writeFileSync(FRIENDS_FILE, JSON.stringify(friends, null, 2));
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Calculate level from XP
function calculateLevel(xp) {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
}

// Calculate XP needed for next level
function xpForNextLevel(level) {
    return Math.pow(level, 2) * 100;
}

// Format date as "Month Year"
function formatJoinDate(dateString) {
    const date = new Date(dateString);
    const options = { month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Check if user is admin
function isAdmin(email) {
    return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Award achievement to user
function awardAchievement(userId, achievementId) {
    const achievements = loadAchievements();
    if (!achievements[userId]) {
        achievements[userId] = [];
    }
    
    // Check if already unlocked
    if (achievements[userId].some(a => a.achievementId === achievementId)) {
        return null;
    }
    
    // Award achievement
    const achievement = {
        achievementId,
        unlockedAt: new Date().toISOString()
    };
    
    achievements[userId].push(achievement);
    saveAchievements(achievements);
    
    // Get achievement details
    const achDetails = getAchievementDetails(achievementId);
    return achDetails;
}

// Get achievement details
function getAchievementDetails(achievementId) {
    const allAchievements = {
        1: { id: 1, name: 'Account Creation', description: 'Welcome to the arcade!', icon: '🎉', xp_reward: 100, coins_reward: 50 },
        2: { id: 2, name: 'First Score', description: 'Save your first game score', icon: '🎮', xp_reward: 50, coins_reward: 25 },
        3: { id: 3, name: 'Century', description: 'Reach 100 points in a single game', icon: '💯', xp_reward: 100, coins_reward: 50 },
        4: { id: 4, name: 'High Roller', description: 'Reach 500 total points', icon: '🎰', xp_reward: 200, coins_reward: 100 },
        5: { id: 5, name: 'Arcade Master', description: 'Reach level 10', icon: '👑', xp_reward: 500, coins_reward: 250 },
        6: { id: 6, name: 'Persistence', description: 'Play 50 games', icon: '💪', xp_reward: 300, coins_reward: 150 },
        7: { id: 7, name: 'Social Butterfly', description: 'Add 5 friends', icon: '🦋', xp_reward: 150, coins_reward: 75 }
    };
    return allAchievements[achievementId];
}

// Check and award achievements based on user stats
function checkAchievements(userId, users) {
    const user = users[userId];
    const newAchievements = [];
    
    // First Score achievement
    if (user.total_games_played === 1) {
        const ach = awardAchievement(userId, 2);
        if (ach) newAchievements.push(ach);
    }
    
    // High Roller achievement
    if (user.total_score >= 500) {
        const ach = awardAchievement(userId, 4);
        if (ach) newAchievements.push(ach);
    }
    
    // Arcade Master achievement
    if (user.level >= 10) {
        const ach = awardAchievement(userId, 5);
        if (ach) newAchievements.push(ach);
    }
    
    // Persistence achievement
    if (user.total_games_played >= 50) {
        const ach = awardAchievement(userId, 6);
        if (ach) newAchievements.push(ach);
    }
    
    return newAchievements;
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({ error: 'All fields required' });
        }

        const users = loadUsers();

        // Check if user exists
        if (Object.values(users).some(u => u.email === email || u.username === username)) {
            return res.status(400).json({ error: 'Email or username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const userId = Date.now().toString();
        const createdAt = new Date().toISOString();
        const newUser = {
            id: userId,
            email,
            username,
            password: hashedPassword,
            level: 1,
            xp: 0,
            coins: 100, // Starting coins
            total_score: 0,
            total_games_played: 0,
            highest_score: 0,
            avatar_url: null,
            banner_url: null,
            is_admin: isAdmin(email),
            created_at: createdAt,
            join_date: formatJoinDate(createdAt)
        };

        users[userId] = newUser;
        saveUsers(users);
        
        // Award "Account Creation" achievement
        awardAchievement(userId, 1);
        
        // Give achievement rewards
        newUser.xp += 100;
        newUser.coins += 50;
        newUser.level = calculateLevel(newUser.xp);
        saveUsers(users);

        res.json({ success: true, message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const users = loadUsers();
        const user = Object.values(users).find(u => u.email === email);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Set session (NO GUEST ACCOUNTS)
        req.session.userId = user.id;

        // Return user data (without password)
        const { password: _, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out' });
});

// Check auth status
app.get('/api/user', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const users = loadUsers();
    const user = users[req.session.userId];

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
});

// Delete account
app.delete('/api/user/delete', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const userId = req.session.userId;
        const users = loadUsers();

        // Delete user
        delete users[userId];
        saveUsers(users);

        // Delete user's achievements
        const achievements = loadAchievements();
        delete achievements[userId];
        saveAchievements(achievements);

        // Delete user's friend relationships
        const friends = loadFriends();
        delete friends[userId];
        // Remove user from other people's friend lists
        Object.keys(friends).forEach(fId => {
            friends[fId] = friends[fId].filter(f => f.friendId !== userId);
        });
        saveFriends(friends);

        // Destroy session
        req.session.destroy();

        // Send redirect URL
        res.json({ success: true, message: 'Account deleted', redirect: '/login.html' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// ==========================================
// UPLOAD ROUTES
// ==========================================

// Upload avatar
app.post('/api/user/avatar', upload.single('avatar'), (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const users = loadUsers();
        const user = users[req.session.userId];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update avatar URL
        user.avatar_url = `/uploads/${req.file.filename}`;
        saveUsers(users);

        res.json({ success: true, avatar_url: user.avatar_url });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

// Upload banner
app.post('/api/user/banner', upload.single('banner'), (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const users = loadUsers();
        const user = users[req.session.userId];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update banner URL
        user.banner_url = `/uploads/${req.file.filename}`;
        saveUsers(users);

        res.json({ success: true, banner_url: user.banner_url });
    } catch (error) {
        console.error('Banner upload error:', error);
        res.status(500).json({ error: 'Failed to upload banner' });
    }
});

// ==========================================
// GAME ROUTES
// ==========================================

// Save game score
app.post('/api/game/score', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { game_name, score } = req.body;
        const users = loadUsers();
        const user = users[req.session.userId];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user stats
        user.total_score = (user.total_score || 0) + score;
        user.total_games_played = (user.total_games_played || 0) + 1;
        user.highest_score = Math.max(user.highest_score || 0, score);

        // Calculate XP gain and level
        const xpGain = Math.floor(score / 10);
        user.xp = (user.xp || 0) + xpGain;
        user.level = calculateLevel(user.xp);

        saveUsers(users);

        // Check for new achievements
        const newAchievements = checkAchievements(req.session.userId, users);
        
        // Award coins and XP from achievements
        if (newAchievements.length > 0) {
            newAchievements.forEach(ach => {
                user.xp += ach.xp_reward;
                user.coins = (user.coins || 0) + ach.coins_reward;
            });
            user.level = calculateLevel(user.xp);
            saveUsers(users);
        }

        // Save score record
        const scores = loadScores();
        scores.push({
            userId: req.session.userId,
            username: user.username,
            game_name,
            score,
            timestamp: new Date().toISOString()
        });
        saveScores(scores);

        res.json({ 
            success: true, 
            message: 'Score saved', 
            xp_gained: xpGain,
            new_achievements: newAchievements,
            current_level: user.level,
            current_xp: user.xp
        });
    } catch (error) {
        console.error('Score save error:', error);
        res.status(500).json({ error: 'Failed to save score' });
    }
});

// ==========================================
// LEADERBOARD ROUTES
// ==========================================

app.get('/api/leaderboard', (req, res) => {
    try {
        const users = loadUsers();
        const leaderboard = Object.values(users)
            .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
            .slice(0, 50)
            .map(user => ({
                id: user.id,
                username: user.username,
                level: user.level,
                total_score: user.total_score,
                games_played: user.total_games_played,
                avatar_url: user.avatar_url,
                prestige: user.prestige || 0
            }));

        res.json(leaderboard);
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to load leaderboard' });
    }
});

// ==========================================
// USER PROFILE ROUTES
// ==========================================

app.get('/api/user/profile/:userId', (req, res) => {
    try {
        const users = loadUsers();
        const user = users[req.params.userId];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user achievements
        const achievements = loadAchievements();
        const userAchievements = achievements[req.params.userId] || [];

        const { password: _, ...profile } = user;
        profile.achievements_unlocked = userAchievements.length;
        profile.total_achievements = 7; // Total available achievements
        profile.total_games = user.total_games_played;

        res.json(profile);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to load profile' });
    }
});

// ==========================================
// ACHIEVEMENTS ROUTES
// ==========================================

app.get('/api/user/achievements', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const achievements = loadAchievements();
        const userAchievements = achievements[req.session.userId] || [];

        // Return all achievements with unlock status
        const allAchievements = [
            { id: 1, name: 'Account Creation', description: 'Welcome to the arcade!', icon: '🎉', xp_reward: 100, coins_reward: 50 },
            { id: 2, name: 'First Score', description: 'Save your first game score', icon: '🎮', xp_reward: 50, coins_reward: 25 },
            { id: 3, name: 'Century', description: 'Reach 100 points in a single game', icon: '💯', xp_reward: 100, coins_reward: 50 },
            { id: 4, name: 'High Roller', description: 'Reach 500 total points', icon: '🎰', xp_reward: 200, coins_reward: 100 },
            { id: 5, name: 'Arcade Master', description: 'Reach level 10', icon: '👑', xp_reward: 500, coins_reward: 250 },
            { id: 6, name: 'Persistence', description: 'Play 50 games', icon: '💪', xp_reward: 300, coins_reward: 150 },
            { id: 7, name: 'Social Butterfly', description: 'Add 5 friends', icon: '🦋', xp_reward: 150, coins_reward: 75 }
        ];

        const achievementsWithStatus = allAchievements.map(ach => {
            const unlocked = userAchievements.find(ua => ua.achievementId === ach.id);
            return {
                ...ach,
                unlocked: !!unlocked,
                unlocked_at: unlocked ? unlocked.unlockedAt : null
            };
        });

        res.json(achievementsWithStatus);
    } catch (error) {
        console.error('Achievements error:', error);
        res.status(500).json({ error: 'Failed to load achievements' });
    }
});

// ==========================================
// FRIEND SYSTEM ROUTES
// ==========================================

// Send friend request
app.post('/api/friends/request', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { friendId } = req.body;
        
        // Prevent adding yourself
        if (friendId === req.session.userId) {
            return res.status(400).json({ error: 'You cannot add yourself as a friend' });
        }

        const users = loadUsers();
        const friends = loadFriends();

        // Check if friend exists
        if (!users[friendId]) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Initialize friend lists
        if (!friends[req.session.userId]) {
            friends[req.session.userId] = [];
        }
        if (!friends[friendId]) {
            friends[friendId] = [];
        }

        // Check if already friends
        if (friends[req.session.userId].some(f => f.friendId === friendId)) {
            return res.status(400).json({ error: 'Already friends or request pending' });
        }

        // Add friend request
        friends[req.session.userId].push({
            friendId,
            status: 'pending',
            requestedAt: new Date().toISOString()
        });

        friends[friendId].push({
            friendId: req.session.userId,
            status: 'pending_incoming',
            requestedAt: new Date().toISOString()
        });

        saveFriends(friends);

        res.json({ success: true, message: 'Friend request sent' });
    } catch (error) {
        console.error('Friend request error:', error);
        res.status(500).json({ error: 'Failed to send friend request' });
    }
});

// Get friends list
app.get('/api/friends', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const friends = loadFriends();
        const users = loadUsers();
        const userFriends = friends[req.session.userId] || [];

        const friendsList = userFriends
            .filter(f => f.status === 'accepted')
            .map(f => {
                const friend = users[f.friendId];
                return friend ? {
                    id: friend.id,
                    username: friend.username,
                    level: friend.level,
                    avatar_url: friend.avatar_url
                } : null;
            })
            .filter(f => f !== null);

        res.json(friendsList);
    } catch (error) {
        console.error('Friends list error:', error);
        res.status(500).json({ error: 'Failed to load friends' });
    }
});

// Remove friend
app.delete('/api/friends/:friendId', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { friendId } = req.params;
        const friends = loadFriends();

        if (friends[req.session.userId]) {
            friends[req.session.userId] = friends[req.session.userId].filter(f => f.friendId !== friendId);
        }

        if (friends[friendId]) {
            friends[friendId] = friends[friendId].filter(f => f.friendId !== req.session.userId);
        }

        saveFriends(friends);

        res.json({ success: true, message: 'Friend removed' });
    } catch (error) {
        console.error('Remove friend error:', error);
        res.status(500).json({ error: 'Failed to remove friend' });
    }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

// Check if user is admin
app.get('/api/admin/check', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const users = loadUsers();
        const user = users[req.session.userId];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ is_admin: user.is_admin || false });
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({ error: 'Failed to check admin status' });
    }
});

// Get all users (admin only)
app.get('/api/admin/users', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const users = loadUsers();
        const currentUser = users[req.session.userId];

        if (!currentUser || !currentUser.is_admin) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const usersList = Object.values(users).map(user => {
            const { password: _, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });

        res.json(usersList);
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Failed to load users' });
    }
});

// ==========================================
// COINS SHOP (Coming Soon)
// ==========================================

app.get('/api/shop/items', (req, res) => {
    res.json({
        message: 'Coming Soon!',
        items: []
    });
});

// ==========================================
// ERROR HANDLING & SERVER START
// ==========================================

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🎮 Diane's Arcade server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    ensureDataDir();
    console.log(`📁 Data directory: ${DATA_DIR}`);
    console.log(`👑 Admin emails: ${ADMIN_EMAILS.join(', ')}`);
});
