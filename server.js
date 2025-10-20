// Get all users (admin only)
app.get('/api/admin/users', (req, res) => {
    try {
        if (!req.session.userId) {
            returnapp.get('/api/user/achievements', (req, res) => {
    try {
        if (!req.session.userId) {
            return res// ==========================================
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
    'tannerkurrasch@gmail.com',
    'kurraschgamingmerchstore@gmail.com',
    'gamekillerszone@gmail.com'// ADD YOUR ADMIN EMAIL HERE
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
        // STARTER ACHIEVEMENTS
        'annie_hall': { id: 'annie_hall', name: 'Annie Hall', description: 'Play your first game', icon: '🎬', xp_reward: 10, coins_reward: 5, film: '1977 - Academy Award Winner' },
        'first_steps': { id: 'first_steps', name: 'First Steps', description: 'Create your arcade profile', icon: '👣', xp_reward: 5, coins_reward: 5, film: 'Welcome to the Arcade' },
        'coffee_break': { id: 'coffee_break', name: 'Coffee Break', description: 'Play 5 games', icon: '☕', xp_reward: 25, coins_reward: 10, film: "Diane's Favorite Beverage" },
        
        // LEVEL ACHIEVEMENTS
        'godfather': { id: 'godfather', name: 'The Godfather', description: 'Reach Level 10', icon: '👑', xp_reward: 50, coins_reward: 25, film: '1972 - Classic Mob Film' },
        'godfather_2': { id: 'godfather_2', name: 'The Godfather Part II', description: 'Reach Level 20', icon: '🎭', xp_reward: 75, coins_reward: 35, film: '1974 - Epic Sequel' },
        'manhattan': { id: 'manhattan', name: 'Manhattan', description: 'Reach Level 25', icon: '🏙️', xp_reward: 100, coins_reward: 50, film: '1979 - Woody Allen Classic' },
        'marvins_room': { id: 'marvins_room', name: "Marvin's Room", description: 'Reach Level 50', icon: '🏠', xp_reward: 250, coins_reward: 100, film: '1996 - Drama with Meryl Streep' },
        'century': { id: 'century', name: 'Century Club', description: 'Reach Level 100', icon: '💯', xp_reward: 500, coins_reward: 250, film: 'Elite Status' },
        
        // SCORE ACHIEVEMENTS
        'something_gotta_give': { id: 'something_gotta_give', name: "Something's Gotta Give", description: 'Score 10,000 points total', icon: '💎', xp_reward: 100, coins_reward: 50, film: '2003 - Romantic Comedy' },
        'big_score': { id: 'big_score', name: 'Big Score', description: 'Score 50,000 points total', icon: '💰', xp_reward: 200, coins_reward: 100, film: 'High Roller' },
        'mega_score': { id: 'mega_score', name: 'Mega Score', description: 'Score 100,000 points total', icon: '🌟', xp_reward: 300, coins_reward: 150, film: 'Score Master' },
        'legendary': { id: 'legendary', name: 'Legendary', description: 'Score 1,000,000 points total', icon: '👑', xp_reward: 1000, coins_reward: 500, film: 'Arcade Legend' },
        
        // GAME COMPLETION
        'reds': { id: 'reds', name: 'Reds', description: 'Earn 20 achievements', icon: '⭐', xp_reward: 150, coins_reward: 75, film: '1981 - Epic Historical Drama' },
        'first_wives_club': { id: 'first_wives_club', name: 'First Wives Club', description: 'Complete all games', icon: '💪', xp_reward: 500, coins_reward: 250, film: '1996 - Comedy Classic' },
        'father_bride': { id: 'father_bride', name: 'Father of the Bride', description: 'Play 100 games', icon: '👰', xp_reward: 300, coins_reward: 150, film: '1991 - Family Comedy' },
        'father_bride_2': { id: 'father_bride_2', name: 'Father of the Bride Part II', description: 'Play 200 games', icon: '👶', xp_reward: 400, coins_reward: 200, film: '1995 - Family Sequel' },
        'baby_boom': { id: 'baby_boom', name: 'Baby Boom', description: 'Win 5 games in one day', icon: '🍼', xp_reward: 75, coins_reward: 35, film: '1987 - Comedy Hit' },
        
        // EXPLORATION
        'manhattan_murder': { id: 'manhattan_murder', name: 'Manhattan Murder Mystery', description: 'Try all 20 games', icon: '🔍', xp_reward: 125, coins_reward: 60, film: '1993 - Mystery Comedy' },
        'sleeper': { id: 'sleeper', name: 'Sleeper', description: 'Play for 24 hours total', icon: '😴', xp_reward: 200, coins_reward: 100, film: '1973 - Sci-Fi Comedy' },
        'interiors': { id: 'interiors', name: 'Interiors', description: 'Customize your profile theme', icon: '🖼️', xp_reward: 50, coins_reward: 25, film: '1978 - Bergman-esque Drama' },
        'night_owl': { id: 'night_owl', name: 'Night Owl', description: 'Play between midnight and 6 AM', icon: '🦉', xp_reward: 50, coins_reward: 25, film: 'Late Night Gaming' },
        'morning_glory': { id: 'morning_glory', name: 'Morning Glory', description: 'Play before 8 AM', icon: '🌅', xp_reward: 50, coins_reward: 25, film: '2010 - Comedy Drama' },
        
        // PERSISTENCE
        'love_death': { id: 'love_death', name: 'Love and Death', description: 'Lose 100 times but keep playing', icon: '💀', xp_reward: 50, coins_reward: 25, film: '1975 - Philosophical Comedy' },
        'play_again_sam': { id: 'play_again_sam', name: 'Play It Again, Sam', description: 'Replay a game 10 times', icon: '🎭', xp_reward: 100, coins_reward: 50, film: '1972 - Romantic Comedy' },
        'never_give_up': { id: 'never_give_up', name: 'Never Give Up', description: 'Play 7 days in a row', icon: '🔥', xp_reward: 150, coins_reward: 75, film: 'Dedication' },
        'town_country': { id: 'town_country', name: 'Town & Country', description: 'Play in 2 different locations', icon: '🌆', xp_reward: 75, coins_reward: 35, film: '2001 - Comedy' },
        
        // PERFECTION
        'shoot_moon': { id: 'shoot_moon', name: 'Shoot the Moon', description: 'Get a perfect score on any game', icon: '🌙', xp_reward: 300, coins_reward: 150, film: '1982 - Family Drama' },
        'flawless': { id: 'flawless', name: 'Flawless Victory', description: 'Win without losing once', icon: '✨', xp_reward: 200, coins_reward: 100, film: 'Perfect Performance' },
        'speed_demon': { id: 'speed_demon', name: 'Speed Demon', description: 'Complete a game in under 5 minutes', icon: '⚡', xp_reward: 150, coins_reward: 75, film: 'Lightning Fast' },
        'radio_days': { id: 'radio_days', name: 'Radio Days', description: 'Play for 10 hours straight', icon: '📻', xp_reward: 250, coins_reward: 125, film: '1987 - Nostalgic Comedy' },
        
        // SOCIAL
        'good_mother': { id: 'good_mother', name: 'The Good Mother', description: 'Add 50 friends', icon: '✨', xp_reward: 150, coins_reward: 75, film: '1988 - Drama' },
        'social_butterfly': { id: 'social_butterfly', name: 'Social Butterfly', description: 'Add 5 friends', icon: '🦋', xp_reward: 100, coins_reward: 50, film: 'Community Member' },
        'helpful': { id: 'helpful', name: 'Helpful Friend', description: 'Help 10 friends', icon: '🤝', xp_reward: 75, coins_reward: 35, film: 'Supporting Others' },
        'hanging_up': { id: 'hanging_up', name: 'Hanging Up', description: 'Chat with 25 players', icon: '📞', xp_reward: 100, coins_reward: 50, film: '2000 - Family Comedy' },
        'book_club': { id: 'book_club', name: 'Book Club', description: 'Join 5 gaming groups', icon: '📚', xp_reward: 125, coins_reward: 60, film: '2018 - Comedy' },
        
        // SPECIFIC GAMES
        'mars_miner': { id: 'mars_miner', name: 'Mars Miner', description: 'Score 50,000 in MotherLoad', icon: '⛏️', xp_reward: 100, coins_reward: 50, film: 'Martian Master' },
        'unicorn_master': { id: 'unicorn_master', name: 'Unicorn Master', description: 'Score 100,000 in Robot Unicorn Attack', icon: '🦄', xp_reward: 150, coins_reward: 75, film: 'Always Believe' },
        'zombie_hunter': { id: 'zombie_hunter', name: 'Zombie Hunter', description: 'Complete all Earn to Die games', icon: '🧟', xp_reward: 200, coins_reward: 100, film: 'Apocalypse Survivor' },
        'quick_draw': { id: 'quick_draw', name: 'Quick Draw', description: 'Win 10 Gun Blood duels', icon: '🔫', xp_reward: 125, coins_reward: 60, film: 'Western Legend' },
        'raft_champion': { id: 'raft_champion', name: 'Raft Champion', description: 'Beat both Raft Wars games', icon: '🚣', xp_reward: 150, coins_reward: 75, film: 'Treasure Defender' },
        
        // COLLECTION
        'collector': { id: 'collector', name: 'Collector', description: 'Unlock 10 achievements', icon: '📚', xp_reward: 75, coins_reward: 35, film: 'Achievement Hunter' },
        'hoarder': { id: 'hoarder', name: 'Hoarder', description: 'Collect 10,000 coins', icon: '💰', xp_reward: 150, coins_reward: 75, film: 'Wealthy Player' },
        'millionaire': { id: 'millionaire', name: 'Millionaire', description: 'Collect 1,000,000 coins', icon: '💎', xp_reward: 500, coins_reward: 250, film: 'Rich Beyond Measure' },
        
        // TIME-BASED
        'weekend_warrior': { id: 'weekend_warrior', name: 'Weekend Warrior', description: 'Play on Saturday and Sunday', icon: '🎮', xp_reward: 50, coins_reward: 25, film: 'Weekend Fun' },
        'marathon': { id: 'marathon', name: 'Marathon Runner', description: 'Play for 6 hours straight', icon: '🏃', xp_reward: 200, coins_reward: 100, film: 'Endurance Champion' },
        'daily_player': { id: 'daily_player', name: 'Daily Player', description: 'Play 30 days in a row', icon: '📅', xp_reward: 300, coins_reward: 150, film: 'Committed Gamer' },
        'five_easy_pieces': { id: 'five_easy_pieces', name: 'Five Easy Pieces', description: 'Win 5 games in a row', icon: '🎲', xp_reward: 125, coins_reward: 60, film: '1970 - Drama Classic' },
        
        // RARE
        'lucky_seven': { id: 'lucky_seven', name: 'Lucky Seven', description: 'Get exactly 7777 points', icon: '🎰', xp_reward: 250, coins_reward: 125, film: 'Jackpot!' },
        'easter_egg': { id: 'easter_egg', name: 'Easter Egg Hunter', description: 'Find 10 hidden secrets', icon: '🥚', xp_reward: 200, coins_reward: 100, film: 'Secret Finder' },
        'diane_fan': { id: 'diane_fan', name: 'Diane Keaton Fan', description: 'View all Diane Keaton info', icon: '💜', xp_reward: 100, coins_reward: 50, film: 'True Fan' },
        'other_sister': { id: 'other_sister', name: 'The Other Sister', description: 'Help a friend unlock an achievement', icon: '👭', xp_reward: 100, coins_reward: 50, film: '1999 - Drama Comedy' },
        
        // COMPETITIVE
        'top_ten': { id: 'top_ten', name: 'Top Ten', description: 'Reach top 10 on any leaderboard', icon: '🏆', xp_reward: 200, coins_reward: 100, film: 'Elite Player' },
        'top_three': { id: 'top_three', name: 'Top Three', description: 'Reach top 3 on any leaderboard', icon: '🥉', xp_reward: 300, coins_reward: 150, film: 'Podium Finish' },
        'number_one': { id: 'number_one', name: 'Number One', description: 'Reach #1 on any leaderboard', icon: '🥇', xp_reward: 500, coins_reward: 250, film: 'Champion' },
        'mad_money': { id: 'mad_money', name: 'Mad Money', description: 'Earn 100,000 XP', icon: '💵', xp_reward: 300, coins_reward: 150, film: '2008 - Heist Comedy' },
        
        // SPECIAL
        'early_bird': { id: 'early_bird', name: 'Early Bird', description: 'Join in the first month', icon: '🐦', xp_reward: 100, coins_reward: 50, film: 'Pioneer' },
        'veteran': { id: 'veteran', name: 'Veteran', description: 'Account 1 year old', icon: '🎖️', xp_reward: 500, coins_reward: 250, film: 'Long-time Player' },
        'completionist': { id: 'completionist', name: 'Completionist', description: 'Unlock ALL achievements', icon: '👑', xp_reward: 1000, coins_reward: 500, film: 'Master of the Arcade' },
        
        // MORE DIANE KEATON FILMS
        'looking_goodbar': { id: 'looking_goodbar', name: 'Looking for Mr. Goodbar', description: 'Play all candy games', icon: '🍫', xp_reward: 100, coins_reward: 50, film: '1977 - Drama' },
        'running_mates': { id: 'running_mates', name: 'Running Mates', description: 'Race in 5 games', icon: '🏃', xp_reward: 75, coins_reward: 35, film: '1992 - TV Movie' },
        'mrs_soffel': { id: 'mrs_soffel', name: 'Mrs. Soffel', description: 'Help 25 friends', icon: '🚗', xp_reward: 125, coins_reward: 60, film: '1984 - Historical Drama' },
        'because_said_so': { id: 'because_said_so', name: 'Because I Said So', description: 'Customize your profile fully', icon: '🎀', xp_reward: 50, coins_reward: 25, film: '2007 - Rom-Com' },
        'family_stone': { id: 'family_stone', name: 'The Family Stone', description: 'Play during holidays', icon: '💍', xp_reward: 100, coins_reward: 50, film: '2005 - Holiday Film' },
        'little_drummer_girl': { id: 'little_drummer_girl', name: 'The Little Drummer Girl', description: 'Get 100 perfect rhythm hits', icon: '🥁', xp_reward: 150, coins_reward: 75, film: '1984 - Thriller' },
        'mamas_boy': { id: 'mamas_boy', name: "Mama's Boy", description: 'Achieve a 100 game streak', icon: '👩', xp_reward: 200, coins_reward: 100, film: '2007 - Comedy' },
        'amelia': { id: 'amelia', name: 'Amelia', description: 'Reach 1000 games played', icon: '✈️', xp_reward: 300, coins_reward: 150, film: '2009 - Historical Drama' },
        'finding_dory': { id: 'finding_dory', name: 'Finding Dory', description: 'Find all hidden Easter eggs', icon: '🐠', xp_reward: 250, coins_reward: 125, film: '2016 - Voice Acting' },
        'poms': { id: 'poms', name: 'Poms', description: 'Join a team competition', icon: '📣', xp_reward: 150, coins_reward: 75, film: '2019 - Sports Comedy' },
        'loves_labours_lost': { id: 'loves_labours_lost', name: "Love's Labour's Lost", description: 'Fail a game but try again', icon: '🎪', xp_reward: 50, coins_reward: 25, film: '2000 - Musical' },
        'hampstead': { id: 'hampstead', name: 'Hampstead', description: 'Play in different game modes', icon: '🏡', xp_reward: 100, coins_reward: 50, film: '2017 - Romantic Comedy' },
        'crossing_delancey': { id: 'crossing_delancey', name: 'Crossing Delancey', description: 'Cross 50,000 points', icon: '🥖', xp_reward: 150, coins_reward: 75, film: '1988 - Romantic Comedy' },
        'wildflower': { id: 'wildflower', name: 'Wildflower', description: 'Get a random achievement', icon: '🌸', xp_reward: 75, coins_reward: 35, film: '1991 - TV Movie' },
        'and_so_it_goes': { id: 'and_so_it_goes', name: 'And So It Goes', description: 'Complete the tutorial', icon: '🎵', xp_reward: 25, coins_reward: 10, film: '2014 - Romantic Comedy' },
        'ninja_turtles': { id: 'ninja_turtles', name: 'Ninja Turtles', description: 'Beat a boss level', icon: '🐢', xp_reward: 200, coins_reward: 100, film: '2016 - Voice Role' },
        'china_syndrome': { id: 'china_syndrome', name: 'The China Syndrome', description: 'Survive a difficult challenge', icon: '☢️', xp_reward: 175, coins_reward: 85, film: '1979 - Referenced Film' },
        'wines_roses': { id: 'wines_roses', name: 'Wines and Roses', description: 'Celebrate 100 wins', icon: '🍷', xp_reward: 200, coins_reward: 100, film: 'Victory Celebration' },
        'crimes_heart': { id: 'crimes_heart', name: 'Crimes of the Heart', description: 'Form a guild with friends', icon: '❤️', xp_reward: 150, coins_reward: 75, film: '1986 - Drama' },
        'ladies_night': { id: 'ladies_night', name: "Ladies' Night", description: 'Play with 3 friends simultaneously', icon: '👯', xp_reward: 125, coins_reward: 60, film: 'Social Gaming' },
        'reunion': { id: 'reunion', name: 'The Reunion', description: 'Return after 30 days away', icon: '🎊', xp_reward: 150, coins_reward: 75, film: 'Welcome Back!' },
        'unstrung_heroes': { id: 'unstrung_heroes', name: 'Unstrung Heroes', description: 'Unlock 25 achievements', icon: '🦸', xp_reward: 200, coins_reward: 100, film: '1995 - Drama' },
        'godmothered': { id: 'godmothered', name: 'Godmothered', description: 'Grant a wish in community', icon: '🧚', xp_reward: 100, coins_reward: 50, film: '2020 - Disney Film' },
        'sextuplets': { id: 'sextuplets', name: 'Sextuplets', description: 'Play 6 different games in one day', icon: '6️⃣', xp_reward: 150, coins_reward: 75, film: 'Multi-Game Master' }
    };
    return allAchievements[achievementId];
}

// Check and award achievements based on user stats
function checkAchievements(userId, users) {
    const user = users[userId];
    const newAchievements = [];
    
    // Annie Hall - First game played
    if (user.total_games_played === 1) {
        const ach = awardAchievement(userId, 'annie_hall');
        if (ach) newAchievements.push(ach);
    }
    
    // Coffee Break - Play 5 games
    if (user.total_games_played === 5) {
        const ach = awardAchievement(userId, 'coffee_break');
        if (ach) newAchievements.push(ach);
    }
    
    // Level achievements
    if (user.level === 10) {
        const ach = awardAchievement(userId, 'godfather');
        if (ach) newAchievements.push(ach);
    }
    if (user.level === 20) {
        const ach = awardAchievement(userId, 'godfather_2');
        if (ach) newAchievements.push(ach);
    }
    if (user.level === 25) {
        const ach = awardAchievement(userId, 'manhattan');
        if (ach) newAchievements.push(ach);
    }
    if (user.level === 50) {
        const ach = awardAchievement(userId, 'marvins_room');
        if (ach) newAchievements.push(ach);
    }
    if (user.level === 100) {
        const ach = awardAchievement(userId, 'century');
        if (ach) newAchievements.push(ach);
    }
    
    // Score achievements
    if (user.total_score >= 10000) {
        const ach = awardAchievement(userId, 'something_gotta_give');
        if (ach) newAchievements.push(ach);
    }
    if (user.total_score >= 50000) {
        const ach = awardAchievement(userId, 'big_score');
        if (ach) newAchievements.push(ach);
    }
    if (user.total_score >= 100000) {
        const ach = awardAchievement(userId, 'mega_score');
        if (ach) newAchievements.push(ach);
    }
    if (user.total_score >= 1000000) {
        const ach = awardAchievement(userId, 'legendary');
        if (ach) newAchievements.push(ach);
    }
    
    // Game completion achievements
    if (user.total_games_played === 100) {
        const ach = awardAchievement(userId, 'father_bride');
        if (ach) newAchievements.push(ach);
    }
    if (user.total_games_played === 200) {
        const ach = awardAchievement(userId, 'father_bride_2');
        if (ach) newAchievements.push(ach);
    }
    if (user.total_games_played === 1000) {
        const ach = awardAchievement(userId, 'amelia');
        if (ach) newAchievements.push(ach);
    }
    
    // Coin achievements
    if (user.coins >= 10000) {
        const ach = awardAchievement(userId, 'hoarder');
        if (ach) newAchievements.push(ach);
    }
    if (user.coins >= 1000000) {
        const ach = awardAchievement(userId, 'millionaire');
        if (ach) newAchievements.push(ach);
    }
    
    // XP achievement
    if (user.xp >= 100000) {
        const ach = awardAchievement(userId, 'mad_money');
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
        
        // Check if old user (before implementation) - give 500 coins
        // New users get 300 coins
        const isOldUser = false; // You can set logic here for detecting old users
        const startingCoins = isOldUser ? 500 : 300;
        
        const newUser = {
            id: userId,
            email,
            username,
            password: hashedPassword,
            level: 1,
            xp: 0,
            coins: startingCoins,
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
        
        // Award "First Steps" achievement (Account Creation)
        awardAchievement(userId, 'first_steps');
        
        // Give achievement rewards
        newUser.xp += 5;
        newUser.coins += 5;
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

        // Redirect to main page (index.html)
        res.json({ success: true, message: 'Account deleted', redirect: '/' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// Change password
app.post('/api/user/password', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { password } = req.body;
        
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const users = loadUsers();
        const user = users[req.session.userId];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        saveUsers(users);

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Failed to change password' });
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

// Save avatar preset (no upload)
app.post('/api/user/avatar-preset', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { avatar_url } = req.body;
        if (!avatar_url) {
            return res.status(400).json({ error: 'Avatar URL required' });
        }

        const users = loadUsers();
        const user = users[req.session.userId];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.avatar_url = avatar_url;
        saveUsers(users);

        res.json({ success: true, avatar_url: user.avatar_url });
    } catch (error) {
        console.error('Avatar preset save error:', error);
        res.status(500).json({ error: 'Failed to save avatar' });
    }
});

// Save banner preset (no upload)
app.post('/api/user/banner-preset', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { banner_url } = req.body;
        if (!banner_url) {
            return res.status(400).json({ error: 'Banner URL required' });
        }

        const users = loadUsers();
        const user = users[req.session.userId];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.banner_url = banner_url;
        saveUsers(users);

        res.json({ success: true, banner_url: user.banner_url });
    } catch (error) {
        console.error('Banner preset save error:', error);
        res.status(500).json({ error: 'Failed to save banner' });
    }
}); uploaded' });
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

// Get all badge applications (admin only)
app.get('/api/admin/applications', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const users = loadUsers();
        const currentUser = users[req.session.userId];

        if (!currentUser || !currentUser.is_admin) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const APPLICATIONS_FILE = path.join(DATA_DIR, 'applications.json');
        let applications = [];
        if (fs.existsSync(APPLICATIONS_FILE)) {
            applications = JSON.parse(fs.readFileSync(APPLICATIONS_FILE, 'utf8'));
        }

        res.json(applications);
    } catch (error) {
        console.error('Admin applications error:', error);
        res.status(500).json({ error: 'Failed to load applications' });
    }
});

// Approve/Reject badge application (admin only)
app.post('/api/admin/applications/:applicationId', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const users = loadUsers();
        const currentUser = users[req.session.userId];

        if (!currentUser || !currentUser.is_admin) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const { applicationId } = req.params;
        const { action, reason } = req.body; // action: 'approve' or 'reject'

        const APPLICATIONS_FILE = path.join(DATA_DIR, 'applications.json');
        let applications = [];
        if (fs.existsSync(APPLICATIONS_FILE)) {
            applications = JSON.parse(fs.readFileSync(APPLICATIONS_FILE, 'utf8'));
        }

        const application = applications.find(app => app.id === applicationId);
        
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        if (action === 'approve') {
            application.status = 'approved';
            application.approved_at = new Date().toISOString();
            application.approved_by = currentUser.username;

            // Grant badge to user
            const user = users[application.user_id];
            if (user) {
                if (!user.badges) {
                    user.badges = [];
                }
                user.badges.push({
                    badge_id: application.item_id,
                    granted_at: new Date().toISOString()
                });
                saveUsers(users);
            }
        } else if (action === 'reject') {
            application.status = 'rejected';
            application.rejected_at = new Date().toISOString();
            application.rejected_by = currentUser.username;
            application.rejection_reason = reason;
        }

        fs.writeFileSync(APPLICATIONS_FILE, JSON.stringify(applications, null, 2));

        res.json({ success: true, message: `Application ${action}ed` });
    } catch (error) {
        console.error('Admin application action error:', error);
        res.status(500).json({ error: 'Failed to process application' });
    }
});

// ==========================================
// COINS SHOP
// ==========================================

// Purchase item
app.post('/api/shop/purchase', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { item_id } = req.body;
        const users = loadUsers();
        const user = users[req.session.userId];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Shop items prices
        const itemPrices = {
            'premium_badge': 5000,
            'founder_badge': 10000,
            'custom_title': 2500,
            'profile_frame': 3000,
            'name_color': 1500,
            'xp_boost': 1000,
            'coin_boost': 2000,
            'name_change': 5000
        };

        const price = itemPrices[item_id];
        
        if (!price) {
            return res.status(400).json({ error: 'Invalid item' });
        }

        if (user.coins < price) {
            return res.status(400).json({ error: 'Not enough coins' });
        }

        // Deduct coins
        user.coins -= price;

        // Add item to user's inventory
        if (!user.inventory) {
            user.inventory = [];
        }
        
        user.inventory.push({
            item_id,
            purchased_at: new Date().toISOString()
        });

        // Apply item effects
        if (item_id === 'xp_boost') {
            user.xp_boost_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        }
        if (item_id === 'coin_boost') {
            user.coin_boost_until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        }

        saveUsers(users);

        res.json({ success: true, message: 'Item purchased!', remaining_coins: user.coins });
    } catch (error) {
        console.error('Purchase error:', error);
        res.status(500).json({ error: 'Failed to purchase item' });
    }
});

// Submit badge application
app.post('/api/shop/apply', (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { item_id, discord_invite, member_count, additional_info } = req.body;
        const users = loadUsers();
        const user = users[req.session.userId];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Load applications
        const APPLICATIONS_FILE = path.join(DATA_DIR, 'applications.json');
        let applications = [];
        if (fs.existsSync(APPLICATIONS_FILE)) {
            applications = JSON.parse(fs.readFileSync(APPLICATIONS_FILE, 'utf8'));
        }

        // Create application
        const application = {
            id: Date.now().toString(),
            user_id: req.session.userId,
            username: user.username,
            email: user.email,
            item_id,
            discord_invite,
            member_count: parseInt(member_count),
            additional_info,
            status: 'pending',
            submitted_at: new Date().toISOString()
        };

        applications.push(application);
        fs.writeFileSync(APPLICATIONS_FILE, JSON.stringify(applications, null, 2));

        res.json({ success: true, message: 'Application submitted!' });
    } catch (error) {
        console.error('Application error:', error);
        res.status(500).json({ error: 'Failed to submit application' });
    }
});

// Get shop items (for reference)
app.get('/api/shop/items', (req, res) => {
    res.json({
        message: 'Shop is open!',
        note: 'Visit /shop.html to browse items'
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
