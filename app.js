// ==========================================
// Frontend JavaScript - app.js (FIXED)
// ==========================================

class DianeArcade {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
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
            const response = await fetch('/api/user');
            if (response.ok) {
                this.currentUser = await response.json();
                await this.checkAdminStatus();
                this.updateUI();
            } else {
                this.currentUser = null;
                this.isAdmin = false;
                this.showLoginPrompt();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    }

    // Check admin status
    async checkAdminStatus() {
        try {
            const response = await fetch('/api/admin/check');
            if (response.ok) {
                const data = await response.json();
                this.isAdmin = data.is_admin;
            }
        } catch (error) {
            console.error('Admin check failed:', error);
            this.isAdmin = false;
        }
    }

    // Update UI based on login state
    updateUI() {
        const userProfileHTML = document.getElementById('user-profile-section');
        const loginBtnHTML = document.getElementById('login-button-section');
        const adminBtnHTML = document.getElementById('admin-button-section');

        if (this.currentUser) {
            // User is logged in
            loginBtnHTML.style.display = 'none';
            userProfileHTML.style.display = 'flex';
            
            // Show admin button if user is admin
            if (adminBtnHTML) {
                adminBtnHTML.style.display = this.isAdmin ? 'block' : 'none';
            }

            userProfileHTML.innerHTML = `
                <div class="user-profile" onclick="arcade.showProfile()">
                    <img src="${this.currentUser.avatar_url || 'https://via.placeholder.com/30'}" class="user-avatar" alt="Avatar">
                    <div>
                        <div class="user-name">${this.currentUser.username}</div>
                        <div class="user-level">LVL ${this.currentUser.level} • ${this.currentUser.coins || 0} 🪙</div>
                    </div>
                </div>
            `;
        } else {
            // User is not logged in - NO GUEST MODE
            userProfileHTML.style.display = 'none';
            loginBtnHTML.style.display = 'block';
            if (adminBtnHTML) {
                adminBtnHTML.style.display = 'none';
            }
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Login button
        const loginBtn = document.getElementById('show-login-modal');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }

        // Close modal
        const closeModalBtns = document.querySelectorAll('.close-modal');
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Avatar upload
        const avatarInput = document.getElementById('avatar-upload');
        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => this.handleAvatarUpload(e));
        }

        // Banner upload
        const bannerInput = document.getElementById('banner-upload');
        if (bannerInput) {
            bannerInput.addEventListener('change', (e) => this.handleBannerUpload(e));
        }
    }

    // Show login modal
    showLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    // Show login prompt for non-logged users
    showLoginPrompt() {
        // Show message that features require login
        const gamesNeedLogin = document.querySelectorAll('[data-requires-login]');
        gamesNeedLogin.forEach(game => {
            game.addEventListener('click', (e) => {
                if (!this.currentUser) {
                    e.preventDefault();
                    this.showLoginModal();
                    this.showNotification('Please login to play games and earn achievements!', 'info');
                }
            });
        });
    }

    // Close modal
    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.classList.remove('active'));
    }

    // Handle registration
    async handleRegister(e) {
        e.preventDefault();
        
        const form = e.target;
        const email = form.querySelector('[name="email"]').value;
        const username = form.querySelector('[name="username"]').value;
        const password = form.querySelector('[name="password"]').value;

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Registration successful! You earned 5 XP and 5 coins! 🎉', 'success');
                this.switchToLogin();
            } else {
                this.showNotification(data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            this.showNotification('Server error. Please try again.', 'error');
        }
    }

    // Handle login
    async handleLogin(e) {
        e.preventDefault();
        
        const form = e.target;
        const email = form.querySelector('[name="email"]').value;
        const password = form.querySelector('[name="password"]').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                await this.checkAdminStatus();
                this.updateUI();
                this.closeModal();
                this.showNotification('Welcome back, ' + data.user.username + '!', 'success');
                this.loadLeaderboard();
            } else {
                this.showNotification('Invalid email or password', 'error');
            }
        } catch (error) {
            this.showNotification('Server error. Please try again.', 'error');
        }
    }

    // Handle avatar upload
    async handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const response = await fetch('/api/user/avatar', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser.avatar_url = data.avatar_url;
                this.updateUI();
                this.showNotification('Avatar updated!', 'success');
                if (document.getElementById('profile-modal').classList.contains('active')) {
                    this.showProfile();
                }
            } else {
                this.showNotification(data.error || 'Upload failed', 'error');
            }
        } catch (error) {
            this.showNotification('Upload failed', 'error');
        }
    }

    // Handle banner upload
    async handleBannerUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('banner', file);

        try {
            const response = await fetch('/api/user/banner', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser.banner_url = data.banner_url;
                this.showNotification('Banner updated!', 'success');
                if (document.getElementById('profile-modal').classList.contains('active')) {
                    this.showProfile();
                }
            } else {
                this.showNotification(data.error || 'Upload failed', 'error');
            }
        } catch (error) {
            this.showNotification('Upload failed', 'error');
        }
    }

    // Delete account
    async deleteAccount() {
        if (!confirm('Are you sure you want to delete your account? This cannot be undone!')) {
            return;
        }

        try {
            const response = await fetch('/api/user/delete', {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Account deleted', 'success');
                // Redirect to main page
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                this.showNotification(data.error || 'Failed to delete account', 'error');
            }
        } catch (error) {
            this.showNotification('Failed to delete account', 'error');
        }
    }

    // Logout
    async logout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            this.currentUser = null;
            this.isAdmin = false;
            this.updateUI();
            this.showNotification('Logged out successfully', 'success');
            window.location.reload();
        } catch (error) {
            this.showNotification('Logout failed', 'error');
        }
    }

    // Switch between login and register forms
    switchToLogin() {
        document.getElementById('register-form-container').style.display = 'none';
        document.getElementById('login-form-container').style.display = 'block';
    }

    switchToRegister() {
        document.getElementById('login-form-container').style.display = 'none';
        document.getElementById('register-form-container').style.display = 'block';
    }

    // Save game score
    async saveGameScore(gameName, score) {
        if (!this.currentUser) {
            this.showNotification('Login to save your score!', 'info');
            return;
        }

        try {
            const response = await fetch('/api/game/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game_name: gameName, score })
            });

            const data = await response.json();

            if (response.ok) {
                let message = `Score saved! +${data.xp_gained} XP`;
                
                // Show achievement notifications
                if (data.new_achievements && data.new_achievements.length > 0) {
                    data.new_achievements.forEach(ach => {
                        setTimeout(() => {
                            this.showNotification(`🏆 Achievement Unlocked: ${ach.name}! +${ach.xp_reward} XP, +${ach.coins_reward} coins`, 'success');
                        }, 500);
                    });
                }
                
                this.showNotification(message, 'success');
                await this.checkAuth(); // Refresh user data
            } else {
                this.showNotification('Failed to save score', 'error');
            }
        } catch (error) {
            console.error('Save score error:', error);
        }
    }

    // Load leaderboard
    async loadLeaderboard() {
        try {
            const response = await fetch('/api/leaderboard');
            const leaderboard = await response.json();

            const leaderboardContainer = document.getElementById('leaderboard-list');
            if (!leaderboardContainer) return;

            leaderboardContainer.innerHTML = leaderboard.map((user, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                
                return `
                    <div class="leaderboard-item">
                        <div class="rank">${medal}</div>
                        <img src="${user.avatar_url || 'https://via.placeholder.com/40'}" class="lb-avatar" alt="${user.username}">
                        <div class="lb-info">
                            <div class="lb-name">${user.username}</div>
                            <div class="lb-stats">Level ${user.level} • ${user.total_score || 0} pts • ${user.games_played || 0} games</div>
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
            const response = await fetch('/api/user/achievements');
            const achievements = await response.json();

            const achievementsContainer = document.getElementById('achievements-list');
            if (!achievementsContainer) return;

            achievementsContainer.innerHTML = achievements.map(achievement => {
                const unlocked = achievement.unlocked;
                return `
                    <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'}">
                        <div class="achievement-icon">${achievement.icon}</div>
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-desc">${achievement.description}</div>
                        <div class="achievement-rewards">+${achievement.xp_reward} XP • +${achievement.coins_reward} 🪙</div>
                        ${unlocked ? `<div class="unlock-date">Unlocked ${new Date(achievement.unlocked_at).toLocaleDateString()}</div>` : '<div class="locked-badge">🔒 Locked</div>'}
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Failed to load achievements:', error);
        }
    }

    // Show user profile modal
    async showProfile() {
        if (!this.currentUser) return;

        try {
            const response = await fetch(`/api/user/profile/${this.currentUser.id}`);
            const profile = await response.json();

            const profileModal = document.getElementById('profile-modal');
            if (!profileModal) return;

            const xpNeeded = Math.pow(profile.level, 2) * 100;
            const xpProgress = ((profile.xp % xpNeeded) / xpNeeded) * 100;

            // Display badges
            let badgesHTML = '';
            if (profile.badges && profile.badges.length > 0) {
                const badgeIcons = {
                    'verified_discord': '🔷',
                    'org_badge': '🏢',
                    'roblox_badge': '🎮',
                    'premium_badge': '💎',
                    'founder_badge': '👑'
                };
                badgesHTML = `<div class="profile-badges">
                    ${profile.badges.map(badge => `<span class="badge-icon" title="${badge.badge_id}">${badgeIcons[badge.badge_id] || '🏅'}</span>`).join('')}
                </div>`;
            }

            document.getElementById('profile-content').innerHTML = `
                ${profile.banner_url ? `<div class="profile-banner" style="background-image: url('${profile.banner_url}')"></div>` : ''}
                <div class="profile-header">
                    <div class="profile-avatar-container">
                        <img src="${profile.avatar_url || 'https://via.placeholder.com/150'}" class="profile-avatar" alt="${profile.username}">
                        <label for="avatar-upload" class="avatar-upload-btn">📷</label>
                        <input type="file" id="avatar-upload" accept="image/*" style="display: none;">
                    </div>
                    <h2>${profile.username}</h2>
                    <p class="join-date">Joined ${profile.join_date}</p>
                    ${this.isAdmin ? '<span class="admin-badge">👑 ADMIN</span>' : ''}
                </div>

                <div class="xp-bar-container">
                    <div class="xp-bar">
                        <div class="xp-progress" style="width: ${xpProgress}%"></div>
                    </div>
                    <div class="xp-text">Level ${profile.level} • ${profile.xp} / ${xpNeeded} XP</div>
                </div>

                <div class="profile-stats">
                    <div class="profile-stat">
                        <span class="stat-label">Level</span>
                        <span class="stat-value">${profile.level}</span>
                    </div>
                    <div class="profile-stat">
                        <span class="stat-label">Coins</span>
                        <span class="stat-value">${profile.coins || 0} 🪙</span>
                    </div>
                    <div class="profile-stat">
                        <span class="stat-label">XP</span>
                        <span class="stat-value">${profile.xp}</span>
                    </div>
                    <div class="profile-stat">
                        <span class="stat-label">Games Played</span>
                        <span class="stat-value">${profile.total_games}</span>
                    </div>
                    <div class="profile-stat">
                        <span class="stat-label">Achievements</span>
                        <span class="stat-value">${profile.achievements_unlocked} / ${profile.total_achievements}</span>
                    </div>
                    <div class="profile-stat">
                        <span class="stat-label">Highest Score</span>
                        <span class="stat-value">${profile.highest_score || 0}</span>
                    </div>
                </div>

                <div class="profile-actions">
                    <button onclick="arcade.loadAchievements(); document.getElementById('achievements-modal').classList.add('active');" class="btn btn-primary">🏆 Achievements</button>
                    <button onclick="arcade.showCoinsShop()" class="btn btn-secondary">🪙 Coin Shop</button>
                    <label for="banner-upload" class="btn btn-secondary">🖼️ Change Banner</label>
                    <input type="file" id="banner-upload" accept="image/*" style="display: none;">
                    <button onclick="arcade.logout()" class="btn btn-logout">Logout</button>
                    <button onclick="arcade.deleteAccount()" class="btn btn-danger">Delete Account</button>
                </div>
            `;

            profileModal.classList.add('active');

            // Re-attach event listeners for upload inputs
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    }

    // Show coins shop
    showCoinsShop() {
        window.location.href = '/shop.html';
    }

    // Send friend request
    async sendFriendRequest(friendId) {
        if (!this.currentUser) {
            this.showNotification('Login to add friends!', 'info');
            return;
        }

        try {
            const response = await fetch('/api/friends/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ friendId })
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Friend request sent!', 'success');
            } else {
                this.showNotification(data.error || 'Failed to send request', 'error');
            }
        } catch (error) {
            this.showNotification('Failed to send request', 'error');
        }
    }

    // Load friends list
    async loadFriends() {
        if (!this.currentUser) return;

        try {
            const response = await fetch('/api/friends');
            const friends = await response.json();

            const friendsContainer = document.getElementById('friends-list');
            if (!friendsContainer) return;

            if (friends.length === 0) {
                friendsContainer.innerHTML = '<p class="no-friends">No friends yet. Add some friends to compete!</p>';
                return;
            }

            friendsContainer.innerHTML = friends.map(friend => `
                <div class="friend-item">
                    <img src="${friend.avatar_url || 'https://via.placeholder.com/40'}" class="friend-avatar" alt="${friend.username}">
                    <div class="friend-info">
                        <div class="friend-name">${friend.username}</div>
                        <div class="friend-level">Level ${friend.level}</div>
                    </div>
                    <button onclick="arcade.removeFriend('${friend.id}')" class="btn btn-sm btn-danger">Remove</button>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load friends:', error);
        }
    }

    // Remove friend
    async removeFriend(friendId) {
        if (!confirm('Remove this friend?')) return;

        try {
            const response = await fetch(`/api/friends/${friendId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showNotification('Friend removed', 'success');
                this.loadFriends();
            } else {
                this.showNotification('Failed to remove friend', 'error');
            }
        } catch (error) {
            this.showNotification('Failed to remove friend', 'error');
        }
    }

    // Show admin panel
    showAdminPanel() {
        if (!this.isAdmin) {
            this.showNotification('Access denied', 'error');
            return;
        }

        window.location.href = '/admin.html';
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
}

// Initialize arcade when page loads
let arcade;
document.addEventListener('DOMContentLoaded', () => {
    arcade = new DianeArcade();
});    async checkAdminStatus() {
        try {
            const response = await fetch('/api/admin/check');
            if (response.ok) {
                const data = await response.json();
                this.isAdmin = data.is_admin;
            }
        } catch (error) {
            console.error('Admin check failed:', error);
            this.isAdmin = false;
        }
    }

    // Update UI based on login state
    updateUI() {
        const userProfileHTML = document.getElementById('user-profile-section');
        const loginBtnHTML = document.getElementById('login-button-section');
        const adminBtnHTML = document.getElementById('admin-button-section');

        if (this.currentUser) {
            // User is logged in
            loginBtnHTML.style.display = 'none';
            userProfileHTML.style.display = 'flex';
            
            // Show admin button if user is admin
            if (adminBtnHTML) {
                adminBtnHTML.style.display = this.isAdmin ? 'block' : 'none';
            }

            userProfileHTML.innerHTML = `
                <div class="user-profile" onclick="arcade.showProfile()">
                    <img src="${this.currentUser.avatar_url || 'https://via.placeholder.com/30'}" class="user-avatar" alt="Avatar">
                    <div>
                        <div class="user-name">${this.currentUser.username}</div>
                        <div class="user-level">LVL ${this.currentUser.level} • ${this.currentUser.coins || 0} 🪙</div>
                    </div>
                </div>
            `;
        } else {
            // User is not logged in - NO GUEST MODE
            userProfileHTML.style.display = 'none';
            loginBtnHTML.style.display = 'block';
            if (adminBtnHTML) {
                adminBtnHTML.style.display = 'none';
            }
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Login button
        const loginBtn = document.getElementById('show-login-modal');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }

        // Close modal
        const closeModalBtns = document.querySelectorAll('.close-modal');
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        // Register form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Avatar upload
        const avatarInput = document.getElementById('avatar-upload');
        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => this.handleAvatarUpload(e));
        }

        // Banner upload
        const bannerInput = document.getElementById('banner-upload');
        if (bannerInput) {
            bannerInput.addEventListener('change', (e) => this.handleBannerUpload(e));
        }
    }

    // Show login modal
    showLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    // Show login prompt for non-logged users
    showLoginPrompt() {
        // Show message that features require login
        const gamesNeedLogin = document.querySelectorAll('[data-requires-login]');
        gamesNeedLogin.forEach(game => {
            game.addEventListener('click', (e) => {
                if (!this.currentUser) {
                    e.preventDefault();
                    this.showLoginModal();
                    this.showNotification('Please login to play games and earn achievements!', 'info');
                }
            });
        });
    }

    // Close modal
    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.classList.remove('active'));
    }

    // Handle registration
    async handleRegister(e) {
        e.preventDefault();
        
        const form = e.target;
        const email = form.querySelector('[name="email"]').value;
        const username = form.querySelector('[name="username"]').value;
        const password = form.querySelector('[name="password"]').value;

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Registration successful! You earned 5 XP and 5 coins! 🎉', 'success');
                this.switchToLogin();
            } else {
                this.showNotification(data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            this.showNotification('Server error. Please try again.', 'error');
        }
    }

    // Handle login
    async handleLogin(e) {
        e.preventDefault();
        
        const form = e.target;
        const email = form.querySelector('[name="email"]').value;
        const password = form.querySelector('[name="password"]').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                await this.checkAdminStatus();
                this.updateUI();
                this.closeModal();
                this.showNotification('Welcome back, ' + data.user.username + '!', 'success');
                this.loadLeaderboard();
            } else {
                this.showNotification('Invalid email or password', 'error');
            }
        } catch (error) {
            this.showNotification('Server error. Please try again.', 'error');
        }
    }

    // Handle avatar upload
    async handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const response = await fetch('/api/user/avatar', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser.avatar_url = data.avatar_url;
                this.updateUI();
                this.showNotification('Avatar updated!', 'success');
                if (document.getElementById('profile-modal').classList.contains('active')) {
                    this.showProfile();
                }
            } else {
                this.showNotification(data.error || 'Upload failed', 'error');
            }
        } catch (error) {
            this.showNotification('Upload failed', 'error');
        }
    }

    // Handle banner upload
    async handleBannerUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('banner', file);

        try {
            const response = await fetch('/api/user/banner', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser.banner_url = data.banner_url;
                this.showNotification('Banner updated!', 'success');
                if (document.getElementById('profile-modal').classList.contains('active')) {
                    this.showProfile();
                }
            } else {
                this.showNotification(data.error || 'Upload failed', 'error');
            }
        } catch (error) {
            this.showNotification('Upload failed', 'error');
        }
    }

    // Delete account
    async deleteAccount() {
        if (!confirm('Are you sure you want to delete your account? This cannot be undone!')) {
            return;
        }

        try {
            const response = await fetch('/api/user/delete', {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Account deleted', 'success');
                // Redirect to main page
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                this.showNotification(data.error || 'Failed to delete account', 'error');
            }
        } catch (error) {
            this.showNotification('Failed to delete account', 'error');
        }
    }

    // Logout
    async logout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            this.currentUser = null;
            this.isAdmin = false;
            this.updateUI();
            this.showNotification('Logged out successfully', 'success');
            window.location.reload();
        } catch (error) {
            this.showNotification('Logout failed', 'error');
        }
    }

    // Switch between login and register forms
    switchToLogin() {
        document.getElementById('register-form-container').style.display = 'none';
        document.getElementById('login-form-container').style.display = 'block';
    }

    switchToRegister() {
        document.getElementById('login-form-container').style.display = 'none';
        document.getElementById('register-form-container').style.display = 'block';
    }

    // Save game score
    async saveGameScore(gameName, score) {
        if (!this.currentUser) {
            this.showNotification('Login to save your score!', 'info');
            return;
        }

        try {
            const response = await fetch('/api/game/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game_name: gameName, score })
            });

            const data = await response.json();

            if (response.ok) {
                let message = `Score saved! +${data.xp_gained} XP`;
                
                // Show achievement notifications
                if (data.new_achievements && data.new_achievements.length > 0) {
                    data.new_achievements.forEach(ach => {
                        setTimeout(() => {
                            this.showNotification(`🏆 Achievement Unlocked: ${ach.name}! +${ach.xp_reward} XP, +${ach.coins_reward} coins`, 'success');
                        }, 500);
                    });
                }
                
                this.showNotification(message, 'success');
                await this.checkAuth(); // Refresh user data
            } else {
                this.showNotification('Failed to save score', 'error');
            }
        } catch (error) {
            console.error('Save score error:', error);
        }
    }

    // Load leaderboard
    async loadLeaderboard() {
        try {
            const response = await fetch('/api/leaderboard');
            const leaderboard = await response.json();

            const leaderboardContainer = document.getElementById('leaderboard-list');
            if (!leaderboardContainer) return;

            leaderboardContainer.innerHTML = leaderboard.map((user, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                
                return `
                    <div class="leaderboard-item">
                        <div class="rank">${medal}</div>
                        <img src="${user.avatar_url || 'https://via.placeholder.com/40'}" class="lb-avatar" alt="${user.username}">
                        <div class="lb-info">
                            <div class="lb-name">${user.username}</div>
                            <div class="lb-stats">Level ${user.level} • ${user.total_score || 0} pts • ${user.games_played || 0} games</div>
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
            const response = await fetch('/api/user/achievements');
            const achievements = await response.json();

            const achievementsContainer = document.getElementById('achievements-list');
            if (!achievementsContainer) return;

            achievementsContainer.innerHTML = achievements.map(achievement => {
                const unlocked = achievement.unlocked;
                return `
                    <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'}">
                        <div class="achievement-icon">${achievement.icon}</div>
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-desc">${achievement.description}</div>
                        <div class="achievement-rewards">+${achievement.xp_reward} XP • +${achievement.coins_reward} 🪙</div>
                        ${unlocked ? `<div class="unlock-date">Unlocked ${new Date(achievement.unlocked_at).toLocaleDateString()}</div>` : '<div class="locked-badge">🔒 Locked</div>'}
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Failed to load achievements:', error);
        }
    }

    // Show user profile modal
    async showProfile() {
        if (!this.currentUser) return;

        try {
            const response = await fetch(`/api/user/profile/${this.currentUser.id}`);
            const profile = await response.json();

            const profileModal = document.getElementById('profile-modal');
            if (!profileModal) return;

            const xpNeeded = Math.pow(profile.level, 2) * 100;
            const xpProgress = ((profile.xp % xpNeeded) / xpNeeded) * 100;

            document.getElementById('profile-content').innerHTML = `
                ${profile.banner_url ? `<div class="profile-banner" style="background-image: url('${profile.banner_url}')"></div>` : ''}
                <div class="profile-header">
                    <div class="profile-avatar-container">
                        <img src="${profile.avatar_url || 'https://via.placeholder.com/150'}" class="profile-avatar" alt="${profile.username}">
                        <label for="avatar-upload" class="avatar-upload-btn">📷</label>
                        <input type="file" id="avatar-upload" accept="image/*" style="display: none;">
                    </div>
                    <h2>${profile.username}</h2>
                    <p class="join-date">Joined ${profile.join_date}</p>
                    ${this.isAdmin ? '<span class="admin-badge">👑 ADMIN</span>' : ''}
                </div>

                <div class="xp-bar-container">
                    <div class="xp-bar">
                        <div class="xp-progress" style="width: ${xpProgress}%"></div>
                    </div>
                    <div class="xp-text">Level ${profile.level} • ${profile.xp} / ${xpNeeded} XP</div>
                </div>

                <div class="profile-stats">
                    <div class="profile-stat">
                        <span class="stat-label">Level</span>
                        <span class="stat-value">${profile.level}</span>
                    </div>
                    <div class="profile-stat">
                        <span class="stat-label">Coins</span>
                        <span class="stat-value">${profile.coins || 0} 🪙</span>
                    </div>
                    <div class="profile-stat">
                        <span class="stat-label">XP</span>
                        <span class="stat-value">${profile.xp}</span>
                    </div>
                    <div class="profile-stat">
                        <span class="stat-label">Games Played</span>
                        <span class="stat-value">${profile.total_games}</span>
                    </div>
                    <div class="profile-stat">
                        <span class="stat-label">Achievements</span>
                        <span class="stat-value">${profile.achievements_unlocked} / ${profile.total_achievements}</span>
                    </div>
                    <div class="profile-stat">
                        <span class="stat-label">Highest Score</span>
                        <span class="stat-value">${profile.highest_score || 0}</span>
                    </div>
                </div>

                <div class="profile-actions">
                    <button onclick="arcade.loadAchievements(); document.getElementById('achievements-modal').classList.add('active');" class="btn btn-primary">🏆 Achievements</button>
                    <button onclick="arcade.showCoinsShop()" class="btn btn-secondary">🪙 Coin Shop</button>
                    <label for="banner-upload" class="btn btn-secondary">🖼️ Change Banner</label>
                    <input type="file" id="banner-upload" accept="image/*" style="display: none;">
                    <button onclick="arcade.logout()" class="btn btn-logout">Logout</button>
                    <button onclick="arcade.deleteAccount()" class="btn btn-danger">Delete Account</button>
                </div>
            `;

            profileModal.classList.add('active');

            // Re-attach event listeners for upload inputs
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    }

    // Show coins shop (Coming Soon)
    showCoinsShop() {
        this.showNotification('🪙 Coin Shop Coming Soon! Stay tuned for exclusive items and perks!', 'info');
        
        // You can create a modal for this later
        const shopModal = document.getElementById('shop-modal');
        if (shopModal) {
            shopModal.innerHTML = `
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <h2>🪙 Coin Shop</h2>
                    <div class="coming-soon">
                        <h3>Coming Soon!</h3>
                        <p>We're working on exciting items and perks you can purchase with your coins.</p>
                        <p>Current Balance: <strong>${this.currentUser.coins || 0} 🪙</strong></p>
                        <p>Keep playing games and earning achievements to stack up those coins!</p>
                    </div>
                </div>
            `;
            shopModal.classList.add('active');
        }
    }

    // Send friend request
    async sendFriendRequest(friendId) {
        if (!this.currentUser) {
            this.showNotification('Login to add friends!', 'info');
            return;
        }

        try {
            const response = await fetch('/api/friends/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ friendId })
            });

            const data = await response.json();

            if (response.ok) {
                this.showNotification('Friend request sent!', 'success');
            } else {
                this.showNotification(data.error || 'Failed to send request', 'error');
            }
        } catch (error) {
            this.showNotification('Failed to send request', 'error');
        }
    }

    // Load friends list
    async loadFriends() {
        if (!this.currentUser) return;

        try {
            const response = await fetch('/api/friends');
            const friends = await response.json();

            const friendsContainer = document.getElementById('friends-list');
            if (!friendsContainer) return;

            if (friends.length === 0) {
                friendsContainer.innerHTML = '<p class="no-friends">No friends yet. Add some friends to compete!</p>';
                return;
            }

            friendsContainer.innerHTML = friends.map(friend => `
                <div class="friend-item">
                    <img src="${friend.avatar_url || 'https://via.placeholder.com/40'}" class="friend-avatar" alt="${friend.username}">
                    <div class="friend-info">
                        <div class="friend-name">${friend.username}</div>
                        <div class="friend-level">Level ${friend.level}</div>
                    </div>
                    <button onclick="arcade.removeFriend('${friend.id}')" class="btn btn-sm btn-danger">Remove</button>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load friends:', error);
        }
    }

    // Remove friend
    async removeFriend(friendId) {
        if (!confirm('Remove this friend?')) return;

        try {
            const response = await fetch(`/api/friends/${friendId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showNotification('Friend removed', 'success');
                this.loadFriends();
            } else {
                this.showNotification('Failed to remove friend', 'error');
            }
        } catch (error) {
            this.showNotification('Failed to remove friend', 'error');
        }
    }

    // Show admin panel
    showAdminPanel() {
        if (!this.isAdmin) {
            this.showNotification('Access denied', 'error');
            return;
        }

        window.location.href = '/admin.html';
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
}

// Initialize arcade when page loads
let arcade;
document.addEventListener('DOMContentLoaded', () => {
    arcade = new DianeArcade();
});
