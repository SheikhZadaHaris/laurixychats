/* LAURIXY CHATS - JavaScript Application */

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBhqql-4pUikZgLidKuj7rHDSG-4cQi6iE",
    authDomain: "laurixy-chats.firebaseapp.com",
    databaseURL: "https://laurixy-chats-default-rtdb.firebaseio.com",
    projectId: "laurixy-chats",
    storageBucket: "laurixy-chats.firebasestorage.app",
    messagingSenderId: "623941814502",
    appId: "1:623941814502:web:a9a9f86e3d7929c083d327",
    measurementId: "G-Z873PBRYSZ"
};

// WebRTC Configuration
const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]
};

// Emojis
const EMOJIS = ['😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😡', '👍', '👎', '❤️', '🔥', '🎉', '👏', '🙏', '💯', '✨', '🌟', '💪', '🤝', '👋', '🎈', '🎁', '☀️', '🌙', '⭐', '💬', '📱', '💻', '🎮'];

// Global Variables
let db, auth;
let currentUser = null;
let currentChatId = null;
let currentChatUser = null;
let allUsers = {};
let confirmationResult = null;
let peerConnection = null;
let localStream = null;
let remoteStream = null;
let currentCallId = null;
let isVideoCall = false;
let selectedMessageId = null;
let typingTimeout = null;

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
db = firebase.database();
auth = firebase.auth();

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    initEmojiPicker();

    setTimeout(() => {
        auth.onAuthStateChanged(user => {
            if (user) {
                loadUserData(user.uid);
            } else {
                showScreen('welcome-screen');
            }
        });
    }, 2000);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu') && !e.target.closest('[onclick*="toggle"]')) {
            document.querySelectorAll('.context-menu').forEach(m => m.classList.remove('active'));
        }
        if (!e.target.closest('#emoji-picker') && !e.target.closest('.emoji-btn')) {
            document.getElementById('emoji-picker').classList.remove('active');
        }
    });
});

// ============ UTILITIES ============
const utilsModule = {
    getChatId(uid1, uid2) {
        return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
    },
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        if (diff < 86400000 && date.getDate() === now.getDate()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 604800000) {
            return date.toLocaleDateString([], { weekday: 'short' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    },
    formatFullTime(timestamp) {
        return new Date(timestamp).toLocaleString();
    },
    getInitial(name) {
        return name ? name.charAt(0).toUpperCase() : 'U';
    },
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ============ UI MODULE ============
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if (screenId === 'chats-home' && currentUser) {
        loadChatList();
        checkAdminStatus();
    } else if (screenId === 'profile-screen' && currentUser) {
        loadProfileData();
    } else if (screenId === 'admin-panel') {
        loadAdminData();
    }
}

function createParticles() {
    const container = document.getElementById('particles-container');
    const colors = ['#a855f7', '#ec4899', '#22d3ee', '#3b82f6'];
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.width = Math.random() * 8 + 2 + 'px';
        particle.style.height = particle.style.width;
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = 10 + Math.random() * 20 + 's';
        container.appendChild(particle);
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function openModal(modalId) { document.getElementById(modalId).classList.add('active'); }
function closeModal(modalId) { document.getElementById(modalId).classList.remove('active'); }

function showConfirm(title, message, onConfirm) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-action-btn').onclick = () => { closeModal('confirm-modal'); onConfirm(); };
    openModal('confirm-modal');
}

function switchAuthTab(tab, btn) {
    btn.parentElement.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const container = btn.closest('.auth-container');
    container.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    if (tab === 'email') container.querySelector('[id*="email"]').classList.add('active');
    else container.querySelector('[id*="phone"]').classList.add('active');
}

function switchAdminSection(section, btn) {
    document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.getElementById('admin-' + section).classList.add('active');
}

// Mobile Admin Menu Toggle
function toggleAdminMenu() {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('admin-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

function closeAdminMenu() {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('admin-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

function initEmojiPicker() {
    const grid = document.getElementById('emoji-grid');
    EMOJIS.forEach(e => {
        const span = document.createElement('span');
        span.className = 'emoji-item';
        span.textContent = e;
        span.onclick = () => insertEmoji(e);
        grid.appendChild(span);
    });
}

function toggleEmojiPicker() { document.getElementById('emoji-picker').classList.toggle('active'); }
function insertEmoji(emoji) {
    const input = document.getElementById('message-input');
    input.value += emoji;
    input.focus();
}

// Notification disabled for production
function sendNotification(title, body) {
    // Browser notifications disabled - do nothing
}

// ============ AUTH MODULE ============
async function handleEmailLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Login successful!');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleEmailSignup(e) {
    e.preventDefault();
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.ref('users/' + cred.user.uid).set({
            username, email, about: "Hey there! I'm using LAURIXY CHATS",
            online: true, lastOnline: Date.now(), role: 'user'
        });
        await logAction('userSignup', { uid: cred.user.uid, email });
        showToast('Account created!');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handlePhoneLogin(e) {
    e.preventDefault();
    const phone = document.getElementById('login-phone').value;
    const otp = document.getElementById('login-otp').value;
    if (!confirmationResult) {
        try {
            const recaptcha = new firebase.auth.RecaptchaVerifier('recaptcha-container-login', { size: 'invisible' });
            confirmationResult = await auth.signInWithPhoneNumber(phone, recaptcha);
            document.getElementById('otp-group-login').style.display = 'block';
            document.getElementById('phone-login-btn').textContent = 'Verify OTP';
            showToast('OTP sent!');
        } catch (err) { showToast(err.message, 'error'); }
    } else {
        try {
            await confirmationResult.confirm(otp);
            showToast('Login successful!');
        } catch (err) { showToast(err.message, 'error'); }
    }
}

async function handlePhoneSignup(e) {
    e.preventDefault();
    const username = document.getElementById('signup-username-phone').value;
    const phone = document.getElementById('signup-phone').value;
    const otp = document.getElementById('signup-otp').value;
    if (!confirmationResult) {
        try {
            const recaptcha = new firebase.auth.RecaptchaVerifier('recaptcha-container-signup', { size: 'invisible' });
            confirmationResult = await auth.signInWithPhoneNumber(phone, recaptcha);
            document.getElementById('otp-group-signup').style.display = 'block';
            document.getElementById('phone-signup-btn').textContent = 'Verify OTP';
            showToast('OTP sent!');
        } catch (err) { showToast(err.message, 'error'); }
    } else {
        try {
            const result = await confirmationResult.confirm(otp);
            await db.ref('users/' + result.user.uid).set({
                username, phone, about: "Hey there! I'm using LAURIXY CHATS",
                online: true, lastOnline: Date.now(), role: 'user'
            });
            showToast('Account created!');
        } catch (err) { showToast(err.message, 'error'); }
    }
}

async function handleForgotPassword() {
    const email = document.getElementById('login-email').value;
    if (!email) { showToast('Enter your email first', 'error'); return; }
    try {
        await auth.sendPasswordResetEmail(email);
        showToast('Password reset email sent!');
    } catch (err) { showToast(err.message, 'error'); }
}

async function handleLogout() {
    if (currentUser) await db.ref('users/' + currentUser.uid).update({ online: false, lastOnline: Date.now() });
    await auth.signOut();
    currentUser = null;
    showScreen('welcome-screen');
    showToast('Logged out');
}

function confirmDeleteAccount() {
    showConfirm('Delete Account', 'This action cannot be undone!', async () => {
        try {
            await db.ref('users/' + currentUser.uid).remove();
            await auth.currentUser.delete();
            showScreen('welcome-screen');
            showToast('Account deleted');
        } catch (err) { showToast(err.message, 'error'); }
    });
}

async function loadUserData(uid) {
    try {
        const snap = await db.ref('users/' + uid).once('value');
        const authUser = auth.currentUser;

        if (snap.exists()) {
            currentUser = { uid, ...snap.val() };

            // Auto-grant admin role for admin email
            if (authUser.email === 'admin@laurixy.com' && currentUser.role !== 'admin') {
                await db.ref('users/' + uid).update({ role: 'admin' });
                currentUser.role = 'admin';
            }

            await db.ref('users/' + uid).update({ online: true, lastOnline: Date.now() });
        } else {
            // User authenticated but no data in DB - create it
            const isAdmin = authUser.email === 'admin@laurixy.com';
            const userData = {
                username: authUser.displayName || authUser.email?.split('@')[0] || 'User',
                email: authUser.email || '',
                about: "Hey there! I'm using LAURIXY CHATS",
                online: true,
                lastOnline: Date.now(),
                role: isAdmin ? 'admin' : 'user'
            };
            await db.ref('users/' + uid).set(userData);
            currentUser = { uid, ...userData };
        }

        showScreen('chats-home');
        listenForCalls();
    } catch (err) {
        console.error('loadUserData error:', err);
        showToast('Database error: ' + err.message, 'error');
        currentUser = { uid, username: 'User', role: 'user' };
        showScreen('chats-home');
    }
}

async function logAction(type, data) {
    await db.ref('logs/' + type).push({ ...data, timestamp: Date.now() });
}

async function checkAdminStatus() {
    const adminBtn = document.getElementById('admin-btn');
    if (currentUser && currentUser.role === 'admin') {
        adminBtn.style.display = 'flex';
    } else {
        adminBtn.style.display = 'none';
    }
}

function loadProfileData() {
    document.getElementById('profile-avatar').textContent = utilsModule.getInitial(currentUser.username);
    document.getElementById('profile-name').textContent = currentUser.username;
    document.getElementById('profile-about').textContent = currentUser.about || '';
    document.getElementById('edit-username').value = currentUser.username;
    document.getElementById('edit-about').value = currentUser.about || '';
    document.getElementById('my-uid').textContent = currentUser.uid;
}

async function updateProfile() {
    const username = document.getElementById('edit-username').value;
    const about = document.getElementById('edit-about').value;
    try {
        await db.ref('users/' + currentUser.uid).update({ username, about });
        currentUser.username = username;
        currentUser.about = about;
        loadProfileData();
        showToast('Profile updated!');
    } catch (err) { showToast(err.message, 'error'); }
}

// ============ CHAT MODULE ============
async function loadChatList() {
    const chatList = document.getElementById('chat-list');
    chatList.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);">Loading...</div>';

    try {
        // Load all users first
        const usersSnap = await db.ref('users').once('value');
        allUsers = usersSnap.val() || {};
        console.log('Loaded users:', Object.keys(allUsers).length);

        // Load all chats
        const chatsSnap = await db.ref('chats').once('value');
        const chats = chatsSnap.val() || {};
        console.log('Loaded chats:', Object.keys(chats).length);

        chatList.innerHTML = '';

        const myChats = [];
        for (const chatId in chats) {
            const chat = chats[chatId];
            // Check if this chat belongs to current user
            if (chat.participants && chat.participants[currentUser.uid]) {
                // Get last message
                const msgs = Object.entries(chat)
                    .filter(([key, val]) => val && val.timestamp && key !== 'participants')
                    .map(([key, val]) => val);
                const lastMsg = msgs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];

                // Find other user
                const otherUid = Object.keys(chat.participants).find(u => u !== currentUser.uid);

                if (otherUid) {
                    // Get user data
                    let otherUser = allUsers[otherUid];

                    // If user not in cache, try to fetch
                    if (!otherUser) {
                        try {
                            const userSnap = await db.ref('users/' + otherUid).once('value');
                            if (userSnap.exists()) {
                                otherUser = userSnap.val();
                                allUsers[otherUid] = otherUser;
                            }
                        } catch (e) {
                            console.log('Error fetching user:', otherUid, e);
                        }
                    }

                    // Fallback if still no user data
                    if (!otherUser) {
                        otherUser = { username: 'User ' + otherUid.slice(0, 6), online: false };
                    }

                    // Ensure username exists
                    if (!otherUser.username) {
                        otherUser.username = 'User ' + otherUid.slice(0, 6);
                    }

                    myChats.push({ chatId, lastMsg, otherUid, otherUser });
                }
            }
        }

        // Sort by last message time
        myChats.sort((a, b) => ((b.lastMsg?.timestamp) || 0) - ((a.lastMsg?.timestamp) || 0));

        // Render chats
        if (myChats.length === 0) {
            chatList.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);">No chats yet.<br>Tap + to add a friend!</div>';
        } else {
            myChats.forEach(({ chatId, lastMsg, otherUid, otherUser }) => {
                const displayName = otherUser.username || 'Unknown';
                const item = document.createElement('div');
                item.className = 'chat-item';
                item.onclick = () => openChat(otherUid, otherUser);
                item.innerHTML = `
                    <div class="chat-avatar">
                        <div class="avatar">${utilsModule.getInitial(displayName)}</div>
                        <span class="${otherUser.online ? 'online-badge' : 'online-badge offline-badge'}"></span>
                    </div>
                    <div class="chat-info">
                        <div class="chat-name">${utilsModule.escapeHtml(displayName)}</div>
                        <div class="chat-preview">${lastMsg ? utilsModule.escapeHtml(lastMsg.text || '') : 'Start chatting!'}</div>
                    </div>
                    <div class="chat-meta">
                        <div class="chat-time">${lastMsg ? utilsModule.formatTime(lastMsg.timestamp) : ''}</div>
                    </div>`;
                chatList.appendChild(item);
            });
        }
    } catch (err) {
        console.error('loadChatList error:', err);
        chatList.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444;">Error loading chats. Please refresh.</div>';
    }
}

function openChat(otherUid, otherUser) {
    currentChatUser = { uid: otherUid, ...otherUser };
    currentChatId = utilsModule.getChatId(currentUser.uid, otherUid);
    document.getElementById('chat-user-avatar').textContent = utilsModule.getInitial(otherUser.username);
    document.getElementById('chat-user-name').textContent = otherUser.username;
    document.getElementById('chat-user-status').textContent = otherUser.online ? 'online' : 'offline';
    document.getElementById('chat-user-status').className = 'chat-header-status' + (otherUser.online ? ' online' : '');
    const isBlocked = currentUser.blockedUsers && currentUser.blockedUsers[otherUid];
    document.getElementById('block-user-btn').textContent = isBlocked ? '✓ Unblock User' : '🚫 Block User';
    showScreen('chat-window');
    loadMessages();
    listenForTyping();
}

function loadMessages() {
    const area = document.getElementById('messages-area');
    area.innerHTML = '';
    db.ref('chats/' + currentChatId).orderByChild('timestamp').on('child_added', snap => {
        const msg = snap.val();
        if (!msg.timestamp || msg.participants) return;
        if (msg.deletedForMe && msg.deletedForMe[currentUser.uid]) return;
        const div = document.createElement('div');
        div.className = 'message ' + (msg.sender === currentUser.uid ? 'sent' : 'received');
        div.dataset.id = snap.key;
        div.innerHTML = `
            <div class="message-text">${msg.deletedForEveryone ? '<em>Message deleted</em>' : utilsModule.escapeHtml(msg.text)}</div>
            <div class="message-meta">
                <span>${utilsModule.formatTime(msg.timestamp)}</span>
                ${msg.sender === currentUser.uid ? `<span>${msg.seen ? '✓✓' : (msg.delivered ? '✓' : '')}</span>` : ''}
            </div>`;
        div.oncontextmenu = (e) => { e.preventDefault(); showMessageContextMenu(e, snap.key, msg); };
        area.appendChild(div);
        area.scrollTop = area.scrollHeight;
        if (msg.sender !== currentUser.uid && !msg.seen) {
            db.ref('chats/' + currentChatId + '/' + snap.key).update({ seen: true });
        }
    });
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if (!text || !currentChatId) return;
    const isBlocked = currentUser.blockedUsers && currentUser.blockedUsers[currentChatUser.uid];
    if (isBlocked) { showToast('You blocked this user', 'error'); return; }
    const otherBlocked = currentChatUser.blockedUsers && currentChatUser.blockedUsers[currentUser.uid];
    if (otherBlocked) { showToast('You are blocked', 'error'); return; }
    input.value = '';
    await db.ref('chats/' + currentChatId + '/participants').update({ [currentUser.uid]: true, [currentChatUser.uid]: true });
    await db.ref('chats/' + currentChatId).push({
        sender: currentUser.uid, receiver: currentChatUser.uid,
        text, timestamp: Date.now(), delivered: true, seen: false
    });
    db.ref('users/' + currentUser.uid).update({ typingTo: null });
    sendNotification('New message from ' + currentUser.username, text);
}

function handleMessageKeyPress(e) { if (e.key === 'Enter') sendMessage(); }

function handleTyping() {
    clearTimeout(typingTimeout);
    db.ref('users/' + currentUser.uid).update({ typingTo: currentChatUser?.uid || null });
    typingTimeout = setTimeout(() => {
        db.ref('users/' + currentUser.uid).update({ typingTo: null });
    }, 2000);
}

function listenForTyping() {
    if (!currentChatUser) return;
    db.ref('users/' + currentChatUser.uid + '/typingTo').on('value', snap => {
        const indicator = document.getElementById('typing-indicator');
        indicator.style.display = snap.val() === currentUser.uid ? 'block' : 'none';
    });
}

function showMessageContextMenu(e, msgId, msg) {
    selectedMessageId = msgId;
    const menu = document.getElementById('message-context-menu');
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.classList.add('active');
    document.querySelector('.context-menu-item.danger').style.display = msg.sender === currentUser.uid ? 'block' : 'none';
}

async function starMessage() {
    await db.ref('chats/' + currentChatId + '/' + selectedMessageId + '/starredBy/' + currentUser.uid).set(true);
    closeContextMenu();
    showToast('Message starred');
}

async function deleteForMe() {
    await db.ref('chats/' + currentChatId + '/' + selectedMessageId + '/deletedForMe/' + currentUser.uid).set(true);
    closeContextMenu();
    loadMessages();
}

async function deleteForEveryone() {
    await db.ref('chats/' + currentChatId + '/' + selectedMessageId).update({ deletedForEveryone: true });
    closeContextMenu();
    loadMessages();
}

function closeContextMenu() { document.querySelectorAll('.context-menu').forEach(m => m.classList.remove('active')); }

function toggleChatMenu() {
    const menu = document.getElementById('chat-options-menu');
    menu.style.right = '20px';
    menu.style.top = '70px';
    menu.classList.toggle('active');
}

function archiveChat() { showToast('Chat archived'); closeContextMenu(); }
function searchInChat() { showToast('Search coming soon'); closeContextMenu(); }
function viewStarredMessages() { showToast('Starred messages coming soon'); closeContextMenu(); }

async function toggleBlockUser() {
    const isBlocked = currentUser.blockedUsers && currentUser.blockedUsers[currentChatUser.uid];
    if (isBlocked) {
        await db.ref('users/' + currentUser.uid + '/blockedUsers/' + currentChatUser.uid).remove();
        currentUser.blockedUsers = currentUser.blockedUsers || {};
        delete currentUser.blockedUsers[currentChatUser.uid];
        showToast('User unblocked');
    } else {
        await db.ref('users/' + currentUser.uid + '/blockedUsers/' + currentChatUser.uid).set(true);
        currentUser.blockedUsers = currentUser.blockedUsers || {};
        currentUser.blockedUsers[currentChatUser.uid] = true;
        showToast('User blocked');
    }
    document.getElementById('block-user-btn').textContent = isBlocked ? '🚫 Block User' : '✓ Unblock User';
    closeContextMenu();
}

function searchChats(query) {
    document.querySelectorAll('.chat-item').forEach(item => {
        const name = item.querySelector('.chat-name').textContent.toLowerCase();
        item.style.display = name.includes(query.toLowerCase()) ? 'flex' : 'none';
    });
}

async function openNewChatModal() {
    openModal('new-chat-modal');
    // Clear previous search
    document.getElementById('uid-search-input').value = '';
    document.getElementById('uid-search-result').innerHTML = '';
}

// Copy UID to clipboard
function copyUID() {
    const uid = currentUser.uid;
    navigator.clipboard.writeText(uid).then(() => {
        showToast('UID copied to clipboard!');
    }).catch(() => {
        // Fallback for older browsers
        const temp = document.createElement('textarea');
        temp.value = uid;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        showToast('UID copied!');
    });
}



// Search user by UID and add as friend
async function searchByUID() {
    const uid = document.getElementById('uid-search-input').value.trim();
    const resultDiv = document.getElementById('uid-search-result');

    if (!uid) {
        showToast('Please enter a UID', 'error');
        return;
    }

    if (uid === currentUser.uid) {
        showToast('That is your own UID!', 'error');
        return;
    }

    resultDiv.innerHTML = '<p style="color:var(--text-secondary);">Searching...</p>';

    try {
        const snap = await db.ref('users/' + uid).once('value');
        if (snap.exists()) {
            const user = snap.val();
            resultDiv.innerHTML = `
                <div class="user-item" style="background:var(--glass-bg);border:1px solid var(--neon-purple);border-radius:12px;margin-top:12px;" onclick="startChatWithFoundUser('${uid}')">
                    <div class="avatar">${utilsModule.getInitial(user.username)}</div>
                    <div>
                        <div style="font-weight:600;">${utilsModule.escapeHtml(user.username)}</div>
                        <div style="font-size:12px;color:var(--text-secondary);">${user.online ? '🟢 Online' : '⚫ Offline'}</div>
                    </div>
                    <button class="btn btn-primary" style="margin-left:auto;padding:8px 16px;">Chat</button>
                </div>`;
            showToast('User found!', 'success');
        } else {
            resultDiv.innerHTML = '<p style="color:#ef4444;">❌ No user found with this UID</p>';
        }
    } catch (err) {
        resultDiv.innerHTML = '<p style="color:#ef4444;">Error: ' + err.message + '</p>';
    }
}

// Start chat with user found by UID
function startChatWithFoundUser(uid) {
    const user = allUsers[uid];
    if (user) {
        closeModal('new-chat-modal');
        openChat(uid, user);
    } else {
        // Fetch user data if not in cache
        db.ref('users/' + uid).once('value').then(snap => {
            if (snap.exists()) {
                allUsers[uid] = snap.val();
                closeModal('new-chat-modal');
                openChat(uid, snap.val());
            }
        });
    }
}

// ============ CALL MODULE ============
function startVoiceCall() { isVideoCall = false; initiateCall(); }
function startVideoCall() { isVideoCall = true; initiateCall(); }

async function initiateCall() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideoCall });
        peerConnection = new RTCPeerConnection(ICE_SERVERS);
        localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));
        peerConnection.ontrack = (e) => {
            remoteStream = e.streams[0];
            document.getElementById('remote-video').srcObject = remoteStream;
        };
        peerConnection.onicecandidate = (e) => {
            if (e.candidate) db.ref('calls/' + currentCallId + '/offerCandidates').push(e.candidate.toJSON());
        };
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        currentCallId = db.ref('calls').push().key;
        await db.ref('calls/' + currentCallId).set({
            from: currentUser.uid, to: currentChatUser.uid,
            offer: { type: offer.type, sdp: offer.sdp },
            state: 'ringing', isVideo: isVideoCall, timestamp: Date.now()
        });
        document.getElementById('call-avatar').textContent = utilsModule.getInitial(currentChatUser.username);
        document.getElementById('call-user-name').textContent = currentChatUser.username;
        document.getElementById('call-status').textContent = 'Calling...';
        document.getElementById('video-container').className = isVideoCall ? 'video-container active' : 'video-container';
        document.getElementById('local-video').srcObject = localStream;
        document.getElementById('incoming-call-actions').style.display = 'none';
        document.getElementById('active-call-actions').style.display = 'none';
        document.getElementById('outgoing-call-actions').style.display = 'flex';
        openModal('call-modal');
        db.ref('calls/' + currentCallId + '/answer').on('value', async snap => {
            if (snap.val() && peerConnection.signalingState !== 'stable') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(snap.val()));
                document.getElementById('call-status').textContent = 'Connected';
                document.getElementById('outgoing-call-actions').style.display = 'none';
                document.getElementById('active-call-actions').style.display = 'flex';
            }
        });
        db.ref('calls/' + currentCallId + '/answerCandidates').on('child_added', async snap => {
            await peerConnection.addIceCandidate(new RTCIceCandidate(snap.val()));
        });
        db.ref('calls/' + currentCallId + '/state').on('value', snap => {
            if (snap.val() === 'ended') endCall();
        });
    } catch (err) { showToast('Call failed: ' + err.message, 'error'); }
}

function listenForCalls() {
    db.ref('calls').orderByChild('to').equalTo(currentUser.uid).on('child_added', snap => {
        const call = snap.val();
        if (call.state !== 'ringing') return;
        currentCallId = snap.key;
        isVideoCall = call.isVideo;
        const caller = allUsers[call.from] || { username: 'Unknown' };
        document.getElementById('call-avatar').textContent = utilsModule.getInitial(caller.username);
        document.getElementById('call-user-name').textContent = caller.username;
        document.getElementById('call-status').textContent = 'Incoming call...';
        document.getElementById('incoming-call-actions').style.display = 'flex';
        document.getElementById('active-call-actions').style.display = 'none';
        document.getElementById('outgoing-call-actions').style.display = 'none';
        document.getElementById('video-container').className = isVideoCall ? 'video-container active' : 'video-container';
        openModal('call-modal');
        sendNotification('Incoming call', caller.username + ' is calling...');
    });
}

async function acceptCall() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideoCall });
        peerConnection = new RTCPeerConnection(ICE_SERVERS);
        localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));
        peerConnection.ontrack = (e) => {
            remoteStream = e.streams[0];
            document.getElementById('remote-video').srcObject = remoteStream;
        };
        peerConnection.onicecandidate = (e) => {
            if (e.candidate) db.ref('calls/' + currentCallId + '/answerCandidates').push(e.candidate.toJSON());
        };
        document.getElementById('local-video').srcObject = localStream;
        const callSnap = await db.ref('calls/' + currentCallId).once('value');
        const call = callSnap.val();
        await peerConnection.setRemoteDescription(new RTCSessionDescription(call.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await db.ref('calls/' + currentCallId).update({ answer: { type: answer.type, sdp: answer.sdp }, state: 'connected' });
        db.ref('calls/' + currentCallId + '/offerCandidates').on('child_added', async snap => {
            await peerConnection.addIceCandidate(new RTCIceCandidate(snap.val()));
        });
        document.getElementById('call-status').textContent = 'Connected';
        document.getElementById('incoming-call-actions').style.display = 'none';
        document.getElementById('active-call-actions').style.display = 'flex';
    } catch (err) { showToast('Accept failed: ' + err.message, 'error'); }
}

async function rejectCall() {
    await db.ref('calls/' + currentCallId).update({ state: 'ended' });
    closeModal('call-modal');
    cleanupCall();
}

async function endCall() {
    if (currentCallId) await db.ref('calls/' + currentCallId).update({ state: 'ended' });
    closeModal('call-modal');
    cleanupCall();
}

function cleanupCall() {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (peerConnection) peerConnection.close();
    localStream = null; remoteStream = null; peerConnection = null; currentCallId = null;
    document.getElementById('local-video').srcObject = null;
    document.getElementById('remote-video').srcObject = null;
}

function toggleMuteAudio() {
    if (localStream) {
        const track = localStream.getAudioTracks()[0];
        track.enabled = !track.enabled;
        document.getElementById('mute-audio-btn').classList.toggle('active');
    }
}

function toggleMuteVideo() {
    if (localStream) {
        const track = localStream.getVideoTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            document.getElementById('mute-video-btn').classList.toggle('active');
        }
    }
}

// ============ ADMIN MODULE ============
async function loadAdminData() {
    if (currentUser?.role !== 'admin') {
        showToast('Admin access only', 'error');
        showScreen('chats-home');
        return;
    }
    try {
        await Promise.all([
            loadAdminUsers(),
            loadAdminChats(),
            loadAdminLogs(),
            loadDatabaseTree(),
            loadAppStatus()
        ]);
    } catch (err) {
        console.error('Admin load error:', err);
        showToast('Error loading admin data', 'error');
    }
}

async function loadAdminUsers() {
    const tbody = document.getElementById('admin-users-body');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>';

    try {
        const snap = await db.ref('users').once('value');
        const users = snap.val() || {};
        tbody.innerHTML = '';

        let onlineCount = 0;
        let totalCount = 0;

        for (const uid in users) {
            const u = users[uid];
            if (!u) continue;
            totalCount++;
            if (u.online) onlineCount++;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><div class="avatar avatar-sm">${utilsModule.getInitial(u.username || 'U')}</div></td>
                <td>${utilsModule.escapeHtml(u.username || 'Unknown')}</td>
                <td>${utilsModule.escapeHtml(u.email || u.phone || 'N/A')}</td>
                <td><span class="badge ${u.role === 'admin' ? 'badge-admin' : ''}">${u.role || 'user'}</span></td>
                <td><span class="${u.online ? 'text-online' : ''}">${u.online ? '🟢 Online' : utilsModule.formatTime(u.lastOnline || 0)}</span></td>
                <td class="action-btns">
                    <button class="btn btn-sm btn-secondary" onclick="adminViewUser('${uid}')" title="View">👁️</button>
                    <button class="btn btn-sm btn-secondary" onclick="adminToggleRole('${uid}','${u.role || 'user'}')" title="Toggle Role">👑</button>
                    <button class="btn btn-sm btn-secondary" onclick="adminForceLogout('${uid}')" title="Force Logout">🚪</button>
                    <button class="btn btn-sm btn-danger" onclick="adminDeleteUser('${uid}')" title="Delete">🗑️</button>
                </td>`;
            tbody.appendChild(tr);
        }

        // Update stats if we add stats display
        console.log(`Admin: ${totalCount} users, ${onlineCount} online`);
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="color:#ef4444;">Error loading users</td></tr>';
        console.error(err);
    }
}

function adminViewUser(uid) {
    const user = allUsers[uid];
    if (user) {
        alert(`User Details:\n\nUID: ${uid}\nUsername: ${user.username}\nEmail: ${user.email || 'N/A'}\nRole: ${user.role || 'user'}\nStatus: ${user.online ? 'Online' : 'Offline'}\nLast Online: ${user.lastOnline ? new Date(user.lastOnline).toLocaleString() : 'N/A'}\nAbout: ${user.about || 'N/A'}`);
    }
}

function searchAdminUsers(query) {
    const rows = document.querySelectorAll('#admin-users-body tr');
    rows.forEach(tr => {
        const text = tr.textContent.toLowerCase();
        tr.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
}

async function loadAdminChats() {
    const list = document.getElementById('admin-chats-list');
    list.innerHTML = '<div style="color:var(--text-secondary);">Loading chats...</div>';

    try {
        const snap = await db.ref('chats').once('value');
        const chats = snap.val() || {};
        list.innerHTML = '';

        let chatCount = 0;
        for (const chatId in chats) {
            chatCount++;
            const chat = chats[chatId];
            const participants = Object.keys(chat.participants || {});

            // Count messages
            const msgCount = Object.keys(chat).filter(k => k !== 'participants').length;

            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary admin-chat-btn';
            btn.innerHTML = `<span>${participants.map(p => allUsers[p]?.username || p.slice(0, 6)).join(' ↔ ')}</span><small>${msgCount} msgs</small>`;
            btn.onclick = () => viewAdminChat(chatId);
            list.appendChild(btn);
        }

        if (chatCount === 0) {
            list.innerHTML = '<div style="color:var(--text-secondary);">No chats yet</div>';
        }
    } catch (err) {
        list.innerHTML = '<div style="color:#ef4444;">Error loading chats</div>';
        console.error(err);
    }
}

async function viewAdminChat(chatId) {
    const viewer = document.getElementById('admin-messages-viewer');
    viewer.innerHTML = '<div style="padding:20px;">Loading messages...</div>';

    try {
        const snap = await db.ref('chats/' + chatId).once('value');
        const chat = snap.val() || {};

        let html = '<div class="admin-chat-viewer"><h4>Chat Messages</h4><button class="btn btn-danger btn-sm" onclick="adminDeleteChat(\'' + chatId + '\')">🗑️ Delete Chat</button></div>';
        html += '<table class="admin-table"><thead><tr><th>Sender</th><th>Message</th><th>Time</th><th>Actions</th></tr></thead><tbody>';

        const messages = [];
        for (const msgId in chat) {
            if (msgId === 'participants' || !chat[msgId]?.timestamp) continue;
            messages.push({ id: msgId, ...chat[msgId] });
        }

        messages.sort((a, b) => a.timestamp - b.timestamp);

        for (const m of messages) {
            const senderName = allUsers[m.sender]?.username || m.sender?.slice(0, 6) || 'Unknown';
            html += `<tr>
                <td>${utilsModule.escapeHtml(senderName)}</td>
                <td>${m.deletedForEveryone ? '<em>Deleted</em>' : utilsModule.escapeHtml(m.text || '')}</td>
                <td>${utilsModule.formatFullTime(m.timestamp)}</td>
                <td><button class="btn btn-sm btn-danger" onclick="adminDeleteMessage('${chatId}','${m.id}')">🗑️</button></td>
            </tr>`;
        }

        html += '</tbody></table>';
        viewer.innerHTML = html;
    } catch (err) {
        viewer.innerHTML = '<div style="color:#ef4444;">Error loading messages</div>';
        console.error(err);
    }
}

async function adminDeleteChat(chatId) {
    showConfirm('Delete Chat', 'Delete this entire conversation?', async () => {
        await db.ref('chats/' + chatId).remove();
        loadAdminChats();
        document.getElementById('admin-messages-viewer').innerHTML = '';
        showToast('Chat deleted');
    });
}

async function adminDeleteMessage(chatId, msgId) {
    await db.ref('chats/' + chatId + '/' + msgId).update({ deletedForEveryone: true, text: '[Deleted by Admin]' });
    viewAdminChat(chatId);
    showToast('Message deleted');
}

async function loadAdminLogs() {
    const list = document.getElementById('admin-logs-list');
    list.innerHTML = '<div style="color:var(--text-secondary);">Loading logs...</div>';

    try {
        const types = ['userSignup', 'userLogin', 'security', 'admin'];
        list.innerHTML = '';

        for (const type of types) {
            const snap = await db.ref('logs/' + type).limitToLast(20).once('value');
            const logs = snap.val() || {};

            const section = document.createElement('div');
            section.className = 'glass-card admin-log-section';
            section.innerHTML = `<h4>${type} <small>(${Object.keys(logs).length})</small></h4>`;

            const logEntries = Object.entries(logs).reverse();
            if (logEntries.length === 0) {
                section.innerHTML += '<p style="color:var(--text-secondary);font-size:12px;">No logs</p>';
            } else {
                for (const [id, log] of logEntries) {
                    const p = document.createElement('p');
                    p.className = 'log-entry';
                    p.innerHTML = `<span class="log-time">${utilsModule.formatFullTime(log.timestamp)}</span> ${JSON.stringify(log).slice(0, 100)}...`;
                    section.appendChild(p);
                }
            }
            list.appendChild(section);
        }
    } catch (err) {
        list.innerHTML = '<div style="color:#ef4444;">Error loading logs</div>';
        console.error(err);
    }
}

async function loadDatabaseTree() {
    const tree = document.getElementById('db-tree-viewer');
    tree.innerHTML = '<div style="color:var(--text-secondary);">Loading database...</div>';

    try {
        const snap = await db.ref('/').once('value');
        const data = snap.val();
        tree.innerHTML = '';

        if (!data) {
            tree.innerHTML = '<div style="color:var(--text-secondary);">Database is empty</div>';
            return;
        }

        renderDbNode(tree, data, '');
    } catch (err) {
        tree.innerHTML = '<div style="color:#ef4444;">Error loading database. Check rules.</div>';
        console.error(err);
    }
}

function renderDbNode(parent, data, path) {
    if (typeof data !== 'object' || data === null) {
        const node = document.createElement('div');
        node.className = 'db-leaf';
        const key = path.split('/').pop() || 'root';
        node.innerHTML = `<span class="db-key">${key}</span>: <span class="db-value">${JSON.stringify(data)}</span>`;
        parent.appendChild(node);
    } else {
        for (const key in data) {
            const node = document.createElement('div');
            node.className = 'db-node';

            const isObject = typeof data[key] === 'object' && data[key] !== null;
            const childCount = isObject ? Object.keys(data[key]).length : 0;

            node.innerHTML = `<span class="db-key ${isObject ? 'db-expandable' : ''}">${isObject ? '▶ ' : ''}${key}${isObject ? ` (${childCount})` : ': ' + JSON.stringify(data[key]).slice(0, 50)}</span>`;

            if (isObject) {
                const children = document.createElement('div');
                children.className = 'db-children';
                children.style.display = 'none';
                renderDbNode(children, data[key], path + '/' + key);

                node.querySelector('.db-key').onclick = (e) => {
                    e.stopPropagation();
                    const arrow = node.querySelector('.db-key');
                    if (children.style.display === 'none') {
                        children.style.display = 'block';
                        arrow.innerHTML = arrow.innerHTML.replace('▶', '▼');
                    } else {
                        children.style.display = 'none';
                        arrow.innerHTML = arrow.innerHTML.replace('▼', '▶');
                    }
                };
                node.appendChild(children);
            }
            parent.appendChild(node);
        }
    }
}

async function loadAppStatus() {
    try {
        const snap = await db.ref('admin/appDisabled').once('value');
        document.getElementById('app-disabled-toggle').checked = snap.val() || false;
    } catch (err) {
        console.error('Error loading app status:', err);
    }
}

async function toggleAppDisabled() {
    const disabled = document.getElementById('app-disabled-toggle').checked;
    await db.ref('admin/appDisabled').set(disabled);
    await logAction('admin', { action: 'toggleApp', disabled, by: currentUser.uid });
    showToast(disabled ? 'App disabled for all users' : 'App enabled');
}

async function sendAnnouncement() {
    const text = document.getElementById('announcement-text').value.trim();
    if (!text) { showToast('Enter announcement text', 'error'); return; }

    await db.ref('admin/announcements').push({
        text,
        timestamp: Date.now(),
        from: currentUser.uid,
        fromName: currentUser.username
    });
    await logAction('admin', { action: 'announcement', text: text.slice(0, 50) });
    document.getElementById('announcement-text').value = '';
    showToast('Announcement sent to all users!');
}

async function adminForceLogout(uid) {
    if (uid === currentUser.uid) {
        showToast('Cannot logout yourself', 'error');
        return;
    }
    await db.ref('users/' + uid).update({ forceLogout: Date.now() });
    await logAction('admin', { action: 'forceLogout', targetUid: uid });
    showToast('User will be logged out on next action');
}

async function adminToggleRole(uid, currentRole) {
    if (uid === currentUser.uid) {
        showToast('Cannot change your own role', 'error');
        return;
    }
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    await db.ref('users/' + uid).update({ role: newRole });
    await logAction('admin', { action: 'changeRole', targetUid: uid, from: currentRole, to: newRole });
    loadAdminUsers();
    showToast(`Role changed to ${newRole}`);
}

async function adminDeleteUser(uid) {
    if (uid === currentUser.uid) {
        showToast('Cannot delete yourself', 'error');
        return;
    }
    showConfirm('Delete User', 'This will permanently remove this user. Continue?', async () => {
        await db.ref('users/' + uid).remove();
        await logAction('admin', { action: 'deleteUser', targetUid: uid });
        loadAdminUsers();
        showToast('User deleted successfully');
    });
}

// Check for force logout
function checkForceLogout() {
    if (!currentUser) return;
    db.ref('users/' + currentUser.uid + '/forceLogout').on('value', snap => {
        if (snap.val() && snap.val() > Date.now() - 5000) {
            showToast('You have been logged out by admin', 'error');
            handleLogout();
        }
    });
}

