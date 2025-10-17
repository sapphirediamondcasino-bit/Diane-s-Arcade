// ==========================================
// FIXED app.js - Works with deployed backend
// ==========================================

class DianeArcade {
    constructor() {
        this.currentUser = null;
        // Use deployed backend URL or localhost for dev
        this.apiUrl = process.env.API_URL || (window.location.hostname === 'localhost' 
            ? 'http://localhost:3000' 
            : `${window.location.protocol}//${window.location.host}`);
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        this.loadLeaderboard();
    }

    // Check if user is authenticated
    async checkAuth() {
        try {
            const response = await fetch(`${this.apiUrl}/api/user`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                this.currentUser = await response.json();
                this.updateUI();
            } else {
                this.currentUser = null;
                this.showLoginPrompt();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            // Fall back to localStorage if API fails
            this.loadFromLocalStorage();
        }
    }

    // Load from localStorage as fallback
    loadFromLocalStorage() {
        const userData = localStorage.getItem('arcadeUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.updateUI();
        }
    }

    // Update UI based on login state
    updateUI() {
        const userProfileHTML = document.getElementById('user-profile-section');
        const loginBtnHTML = document.getElementById('login-button-section');

        if (this.currentUser) {
            if (loginBtnHTML) loginBtnHTML.style.display = 'none';
            if (userProfileHTML) {
                userProfileHTML.style.display = 'flex';
                userProfileHTML.innerHTML = `
                    <div class="user-profile" onclick="arcade.showProfile()">
                        <img src="${this.currentUser.avatar_url || 'https://via.placeholder.com/30'}" class="user-avatar" alt="Avatar">
                        <div>
                            <div class="user-name">${this.currentUser.username}</div>
                            <div class="user-level">LVL ${this.currentUser.level || 1}</div>
                        </div>
                    </div>
                `;
            }
        } else {
            if (userProfileHTML) userProfileHTML.style.display = 'none';
            if (loginBtnHTML) loginBtnHTML.style.display = 'block';
        }
    }

    // Setup event listeners
    setupEventListeners() {
        const loginBtn = document.getElementById('show-login-modal');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }

        const closeModalBtns = document.querySelectorAll('.close-modal');
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    showLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) modal.classList.add('active');
    }

    showLoginPrompt() {
        const gamesNeedLogin = document.querySelectorAll('[data-requires-login]');
        gamesNeedLogin.forEach(game => {
            game.addEventListener('click', (e) => {
                if (!this.currentUser) {
                    e.preventDefault();
                    this.showLoginModal();
                    this.showNotification('Please login to play games!', 'info');
                }
            });
        });
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.classList.remove('active'));
    }

    // Handle registration
    async handleRegister(e) {
        e.preventDefault();
        
        const form = e.target;
        const email = form.querySelector('[name="email"]')?.value;
        const username = form.querySelector('[name="username"]')?.value;
        const password = form.querySelector('[name="password"]')?.value;

        if (!email || !username || !password) {
            this.showNotification('All fields required!', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/api/register`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Registration successful! Now login.', 'success');
                this.switchToLogin();
                form.reset();
            } else {
                this.showNotification(data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification('Network error. Try again.', 'error');
        }
    }

    // Handle login
    async handleLogin(e) {
        e.preventDefault();
        
        const form = e.target;
        const email = form.querySelector('[name="email"]')?.value;
        const password = form.querySelector('[name="password"]')?.value;

        if (!email || !password) {
            this.showNotification('Email and password required!', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/api/login`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                // Save to localStorage as backup
                localStorage.setItem('arcadeUser', JSON.stringify(this.currentUser));
                this.updateUI();
                this.closeModal();
                this.showNotification('Welcome back, ' + data.user.username + '!', 'success');
                this.loadLeaderboard();
                form.reset();
            } else {
                this.showNotification(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Network error. Try again.', 'error');
        }
    }

    // Logout
    async logout() {
        try {
            await fetch(`${this.apiUrl}/api/logout`, { 
                method: 'POST',
                credentials: 'include'
            });
            this.currentUser = null;
            localStorage.removeItem('arcadeUser');
            this.updateUI();
            this.showNotification('Logged out successfully', 'success');
            window.location.reload();
        } catch (error) {
            this.showNotification('Logout failed', 'error');
        }
    }

    switchToLogin() {
        const registerContainer = document.getElementById('register-form-container');
        const loginContainer = document.getElementById('login-form-container');
        if (registerContainer) registerContainer.style.display = 'none';
        if (loginContainer) loginContainer.style.display = 'block';
    }

    switchToRegister() {
        const loginContainer = document.getElementById('login-form-container');
        const registerContainer = document.getElementById('register-form-container');
        if (loginContainer) loginContainer.style.display = 'none';
        if (registerContainer) registerContainer.style.display = 'block';
    }

    // Save game score
    async saveGameScore(gameName, score) {
        if (!this.currentUser) {
            this.showNotification('Login to save your score!', 'info');
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/api/game/score`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game_name: gameName, score })
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Score saved! +' + score + ' XP', 'success');
                await this.checkAuth();
            } else {
                this.showNotification('Failed to save score', 'error');
            }
        } catch (error) {
            console.error('Save score error:', error);
            this.showNotification('Could not save score (offline mode)', 'warning');
        }
    }

    // Load leaderboard
    async loadLeaderboard() {
        try {
            const response = await fetch(`${this.apiUrl}/api/leaderboard`, {
                credentials: 'include'
            });
            const leaderboard = await response.json();

            const leaderboardContainer = document.getElementById('leaderboard-list');
            if (!leaderboardContainer) return;

            if (!Array.isArray(leaderboard)) {
                leaderboardContainer.innerHTML = '<p>No leaderboard data</p>';
                return;
            }

            leaderboardContainer.innerHTML = leaderboard.map((user, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                
                return `
                    <div class="leaderboard-item">
                        <div class="rank">${medal}</div>
                        <img src="${user.avatar_url || 'https://via.placeholder.com/40'}" class="lb-avatar" alt="${user.username}">
                        <div class="lb-info">
                            <div class="lb-name">${user.username}</div>
                            <div class="lb-stats">Level ${user.level || 1} • ${user.total_score || 0} pts • ${user.total_games_played || 0} games</div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
        }
    }

    // Load user achievements
    async loadAchievements() {
        if (!this.currentUser) return;

        try {
            const response = await fetch(`${this.apiUrl}/api/user/achievements`, {
                credentials: 'include'
            });
            const achievements = await response.json();

            const achievementsContainer = document.getElementById('achievements-list');
            if (!achievementsContainer) return;

            achievementsContainer.innerHTML = achievements.map(achievement => {
                const unlocked = achievement.unlocked_at !== null;
                return `
                    <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'}">
                        <div class="achievement-icon">${achievement.icon}</div>
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-desc">${achievement.description}</div>
                        <div class="achievement-xp">+${achievement.xp_reward} XP</div>
                        ${unlocked ? `<div class="unlock-date">Unlocked ${new Date(achievement.unlocked_at).toLocaleDateString()}</div>` : ''}
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Failed to load achievements:', error);
        }
    }

    // Show user profile
    async showProfile() {
        if (!this.currentUser) return;

        try {
            const response = await fetch(`${this.apiUrl}/api/user/profile/${this.currentUser.id}`, {
                credentials: 'include'
            });
            const profile = await response.json();

            const profileModal = document.getElementById('profile-modal');
            if (!profileModal) return;

            const profileContent = document.getElementById('profile-content');
            if (profileContent) {
                profileContent.innerHTML = `
                    <img src="${profile.avatar_url || 'https://via.placeholder.com/150'}" class="profile-avatar" alt="${profile.username}">
                    <h2>${profile.username}</h2>
                    <div class="profile-stats">
                        <div class="profile-stat">
                            <span class="stat-label">Level</span>
                            <span class="stat-value">${profile.level || 1}</span>
                        </div>
                        <div class="profile-stat">
                            <span class="stat-label">XP</span>
                            <span class="stat-value">${profile.xp || 0}</span>
                        </div>
                        <div class="profile-stat">
                            <span class="stat-label">Games Played</span>
                            <span class="stat-value">${profile.total_games || 0}</span>
                        </div>
                        <div class="profile-stat">
                            <span class="stat-label">Achievements</span>
                            <span class="stat-value">${profile.achievements_unlocked || 0}</span>
                        </div>
                        <div class="profile-stat">
                            <span class="stat-label">High Score</span>
                            <span class="stat-value">${profile.highest_score || 0}</span>
                        </div>
                    </div>
                    <button onclick="arcade.logout()" class="btn btn-logout">Logout</button>
                `;
            }

            profileModal.classList.add('active');
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize when page loads
let arcade;
document.addEventListener('DOMContentLoaded', () => {
    arcade = new DianeArcade();
});
