// Server Configuration - Dynamic API URL (works locally and deployed)
const API_URL = `${window.location.protocol}//${window.location.host}/api`;

// Donation URL (update this with your donation link)
const DONATION_URL = 'https://buymeacoffee.com/invader';

let currentSongIndex = 0;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 'off';

// Master Working Arrays
let workingDisplayList = [...songList]; // Dynamic, filtered array mapping the current layout
let playbackOrder = [...songList].map((_, i) => i); 
let animationFrameId = null;

// DOM Elements
const audio = document.getElementById('audio-player');
const songsGrid = document.getElementById('songs-grid');
const playPauseBtn = document.getElementById('btn-play-pause');
const prevBtn = document.getElementById('btn-prev');
const nextBtn = document.getElementById('btn-next');
const shuffleBtn = document.getElementById('btn-shuffle');
const repeatBtn = document.getElementById('btn-repeat');
const repeatAllIcon = repeatBtn.querySelector('.repeat-all-icon');
const repeatOneIcon = repeatBtn.querySelector('.repeat-one-icon');
const progressSlider = document.getElementById('progress-slider');
const progressFill = document.getElementById('progress-fill');
const currentTimeLabel = document.getElementById('player-time');
const durationLabel = document.getElementById('player-duration');
const headerBg = document.getElementById('header-bg');
const currentTitle = document.getElementById('current-title');
const currentArtist = document.getElementById('current-artist');
const sortSelect = document.getElementById('sort-select');
const dynamicHeader = document.getElementById('dynamic-header');
const searchInput = document.getElementById('search-input');

// Application Setup Bootloader Loop
function initApp() {
    // Select a random song on load
    if (songList && songList.length > 0) {
        currentSongIndex = Math.floor(Math.random() * songList.length);
    }
    
    preloadSongDurations().then(() => {
        applySorting(); // Sorts and renders grid automatically
        loadSong(currentSongIndex, false);
    }).catch(err => {
        console.error('Error initializing app:', err);
    });
}

// Background utility to scan your audio directory lengths for duration calculations
function preloadSongDurations() {
    const promises = songList.map(song => {
        return new Promise(resolve => {
            const tempAudio = new Audio();
            tempAudio.src = song.audioSrc;
            tempAudio.addEventListener('loadedmetadata', () => {
                song.duration = tempAudio.duration; // Store calculated duration internally
                resolve();
            });
            tempAudio.addEventListener('error', () => {
                song.duration = 0; // Fallback security check
                resolve();
            });
        });
    });
    return Promise.all(promises);
}

// Sorting Evaluation Logic Engine
function applySorting() {
    const sortBy = sortSelect?.value || 'default';
    const query = searchInput?.value?.toLowerCase().trim() || '';

    // Step 1: Filter based on your search input text criteria
    if (query !== '') {
        workingDisplayList = songList.filter(song => 
            song.title.toLowerCase().includes(query) || 
            song.artist.toLowerCase().includes(query)
        );
    } else {
        workingDisplayList = [...songList];
    }

    if (sortBy === 'alpha') {
        workingDisplayList.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'artist') {
        workingDisplayList.sort((a, b) => a.artist.localeCompare(b.artist));
    } else if (sortBy === 'long-short') {
        workingDisplayList.sort((a, b) => b.duration - a.duration);
    } else if (sortBy === 'short-long') {
        workingDisplayList.sort((a, b) => a.duration - b.duration);
    } else {
        // Fallback default registration template layout sequence
        workingDisplayList.sort((a, b) => a.title.localeCompare(b.title));
    }

    renderGrid();
    rebuildPlaybackOrder();
}

function renderGrid() {
    if (!songsGrid) {
        console.error('Songs grid element not found');
        return;
    }
    
    songsGrid.innerHTML = '';
    workingDisplayList.forEach((song) => {
        // Find structural index pointer address map inside native source layout array
        const internalIndex = songList.findIndex(item => item.id === song.id);
        
        const card = document.createElement('div');
        card.classList.add('song-card');
        card.onclick = () => {
            // If already playing, pulse the title instead
            if (currentSongIndex === internalIndex && isPlaying) {
                currentTitle.classList.remove('pulse-attention');
                // Trigger reflow to restart animation
                void currentTitle.offsetWidth;
                currentTitle.classList.add('pulse-attention');
            } else {
                currentSongIndex = internalIndex;
                loadSong(currentSongIndex, true);
            }
        };

        const inversionClass = song.isInverted ? 'class="fix-colors"' : '';

        card.innerHTML = `
            <div class="img-container">
                <img src="${song.coverSrc}" alt="${song.title}" ${inversionClass}>
                <button class="grid-play-btn">▶</button>
            </div>
            <h4>${song.title}</h4>
            <p style="color: #6b7280; font-size: 0.8rem; margin-top: 4px;">${song.artist}</p>
        `;
        songsGrid.appendChild(card);
    });
}

function loadSong(index, startPlaying = true) {
    const song = songList[index];
    if (!song) return;

    audio.src = song.audioSrc;
    currentTitle.innerText = song.title;
    currentArtist.innerText = song.artist;
    headerBg.style.backgroundImage = `url('${song.coverSrc}')`;

    progressSlider.value = 0;
    progressFill.style.width = '0%';
    currentTimeLabel.innerText = "0:00";

    if (startPlaying) {
        playSong();
    } else {
        pauseSong();
    }
}

function playSong() {
    isPlaying = true;
    const playIcon = playPauseBtn.querySelector('.play-icon');
    const pauseIcon = playPauseBtn.querySelector('.pause-icon');
    if (playIcon) playIcon.style.display = 'none';
    if (pauseIcon) pauseIcon.style.display = 'block';
    
    audio.play().catch(err => console.log("Playback interaction blocked:", err));
    
    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(smoothTimelineUpdate);
}

function pauseSong() {
    isPlaying = false;
    const playIcon = playPauseBtn.querySelector('.play-icon');
    const pauseIcon = playPauseBtn.querySelector('.pause-icon');
    if (playIcon) playIcon.style.display = 'block';
    if (pauseIcon) pauseIcon.style.display = 'none';
    audio.pause();
    cancelAnimationFrame(animationFrameId);
}

function smoothTimelineUpdate() {
    if (!isNaN(audio.duration) && audio.duration > 0) {
        const currentTime = audio.currentTime;
        const duration = audio.duration;
        const percentage = (currentTime / duration) * 100;
        
        progressSlider.value = percentage;
        progressFill.style.width = `${percentage}%`;
        currentTimeLabel.innerText = formatTime(currentTime);
    }
    if (isPlaying) {
        animationFrameId = requestAnimationFrame(smoothTimelineUpdate);
    }
}

function rebuildPlaybackOrder() {
    if (isShuffle) {
        let arr = workingDisplayList.map(song => songList.findIndex(item => item.id === song.id));
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        playbackOrder = [currentSongIndex, ...arr.filter(i => i !== currentSongIndex)];
    } else {
        playbackOrder = workingDisplayList.map(song => songList.findIndex(item => item.id === song.id));
    }
}

function nextSong() {
    let orderIndex = playbackOrder.indexOf(currentSongIndex);
    if (orderIndex < playbackOrder.length - 1) {
        currentSongIndex = playbackOrder[orderIndex + 1];
        loadSong(currentSongIndex, true);
    } else if (repeatMode === 'all') {
        currentSongIndex = playbackOrder[0];
        loadSong(currentSongIndex, true);
    } else {
        pauseSong();
    }
}

function prevSong() {
    let orderIndex = playbackOrder.indexOf(currentSongIndex);
    if (orderIndex > 0) {
        currentSongIndex = playbackOrder[orderIndex - 1];
    } else {
        currentSongIndex = playbackOrder[playbackOrder.length - 1];
    }
    loadSong(currentSongIndex, true);
}


function formatTime(secs) {
    let min = Math.floor(secs / 60);
    let sec = Math.floor(secs % 60);
    if (sec < 10) sec = `0${sec}`;
    return `${min}:${sec}`;
}



// Event Configuration Maps
playPauseBtn.addEventListener('click', () => isPlaying ? pauseSong() : playSong());
nextBtn.addEventListener('click', nextSong);
prevBtn.addEventListener('click', prevSong);
searchInput.addEventListener('input', applySorting);
sortSelect.addEventListener('change', applySorting);

shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active', isShuffle);
    rebuildPlaybackOrder();
});

function updateRepeatButtonVisual() {
    const isRepeatOne = repeatMode === 'one';
    repeatAllIcon.style.display = isRepeatOne ? 'none' : 'block';
    repeatOneIcon.style.display = isRepeatOne ? 'block' : 'none';
    repeatBtn.classList.toggle('active', repeatMode !== 'off');
    repeatBtn.title = repeatMode === 'off' ? 'Repeat Off' : repeatMode === 'all' ? 'Repeat All' : 'Repeat One';
}

repeatBtn.addEventListener('click', () => {
    if (repeatMode === 'off') {
        repeatMode = 'all';
    } else if (repeatMode === 'all') {
        repeatMode = 'one';
    } else {
        repeatMode = 'off';
    }
    updateRepeatButtonVisual();
});

updateRepeatButtonVisual();

// Download button functionality
document.getElementById('btn-download').addEventListener('click', downloadCurrentSong);

function downloadCurrentSong() {
    const song = songList[currentSongIndex];
    if (!song) return;
    
    const link = document.createElement('a');
    link.href = song.audioSrc;
    link.download = `${song.title}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Donation button functionality
document.getElementById('btn-donate').addEventListener('click', openDonationLink);

function openDonationLink() {
    window.open(DONATION_URL, '_blank');
}

audio.addEventListener('loadedmetadata', () => {
    durationLabel.innerText = formatTime(audio.duration);
});

progressSlider.addEventListener('input', () => {
    const targetTime = (progressSlider.value / 100) * audio.duration;
    audio.currentTime = targetTime;
    progressFill.style.width = `${progressSlider.value}%`;
    currentTimeLabel.innerText = formatTime(targetTime);
});

document.getElementById('volume-slider').addEventListener('input', (e) => {
    audio.volume = e.target.value;
});

audio.addEventListener('ended', () => {
    if (repeatMode === 'one') {
        audio.currentTime = 0;
        playSong();
    } else {
        nextSong();
    }
});

window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
        dynamicHeader.classList.add('scrolled');
    } else {
        dynamicHeader.classList.remove('scrolled');
    }
});

// ========== DEVELOPER MODE WITH PASSWORD PROTECTION ==========
let devModeEnabled = false;
let devPasswordVerified = false;
let currentPasswordGeneration = 0; // Track password generation to detect when old password becomes invalid
const devPanel = document.getElementById('dev-panel');
const devPasswordModal = document.getElementById('dev-password-modal');
const devPasswordInput = document.getElementById('dev-password-input');
const devPasswordVerifyBtn = document.getElementById('dev-password-verify');
const devPasswordRequestBtn = document.getElementById('dev-password-request');
const devPasswordCancelBtn = document.getElementById('dev-password-cancel');
const devPasswordStatus = document.getElementById('dev-password-status');
const devResetAllBtn = document.getElementById('dev-reset-all');
const devResetSongBtn = document.getElementById('dev-reset-song');
const devSetCountBtn = document.getElementById('dev-set-count');
const devCloseBtn = document.getElementById('dev-close');
const devSongSelect = document.getElementById('dev-song-select');
const devCustomCount = document.getElementById('dev-custom-count');

// Toggle developer mode with Ctrl+Shift+D
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        devModeEnabled = !devModeEnabled;
        if (devModeEnabled) {
            devPasswordVerified = false;
            devPasswordInput.value = '';
            devPasswordStatus.textContent = '';
            devPasswordStatus.className = 'dev-password-status';
            devPasswordModal.classList.remove('hidden');
            devPasswordInput.focus();
            checkPasswordStatus();
            startPasswordValidityCheck(); // Start checking for password invalidation
        } else {
            closeDevPanel();
            stopPasswordValidityCheck(); // Stop checking when closing
        }
    }
});

function closeDevPanel() {
    devModeEnabled = false;
    devPasswordVerified = false;
    devPanel.classList.add('hidden');
    devPasswordModal.classList.add('hidden');
    devPasswordInput.value = '';
    devPasswordStatus.textContent = '';
    devPasswordStatus.className = 'dev-password-status';
}

function populateDevSongSelect() {
    devSongSelect.innerHTML = '';
    songList.forEach(song => {
        const option = document.createElement('option');
        option.value = song.id;
        option.textContent = `${song.title} - ${song.artist}`;
        devSongSelect.appendChild(option);
    });
}

async function checkPasswordStatus() {
    try {
        const response = await fetch(`${API_URL}/admin/password-status`);
        const data = await response.json();
        
        // Check if a new password was generated (generation changed)
        if (devPasswordVerified && currentPasswordGeneration !== data.generation) {
            devPasswordVerified = false; // Invalidate old password
            devPasswordStatus.textContent = 'Password regenerated. Please enter the new password.';
            devPasswordStatus.className = 'dev-password-status info';
            devPasswordInput.value = '';
            return;
        }
        
        if (data.hasPassword) {
            devPasswordStatus.textContent = 'Enter your password to proceed';
            devPasswordStatus.className = 'dev-password-status info';
        } else if (!data.canRequestNew) {
            devPasswordStatus.textContent = `Next password available in ${data.minutesUntilNextRequest} minute(s)`;
            devPasswordStatus.className = 'dev-password-status info';
        } else {
            devPasswordStatus.textContent = 'No password active. Request one via email.';
            devPasswordStatus.className = 'dev-password-status info';
        }
    } catch (err) {
        console.error('Error checking password status:', err);
    }
}

async function requestNewPassword() {
    devPasswordStatus.textContent = 'Requesting new password...';
    devPasswordStatus.className = 'dev-password-status info';
    
    try {
        const response = await fetch(`${API_URL}/admin/request-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            devPasswordStatus.textContent = '✓ Password sent to your email!';
            devPasswordStatus.className = 'dev-password-status success';
            devPasswordVerified = false; // Invalidate old password when new one is generated
            currentPasswordGeneration = 0; // Reset generation tracking
            devPasswordInput.value = '';
            devPasswordInput.focus();
        } else {
            devPasswordStatus.textContent = '✗ ' + (data.error || 'Failed to request password');
            devPasswordStatus.className = 'dev-password-status error';
        }
    } catch (err) {
        console.error('Error requesting password:', err);
        devPasswordStatus.textContent = '✗ Error: ' + err.message;
        devPasswordStatus.className = 'dev-password-status error';
    }
}

async function verifyPassword() {
    const password = devPasswordInput.value.trim();
    
    if (!password) {
        devPasswordStatus.textContent = '✗ Please enter a password';
        devPasswordStatus.className = 'dev-password-status error';
        return;
    }
    
    devPasswordStatus.textContent = 'Verifying password...';
    devPasswordStatus.className = 'dev-password-status info';
    
    try {
        const response = await fetch(`${API_URL}/admin/verify-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            devPasswordVerified = true;
            currentPasswordGeneration = data.generation; // Store current generation
            devPasswordStatus.textContent = '✓ Access granted!';
            devPasswordStatus.className = 'dev-password-status success';
            devPasswordModal.classList.add('hidden');
            devPanel.classList.remove('hidden');
            populateDevSongSelect();
            setTimeout(() => {
                devPasswordInput.value = '';
            }, 500);
        } else {
            devPasswordStatus.textContent = '✗ ' + (data.error || 'Invalid password');
            devPasswordStatus.className = 'dev-password-status error';
            devPasswordInput.select();
        }
    } catch (err) {
        console.error('Error verifying password:', err);
        devPasswordStatus.textContent = '✗ Error: ' + err.message;
        devPasswordStatus.className = 'dev-password-status error';
    }
}

async function adminResetAll() {
    if (!devPasswordVerified) {
        alert('Password verification required');
        return;
    }
    
    try {
        const url = `${API_URL}/admin/reset-all`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('All play counts reset to 0');
            songList.forEach(song => song.playCount = 0);
            renderGrid();
        } else {
            alert('Failed to reset play counts: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error resetting play counts:', err);
        alert('Error: ' + err.message);
    }
}

async function adminResetSong() {
    if (!devPasswordVerified) {
        alert('Password verification required');
        return;
    }
    
    const songId = parseInt(devSongSelect.value);
    try {
        const url = `${API_URL}/admin/reset/${songId}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const song = songList.find(s => s.id === songId);
            if (song) {
                song.playCount = 0;
                renderGrid();
                alert(`Play count for "${song.title}" reset to 0`);
            }
        } else {
            alert('Failed to reset play count: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error resetting play count:', err);
        alert('Error: ' + err.message);
    }
}

async function adminSetCount() {
    if (!devPasswordVerified) {
        alert('Password verification required');
        return;
    }
    
    const songId = parseInt(devSongSelect.value);
    const count = parseInt(devCustomCount.value);
    
    if (isNaN(count) || count < 0) {
        alert('Please enter a valid count (0 or higher)');
        return;
    }
    
    try {
        const url = `${API_URL}/admin/set/${songId}/${count}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const song = songList.find(s => s.id === songId);
            if (song) {
                song.playCount = count;
                renderGrid();
                alert(`Play count for "${song.title}" set to ${count}`);
            }
        } else {
            alert('Failed to set play count: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error setting play count:', err);
        alert('Error: ' + err.message);
    }
}

// Password Modal Event Listeners
devPasswordVerifyBtn.addEventListener('click', verifyPassword);
devPasswordRequestBtn.addEventListener('click', requestNewPassword);
devPasswordCancelBtn.addEventListener('click', closeDevPanel);
devPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        verifyPassword();
    }
});

// Developer Panel Event Listeners
devResetAllBtn.addEventListener('click', adminResetAll);
devResetSongBtn.addEventListener('click', adminResetSong);
devSetCountBtn.addEventListener('click', adminSetCount);
devCloseBtn.addEventListener('click', closeDevPanel);

// Periodic check for password invalidation (every 5 seconds while dev panel is open)
let passwordCheckInterval = null;
function startPasswordValidityCheck() {
    if (passwordCheckInterval) return;
    passwordCheckInterval = setInterval(async () => {
        if (devPasswordVerified && !devPasswordModal.classList.contains('hidden')) {
            await checkPasswordStatus();
        }
    }, 5000);
}

function stopPasswordValidityCheck() {
    if (passwordCheckInterval) {
        clearInterval(passwordCheckInterval);
        passwordCheckInterval = null;
    }
}

// Run Application Execution Loop
initApp();
