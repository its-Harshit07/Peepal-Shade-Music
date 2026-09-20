import { songs } from './songs.js';

// ==========================================
// 1. LIVE DIGITAL CLOCK
// ==========================================
function updateClock() {
  const clockMainEl = document.getElementById('clock-main');
  const clockSecEl = document.getElementById('clock-sec');

  if (!clockMainEl || !clockSecEl) return;

  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  clockMainEl.textContent = `${hours}:${minutes}`;
  clockSecEl.textContent = seconds;
}

updateClock();
setInterval(updateClock, 1000);

// ==========================================
// 2. REAL-TIME VISITOR COUNT (WEBSOCKET)
// ==========================================
function initVisitorCount() {
  const textEl = document.getElementById('visitor-count-text');
  if (!textEl) return;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  let ws;
  let reconnectTimeout;

  function connect() {
    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'count' && typeof data.count === 'number') {
            const count = data.count;
            textEl.textContent = `${count} ${count === 1 ? 'person is' : 'people are'} here rn.`;
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
        ws.close();
      };
    } catch (e) {
      console.error('WebSocket initialization error:', e);
    }
  }

  connect();
}

initVisitorCount();

// ==========================================
// 3. RADIO MUSIC NOTE EMITTER ANIMATION
// ==========================================
let noteEmitterInterval = null;

function emitSingleNote() {
  const container = document.getElementById('radio-emitter');
  if (!container) return;

  const noteSymbols = ['♪', '♫'];
  const symbol = noteSymbols[Math.floor(Math.random() * noteSymbols.length)];
  const noteEl = document.createElement('span');
  noteEl.className = 'radio-note';
  noteEl.textContent = symbol;

  // Random subtle horizontal drift (-5px to +5px)
  const driftX = (Math.random() * 10 - 5).toFixed(1);
  noteEl.style.setProperty('--drift-x', `${driftX}px`);

  container.appendChild(noteEl);

  // Auto cleanup note DOM node
  setTimeout(() => {
    noteEl.remove();
  }, 2200);
}

function startNoteAnimation() {
  stopNoteAnimation();
  emitSingleNote();
  noteEmitterInterval = setInterval(() => {
    emitSingleNote();
  }, 1300);
}

function stopNoteAnimation() {
  if (noteEmitterInterval) {
    clearInterval(noteEmitterInterval);
    noteEmitterInterval = null;
  }
  const container = document.getElementById('radio-emitter');
  if (container) {
    container.innerHTML = '';
  }
}

// ==========================================
// 4. YOUTUBE-BACKED MUSIC ARCHITECTURE
// ==========================================
let player = null;
let playerReady = false;
let currentIndex = 0;
let isPlaying = false;
let progressTimer = null;

// Formatter helper (seconds -> M:SS)
function formatTime(sec) {
  if (isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

// Update UI metadata & track state
function loadTrack(index, autoPlay = true) {
  if (!songs || songs.length === 0) return;

  stopNoteAnimation();

  currentIndex = (index + songs.length) % songs.length;
  const song = songs[currentIndex];

  const trackNumEl = document.getElementById('track-number');
  const trackTitleEl = document.getElementById('track-title');
  const trackArtistEl = document.getElementById('track-artist');
  const trackPublisherEl = document.getElementById('track-publisher');
  const coverImg = document.getElementById('cover-img');
  const placeholder = document.getElementById('artwork-placeholder');

  if (trackNumEl) trackNumEl.textContent = `Track ${currentIndex + 1} / ${songs.length}`;
  if (trackTitleEl) trackTitleEl.textContent = song.title;
  if (trackArtistEl) trackArtistEl.textContent = `${song.artist} • ${song.album} (${song.year})`;
  
  if (trackPublisherEl) {
    trackPublisherEl.textContent = `Source: ${song.publisher} ↗`;
    trackPublisherEl.href = song.channelUrl || song.youtubeUrl;
  }

  if (coverImg && song.artwork) {
    coverImg.src = song.artwork;
    coverImg.classList.remove('hidden');
    placeholder?.classList.add('hidden');
  } else {
    coverImg?.classList.add('hidden');
    placeholder?.classList.remove('hidden');
  }

  // Highlight active song in library list if open
  updateLibraryActiveHighlight();

  // Load into YouTube Player
  if (playerReady && player) {
    if (autoPlay) {
      player.loadVideoById(song.youtubeVideoId);
      isPlaying = true;
      updatePlayPauseIcons(true);
    } else {
      player.cueVideoById(song.youtubeVideoId);
    }
  }
}

// ==========================================
// 5. TRACK LIBRARY UI & SEARCH ARCHITECTURE
// ==========================================
let currentCategory = '90s';
let currentSearchQuery = '';

function openLibrary() {
  const overlay = document.getElementById('library-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    renderLibraryList();
    const input = document.getElementById('library-search-input');
    if (input) input.focus();
  }
}

function closeLibrary() {
  const overlay = document.getElementById('library-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

function renderLibraryList() {
  const listEl = document.getElementById('library-song-list');
  const badgeEl = document.getElementById('library-badge');
  const clearBtn = document.getElementById('btn-clear-search');

  if (!listEl) return;

  if (clearBtn) {
    if (currentSearchQuery.trim()) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
  }

  // Filter songs by selected category
  let categorySongs = songs.filter(s => (s.category || '90s').toLowerCase() === currentCategory.toLowerCase());

  // Filter by search query across title, artist, album, publisher
  const q = currentSearchQuery.trim().toLowerCase();
  let filtered = categorySongs;
  if (q) {
    filtered = categorySongs.filter(s => {
      const title = (s.title || '').toLowerCase();
      const artist = (s.artist || '').toLowerCase();
      const album = (s.album || '').toLowerCase();
      const pub = (s.publisher || '').toLowerCase();
      return title.includes(q) || artist.includes(q) || album.includes(q) || pub.includes(q);
    });
  }

  if (badgeEl) {
    badgeEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'Song' : 'Songs'}`;
  }

  listEl.innerHTML = '';

  if (filtered.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'no-results-msg';
    emptyMsg.textContent = q ? `No songs matching "${currentSearchQuery}" in ${currentCategory}` : `No songs in category ${currentCategory}`;
    listEl.appendChild(emptyMsg);
    return;
  }

  const currentPlayingId = songs[currentIndex]?.youtubeVideoId;

  filtered.forEach(song => {
    const isPlayingCurrent = (song.youtubeVideoId === currentPlayingId);
    const row = document.createElement('div');
    row.className = `song-row ${isPlayingCurrent ? 'is-playing-row' : ''}`;
    row.dataset.videoId = song.youtubeVideoId;

    row.innerHTML = `
      <div class="song-thumb-wrap">
        <img src="${song.artwork || ''}" alt="${song.title}" class="song-thumb" loading="lazy" />
        ${isPlayingCurrent ? '<div class="song-playing-overlay">▶</div>' : ''}
      </div>
      <div class="song-meta">
        <div class="song-row-title-bar">
          <span class="song-row-title">${song.title}</span>
          <span class="song-row-year">${song.year || ''}</span>
        </div>
        <div class="song-row-sub">
          <span class="song-row-artist">${song.artist || ''}</span>
          <span class="song-row-pub">${song.publisher || ''}</span>
        </div>
      </div>
    `;

    row.addEventListener('click', () => {
      const targetIdx = songs.findIndex(s => s.youtubeVideoId === song.youtubeVideoId);
      if (targetIdx !== -1) {
        loadTrack(targetIdx, true);
        renderLibraryList();
      }
    });

    listEl.appendChild(row);
  });
}

function updateLibraryActiveHighlight() {
  const overlay = document.getElementById('library-overlay');
  if (overlay && !overlay.classList.contains('hidden')) {
    renderLibraryList();
  }
}

function initLibraryControls() {
  const btnLibrary = document.getElementById('btn-library');
  const btnClose = document.getElementById('btn-close-library');
  const backdrop = document.getElementById('library-backdrop');
  const searchInput = document.getElementById('library-search-input');
  const clearBtn = document.getElementById('btn-clear-search');
  const tabs = document.querySelectorAll('#library-tabs .tab-btn');

  btnLibrary?.addEventListener('click', openLibrary);
  btnClose?.addEventListener('click', closeLibrary);
  backdrop?.addEventListener('click', closeLibrary);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.dataset.category || '90s';
      renderLibraryList();
    });
  });

  searchInput?.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    renderLibraryList();
  });

  clearBtn?.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = '';
      currentSearchQuery = '';
      renderLibraryList();
      searchInput.focus();
    }
  });

  // ESC key to close library
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLibrary();
    }
  });
}

function updatePlayPauseIcons(playing) {
  const btnPlay = document.getElementById('btn-play');
  const iconPlay = btnPlay?.querySelector('.icon-play');
  const iconPause = btnPlay?.querySelector('.icon-pause');

  if (playing) {
    iconPlay?.classList.add('hidden');
    iconPause?.classList.remove('hidden');
  } else {
    iconPlay?.classList.remove('hidden');
    iconPause?.classList.add('hidden');
  }
}

function togglePlay() {
  if (!playerReady || !player) return;

  if (isPlaying) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
}

function nextTrack() {
  loadTrack(currentIndex + 1, isPlaying || playerReady);
}

function prevTrack() {
  if (playerReady && player && typeof player.getCurrentTime === 'function' && player.getCurrentTime() > 3) {
    player.seekTo(0, true);
  } else {
    loadTrack(currentIndex - 1, isPlaying || playerReady);
  }
}

function startProgressPolling() {
  stopProgressPolling();
  progressTimer = setInterval(() => {
    if (!playerReady || !player || typeof player.getCurrentTime !== 'function') return;

    const current = player.getCurrentTime() || 0;
    const duration = player.getDuration() || 0;

    const timeCurrentEl = document.getElementById('time-current');
    const timeTotalEl = document.getElementById('time-total');
    const progressFillEl = document.getElementById('progress-fill');

    if (timeCurrentEl) timeCurrentEl.textContent = formatTime(current);
    if (timeTotalEl) timeTotalEl.textContent = formatTime(duration);

    if (progressFillEl && duration > 0) {
      const pct = Math.min(100, Math.max(0, (current / duration) * 100));
      progressFillEl.style.width = `${pct}%`;
    }
  }, 250);
}

function stopProgressPolling() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

// Global YouTube API Event Handlers
window.onYouTubeIframeAPIReady = function() {
  player = new window.YT.Player('youtube-player', {
    height: '100%',
    width: '100%',
    videoId: songs[0]?.youtubeVideoId || 'QKfGl39ZJWI',
    playerVars: {
      autoplay: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      enablejsapi: 1,
      origin: window.location.origin
    },
    events: {
      onReady: (event) => {
        playerReady = true;
        loadTrack(0, false);
        bindControls();
        initLibraryControls();
      },
      onStateChange: (event) => {
        // YT.PlayerState: ENDED (0), PLAYING (1), PAUSED (2), BUFFERING (3), CUED (5)
        if (event.data === window.YT.PlayerState.PLAYING) {
          isPlaying = true;
          updatePlayPauseIcons(true);
          startProgressPolling();
          startNoteAnimation();
        } else if (event.data === window.YT.PlayerState.PAUSED) {
          isPlaying = false;
          updatePlayPauseIcons(false);
          stopProgressPolling();
          stopNoteAnimation();
        } else if (event.data === window.YT.PlayerState.ENDED) {
          isPlaying = false;
          updatePlayPauseIcons(false);
          stopProgressPolling();
          stopNoteAnimation();
          // Auto-advance to next track
          nextTrack();
        }
      },
      onError: (event) => {
        console.warn('YouTube Player error:', event.data);
        stopNoteAnimation();
        const trackPublisherEl = document.getElementById('track-publisher');
        if (trackPublisherEl) {
          trackPublisherEl.textContent = 'Embed restricted - skipping ↗';
        }
        setTimeout(() => nextTrack(), 1500);
      }
    }
  });
};

function bindControls() {
  const btnPlay = document.getElementById('btn-play');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const progressContainer = document.getElementById('progress-container');

  btnPlay?.addEventListener('click', togglePlay);
  btnPrev?.addEventListener('click', prevTrack);
  btnNext?.addEventListener('click', nextTrack);

  progressContainer?.addEventListener('click', (e) => {
    if (!playerReady || !player || typeof player.getDuration !== 'function') return;

    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const pct = Math.max(0, Math.min(1, clickX / width));
    const targetDuration = player.getDuration() || 0;
    
    if (targetDuration > 0) {
      player.seekTo(pct * targetDuration, true);
    }
  });
}

