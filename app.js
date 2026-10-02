/* DOM Selectors */
const openBookButton = document.querySelector('#open-book');
const mainTitle = document.querySelector('#main-title');
const bookLayout = document.querySelector('.book-layout');
const songList = document.querySelector('#song-list');
const lyricsContent = document.querySelector('#lyrics-content');
const searchInput = document.querySelector('#song-search');
const genreFilter = document.querySelector('#genre-filter');
const emptySearch = document.querySelector('#empty-search');
const catalogEmptyState = document.querySelector('#catalog-empty-state');
const songListToggle = document.querySelector('#song-list-toggle');
const collectionFilter = document.querySelector('#collection-filter');
const collectionFilterCurrent = document.querySelector('#collection-filter-current');
const randomSongButton = document.querySelector('#random-song');
const randomSongListButton = document.querySelector('#random-song-list');
const randomSongToolbarButton = document.querySelector('#random-song-toolbar');
const songLikeButton = document.querySelector('#song-like');
const songBookmarkButton = document.querySelector('#song-bookmark');
const homeMenuButton = document.querySelector('#home-menu-button');
const backButton = document.querySelector('#back-button');
const converterButton = document.querySelector('#converter-button');
const converterDialog = document.querySelector('#converter-dialog');
const closeConverter = document.querySelector('#close-converter');
const converterTitle = document.querySelector('#converter-title-input');
const converterGenre = document.querySelector('#converter-genre-input');
const converterAudio = document.querySelector('#converter-audio-input');
const converterLyrics = document.querySelector('#converter-lyrics-input');
const converterChords = document.querySelector('#converter-chords-input');
const converterOutput = document.querySelector('#converter-output');
const copyJsonButton = document.querySelector('#copy-json');
const downloadJsonButton = document.querySelector('#download-json');
const songAudio = document.querySelector('#song-audio');
const showChordsCheckbox = document.querySelector('#show-chords');
const transposeControls = document.querySelector('#transpose-controls');
const transposeDownButton = document.querySelector('#transpose-down');
const transposeUpButton = document.querySelector('#transpose-up');
const transposeStatus = document.querySelector('#transpose-status');
const showAudioCheckbox = document.querySelector('#show-audio');
const menuButton = document.querySelector('#menu-button');
const headerMenuPanel = document.querySelector('#header-menu-panel');
const headerMenuOverlay = document.querySelector('#header-menu-overlay');
const headerMenuClose = document.querySelector('#header-menu-close');
const songMenuButton = document.querySelector('#song-menu-button');
const songMenuPanel = document.querySelector('#song-menu-panel');
const songMenuOverlay = document.querySelector('#song-menu-overlay');
const songMenuClose = document.querySelector('#song-menu-close');

/* Load in and populate config values */
document.title = window.APP_NAME || 'Puke Mele';
const appNameEl = document.querySelector('#app-name');
if (appNameEl) appNameEl.textContent = window.APP_NAME || 'Puke Mele';
const pageTitleEl = document.querySelector('#page-title');
if (pageTitleEl) pageTitleEl.textContent = window.APP_NAME || 'Puke Mele';
const appTaglineEl = document.querySelector('#app-tagline');
if (appTaglineEl) appTaglineEl.textContent = window.APP_TAGLINE || '';
if (window.THEME_ACCENT) {
  document.documentElement.style.setProperty('--accent', window.THEME_ACCENT);
}
if (window.THEME_ACCENT_HOVER) {
  document.documentElement.style.setProperty('--accent-hover', window.THEME_ACCENT_HOVER);
}
if (window.THEME_MUTED) {
  document.documentElement.style.setProperty('--muted', window.THEME_MUTED);
}

/* Fields */
let songs = [];
let selectedIndex = 0;
let transposeSteps = 0;
let songEmbed = null;
let activeRandomDepth = 0;
const savedGenre = localStorage.getItem('lyrics-book-genre') || 'all';
const contentsScrollKey = 'lyrics-book-contents-scroll';
const songListVisibilityKey = 'lyrics-book-show-songs';
let areSongsVisible = localStorage.getItem(songListVisibilityKey) === 'true';
const collectionFilterKey = 'lyrics-book-collection-filter';
const collectionFilterOptions = ['all', 'liked', 'bookmarked'];
let activeCollectionFilter = localStorage.getItem(collectionFilterKey) || 'all';
if (!collectionFilterOptions.includes(activeCollectionFilter)) activeCollectionFilter = 'all';
const appHistoryKey = 'puke-mele';

/* LocalStorage to support save page state */
if (localStorage.getItem('lyrics-book-opened') === 'true') {
  document.body.classList.remove('landing-mode');
  document.body.classList.add('home-mode');
}

/* Bookmark Song Support */
const bookmarkedTitles = new Set(JSON.parse(localStorage.getItem('lyrics-book-bookmarks') || '[]'));
const likedTitles = new Set(JSON.parse(localStorage.getItem('lyrics-book-likes') || '[]'));

function isBookmarked(song) {
  return bookmarkedTitles.has(song.title);
}

function isLiked(song) {
  return likedTitles.has(song.title);
}

function toggleBookmark(song) {
  if (bookmarkedTitles.has(song.title)) {
    bookmarkedTitles.delete(song.title);
  } else {
    bookmarkedTitles.add(song.title);
  }
  localStorage.setItem('lyrics-book-bookmarks', JSON.stringify([...bookmarkedTitles]));
}

function toggleLike(song) {
  if (likedTitles.has(song.title)) {
    likedTitles.delete(song.title);
  } else {
    likedTitles.add(song.title);
  }
  localStorage.setItem('lyrics-book-likes', JSON.stringify([...likedTitles]));
}

const bookmarkIconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 3.5C6 2.67 6.67 2 7.5 2h9c.83 0 1.5.67 1.5 1.5v18l-6-4.2-6 4.2v-18z"/></svg>`;
const likeIconSvg = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>`;

/* Register Service Worker for offline capabilities */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  });
}

/* Load song data via config */
async function loadSongs() {
  try {
    const sources = window.SONG_SOURCES || ['songs.json'];
    const results = await Promise.all(sources.map(async (file) => {
      const response = await fetch(file, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Could not load ${file} (${response.status})`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error(`${file} must contain an array of songs.`);
      return data;
    }));
    songs = results.flat();
    populateGenreFilter();
    genreFilter.value = [...genreFilter.options].some(option => option.value === savedGenre) ? savedGenre : 'all';
    renderContents();
    if (!songs.length) showMessage('No songs yet. Add a song object to songs.json.');

    const savedSongIndex = localStorage.getItem('lyrics-book-current-song');
    const parsedSongIndex = Number.parseInt(savedSongIndex, 10);
    if (savedSongIndex !== null && parsedSongIndex >= 0 && parsedSongIndex < songs.length) {
      const isRandomSong = localStorage.getItem('lyrics-book-current-song-random') === 'true';
      navigateToAppView('song', parsedSongIndex, { random: isRandomSong });
    }
  } catch (error) {
    showMessage('Songs could not be loaded. Open this folder through a local web server if your browser blocks local JSON files.', true);
    console.error(error);
  }
}

/* Helper Functions */

// Allow userto type plain words without neding to type ʼokina or kahakō to look for songs
function normalizeForSearch(text) {
  return String(text)
    .toLowerCase()
    .replace(/[ʻʼ'`]/g, '')       // strip okina and apostrophe-like marks
    .normalize('NFD')              // decompose accented letters (ā → a + combining macron)
    .replace(/[\u0300-\u036f]/g, ''); // strip the combining marks, leaving plain vowels
}

function startsWithOkina(text) {
  return /^[ʻʼ'`]/.test(String(text).trim());
}

function renderContents() {
  const query = searchInput.value.trim().toLowerCase();
  const matches = songs
    .map((song, index) => ({ song, index }))
    .filter(({ song }) => normalizeForSearch(song.title).includes(normalizeForSearch(query)))
    .filter(({ song }) => genreFilter.value === 'all' || String(song.genre || '') === genreFilter.value)
    .filter(({ song }) => activeCollectionFilter === 'all'
      || (activeCollectionFilter === 'liked' && isLiked(song))
      || (activeCollectionFilter === 'bookmarked' && isBookmarked(song)));

  // Keep songs alphabetized while supporting okina and kahakō.
  const direction = 1;
  matches.sort((left, right) => {
      const leftTitle = String(left.song.title);
      const rightTitle = String(right.song.title);
      const leftNorm = normalizeForSearch(leftTitle);
      const rightNorm = normalizeForSearch(rightTitle);

      // 1) Group by the actual first letter (ignore okina/kahako for now)
      const leftBase = leftNorm.charAt(0);
      const rightBase = rightNorm.charAt(0);
      if (leftBase !== rightBase) return direction * leftBase.localeCompare(rightBase);

      // 2) Within the same letter group, okina-leading titles come first
      const leftOkina = startsWithOkina(leftTitle);
      const rightOkina = startsWithOkina(rightTitle);
      if (leftOkina !== rightOkina) return direction * (leftOkina ? -1 : 1);

      // 3) Otherwise sort normally within that subgroup
      const normCompare = leftNorm.localeCompare(rightNorm);
      if (normCompare !== 0) return direction * normCompare;

      // 4) Final tiebreak using the untouched original title (handles e.g. Alika vs Ālika)
      return direction * leftTitle.localeCompare(rightTitle);
  });

  // Bookmarked songs float to the top, preserving order within each group
  matches.sort((left, right) => Number(isBookmarked(right.song)) - Number(isBookmarked(left.song)));

  songList.replaceChildren(...matches.map(({ song, index }) => {
    const item = document.createElement('li');
    item.className = 'song-item';

    const button = document.createElement('button');
    button.className = 'song-link';
    button.type = 'button';
    button.textContent = song.title;
    button.setAttribute('aria-current', index === selectedIndex ? 'true' : 'false');
    button.addEventListener('click', () => {
      saveContentsScroll();
      navigateToAppView('song', index);
    });

    const liked = isLiked(song);
    const likeButton = document.createElement('button');
    likeButton.className = 'like-button';
    likeButton.type = 'button';
    likeButton.classList.toggle('is-liked', liked);
    likeButton.setAttribute('aria-label', liked ? `Unlike ${song.title}` : `Like ${song.title}`);
    likeButton.setAttribute('aria-pressed', String(liked));
    likeButton.innerHTML = likeIconSvg;
    likeButton.addEventListener('click', () => {
      toggleLike(song);
      renderContents();
    });

    const bookmarked = isBookmarked(song);
    const bookmarkButton = document.createElement('button');
    bookmarkButton.className = 'bookmark-button';
    bookmarkButton.type = 'button';
    bookmarkButton.classList.toggle('is-bookmarked', bookmarked);
    bookmarkButton.setAttribute('aria-label', bookmarked ? `Remove ${song.title} from bookmarks` : `Bookmark ${song.title}`);
    bookmarkButton.innerHTML = bookmarkIconSvg;
    bookmarkButton.addEventListener('click', () => {
      toggleBookmark(song);
      renderContents();
    });

    item.append(button, likeButton, bookmarkButton);
    return item;
  }));

  updateSongListVisibility();
}

function updateSongListVisibility() {
  songList.hidden = !areSongsVisible;
  catalogEmptyState.hidden = areSongsVisible;
  songListToggle.textContent = areSongsVisible ? 'Hide Songs' : 'Show All Songs';
  songListToggle.setAttribute('aria-expanded', String(areSongsVisible));
  emptySearch.hidden = !areSongsVisible || songList.children.length > 0;
}

function updateCollectionFilterButtons() {
  const labels = { all: 'All songs', liked: 'Liked', bookmarked: 'Bookmarked' };
  collectionFilterCurrent.textContent = labels[activeCollectionFilter];
  collectionFilter.querySelectorAll('[data-collection-filter]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.collectionFilter === activeCollectionFilter));
  });
}

/* Side Menu */
function setupSideMenu({ toggleButton, panel, overlay, closeButton }) {
  if (!toggleButton || !panel || !overlay) return null;

  function open() {
    overlay.hidden = false;
    requestAnimationFrame(() => {
      panel.classList.add('is-open');
      overlay.classList.add('is-open');
    });
    toggleButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('side-menu-locked');
  }

  function close() {
    panel.classList.remove('is-open');
    overlay.classList.remove('is-open');
    toggleButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('side-menu-locked');
    window.setTimeout(() => {
      if (!panel.classList.contains('is-open')) overlay.hidden = true;
    }, 300);
  }

  function toggle() {
    panel.classList.contains('is-open') ? close() : open();
  }

  toggleButton.addEventListener('click', toggle);
  overlay.addEventListener('click', close);
  if (closeButton) closeButton.addEventListener('click', close);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('is-open')) close();
  });

  return { open, close, toggle };
}

const headerSideMenu = setupSideMenu({
  toggleButton: menuButton,
  panel: headerMenuPanel,
  overlay: headerMenuOverlay,
  closeButton: headerMenuClose,
});

const songSideMenu = setupSideMenu({
  toggleButton: songMenuButton,
  panel: songMenuPanel,
  overlay: songMenuOverlay,
  closeButton: songMenuClose,
});

function populateGenreFilter() {
  const genres = [...new Set(songs.map(song => String(song.genre || '').trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
  genreFilter.replaceChildren(new Option('All genres', 'all'), ...genres.map(genre => new Option(genre, genre)));
}

function getMatchingSongs() {
  const query = searchInput.value.trim().toLowerCase();
  return songs
    .map((song, index) => ({ song, index }))
    .filter(({ song }) => normalizeForSearch(song.title).includes(normalizeForSearch(query)))
    .filter(({ song }) => genreFilter.value === 'all' || String(song.genre || '') === genreFilter.value);
}

function openRandomSong({ cycle = false } = {}) {
  let matches = getMatchingSongs();
  if (!matches.length) return;
  if (cycle && matches.length > 1) {
    matches = matches.filter(({ index }) => index !== selectedIndex);
  }
  const randomMatch = matches[Math.floor(Math.random() * matches.length)];
  saveContentsScroll();
  navigateToAppView('song', randomMatch.index, { random: true });
}

function saveContentsScroll() {
  const scrollTop = bookLayout.scrollTop;
  localStorage.setItem(contentsScrollKey, String(scrollTop));
  if (history.state?.app === appHistoryKey && history.state.view === 'home') {
    history.replaceState({ ...history.state, scrollTop }, '', location.href);
  }
}

function restoreContentsScroll(scrollTop) {
  const savedScroll = scrollTop ?? Number.parseInt(localStorage.getItem(contentsScrollKey) || '0', 10);
  requestAnimationFrame(() => {
    bookLayout.scrollTop = Number.isFinite(savedScroll) ? savedScroll : 0;
  });
}

function navigateToAppView(view, songIndex, { random = false } = {}) {
  const currentState = history.state;
  const isRandomSong = view === 'song' && random;
  if (currentState?.app === appHistoryKey
    && currentState.view === view
    && (view !== 'song' || (currentState.songIndex === songIndex && Boolean(currentState.random) === isRandomSong))) return;

  if (currentState?.app === appHistoryKey && currentState.view === 'home') saveContentsScroll();
  const nextState = { app: appHistoryKey, view };
  if (view === 'song') {
    nextState.songIndex = songIndex;
    if (isRandomSong) {
      nextState.random = true;
      nextState.randomDepth = currentState?.random
        ? (currentState.randomDepth || 1) + 1
        : 1;
    }
  }
  if (view === 'home') nextState.scrollTop = 0;
  history.pushState(nextState, '', location.href);
  renderAppView(nextState);
}

function renderAppView(state, isPopState = false) {
  const randomDepth = state.view === 'song' && state.random ? state.randomDepth || 1 : 0;
  if (isPopState && randomDepth > 0 && randomDepth < activeRandomDepth) {
    activeRandomDepth = randomDepth;
    history.go(-randomDepth);
    return;
  }
  activeRandomDepth = randomDepth;

  if (state.view === 'landing') {
    songAudio.pause();
    songAudio.currentTime = 0;
    document.body.classList.remove('home-mode', 'reading-mode');
    document.body.classList.add('landing-mode');
    localStorage.removeItem('lyrics-book-opened');
    localStorage.removeItem('lyrics-book-current-song');
    localStorage.removeItem('lyrics-book-current-song-random');
    return;
  }

  if (state.view === 'home') {
    songAudio.pause();
    songAudio.currentTime = 0;
    document.body.classList.remove('landing-mode', 'reading-mode');
    document.body.classList.add('home-mode');
    localStorage.setItem('lyrics-book-opened', 'true');
    localStorage.removeItem('lyrics-book-current-song');
    localStorage.removeItem('lyrics-book-current-song-random');
    restoreContentsScroll(state.scrollTop);
    return;
  }

  if (state.view === 'song' && songs[state.songIndex]) showSong(state.songIndex, state.random === true);
}

function initializeAppHistory() {
  const existingState = history.state && typeof history.state === 'object' ? history.state : {};
  const view = document.body.classList.contains('home-mode') ? 'home' : 'landing';
  history.replaceState({ ...existingState, app: appHistoryKey, view, scrollTop: 0 }, '', location.href);
}

function showSong(index, isRandomSong = false) {
  const song = songs[index];
  if (!song) return;
  randomSongToolbarButton.hidden = !isRandomSong;
  songLikeButton.hidden = false;
  songBookmarkButton.hidden = false;
  updateSongSaveButtons(song);
  selectedIndex = index;
  localStorage.setItem('lyrics-book-current-song', index);
  localStorage.setItem('lyrics-book-current-song-random', String(isRandomSong));
  document.body.classList.remove('home-mode', 'landing-mode');
  lyricsContent.replaceChildren();

  const title = document.createElement('h2');
  title.id = 'song-title';
  title.textContent = song.title;
  
  lyricsContent.append(title);

  songEmbed = null;
  if (song.audio) {
    songAudio.src = song.audio;
    songAudio.style.display = 'none';
    showAudioCheckbox.disabled = false;
    showAudioCheckbox.checked = false;
  } else if (song.embed) {
    songAudio.src = '';
    songAudio.style.display = 'none';
    songEmbed = document.createElement('div');
    songEmbed.className = 'song-embed';
    songEmbed.innerHTML = song.embed;
    songEmbed.hidden = true;
    showAudioCheckbox.disabled = false;
    showAudioCheckbox.checked = false;
  } else {
    songAudio.src = '';
    songAudio.style.display = 'none';
    showAudioCheckbox.disabled = true;
    showAudioCheckbox.checked = false;
  }
  lyricsContent.append(songAudio);
  if (songEmbed) lyricsContent.append(songEmbed);

  if (isRandomSong && (song.audio || song.embed)) {
    showAudioCheckbox.checked = true;
    songAudio.style.display = song.audio ? 'block' : 'none';
    if (songEmbed) songEmbed.hidden = false;
  }

  const lyrics = document.createElement('p');
  lyrics.className = 'lyrics-text';
  lyrics.textContent = song.lyrics;
  lyrics.dataset.lyrics = song.lyrics;
  lyrics.dataset.chords = song.chords || '';
  
  lyricsContent.append(lyrics);
  
  // Reset and manage chords toggle
  transposeSteps = 0;
  updateTransposeStatus();
  transposeControls.hidden = true;
  showChordsCheckbox.checked = isRandomSong && Boolean(song.chords);
  if (song.chords) {
    showChordsCheckbox.disabled = false;
  } else {
    showChordsCheckbox.disabled = true;
  }

  renderContents();
  document.body.classList.add('reading-mode');
  updateChordVisibility();
}

function updateSongSaveButtons(song) {
  const liked = isLiked(song);
  const bookmarked = isBookmarked(song);
  songLikeButton.classList.toggle('is-liked', liked);
  songLikeButton.setAttribute('aria-pressed', String(liked));
  songLikeButton.setAttribute('aria-label', liked ? `Unlike ${song.title}` : `Like ${song.title}`);
  songLikeButton.title = liked ? 'Unlike this song' : 'Like this song';
  songBookmarkButton.classList.toggle('is-bookmarked', bookmarked);
  songBookmarkButton.setAttribute('aria-pressed', String(bookmarked));
  songBookmarkButton.setAttribute('aria-label', bookmarked ? `Remove ${song.title} from bookmarks` : `Bookmark ${song.title}`);
  songBookmarkButton.title = bookmarked ? 'Remove bookmark' : 'Bookmark this song';
}

const flatNotes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const noteIndexes = new Map([
  ['C', 0], ['B#', 0], ['C#', 1], ['Db', 1], ['D', 2], ['D#', 3], ['Eb', 3],
  ['E', 4], ['Fb', 4], ['E#', 5], ['F', 5], ['F#', 6], ['Gb', 6], ['G', 7],
  ['G#', 8], ['Ab', 8], ['A', 9], ['A#', 10], ['Bb', 10], ['B', 11], ['Cb', 11]
]);

function transposeNote(note, steps) {
  const noteIndex = noteIndexes.get(note);
  if (noteIndex === undefined) return note;
  return flatNotes[(noteIndex + steps + 12) % 12];
}

function transposeChordToken(token, steps) {
  const rootMatch = token.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!rootMatch) return token;

  const [, root, remainder] = rootMatch;
  const bassMatch = remainder.match(/^(.*)\/([A-G](?:#|b)?)$/);
  const suffix = bassMatch ? bassMatch[1] : remainder;
  const bass = bassMatch ? `/${transposeNote(bassMatch[2], steps)}` : '';
  return `${transposeNote(root, steps)}${suffix}${bass}`;
}

function transposeChordText(chords, steps) {
  const chordPattern = /\b([A-G](?:#|b)?(?:(?:maj|min|dim|aug|sus|add|m)?\d*(?:[#b]\d+)*)?(?:\/[A-G](?:#|b)?)?)\b/g;

  return chords.split('\n').map(line => {
    return isChordLine(line, chordPattern)
      ? line.replace(chordPattern, token => transposeChordToken(token, steps))
      : line;
  }).join('\n');
}

function isChordLine(line, chordPattern = /\b([A-G](?:#|b)?(?:(?:maj|min|dim|aug|sus|add|m)?\d*(?:[#b]\d+)*)?(?:\/[A-G](?:#|b)?)?)\b/g) {
  const matches = [...line.matchAll(chordPattern)];
  return matches.length > 1
    || /^[\sA-Ga-g0-9#b/()+-]+$/.test(line.trim())
    || matches.some(match => /[#b/]|\d|maj|min|dim|aug|sus|add/.test(match[1]) || /\s{2,}/.test(line.slice(match.index + match[1].length)));
}

function findWrapBoundary(chordLine, lyricLine, start, end) {
  for (let boundary = end; boundary > start; boundary -= 1) {
    const chordBreak = boundary === chordLine.length || /\s/.test(chordLine[boundary - 1] || '');
    const lyricBreak = boundary === lyricLine.length || /\s/.test(lyricLine[boundary - 1] || '');
    if (chordBreak && lyricBreak) return boundary;
  }
  return end;
}

function wrapAlignedLines(chordLine, lyricLine, maxColumns) {
  const lineLength = Math.max(chordLine.length, lyricLine.length);
  if (lineLength <= maxColumns) return [chordLine, lyricLine];

  const wrappedLines = [];
  let start = 0;
  while (start < lineLength) {
    const end = Math.min(start + maxColumns, lineLength);
    const boundary = end === lineLength ? end : findWrapBoundary(chordLine, lyricLine, start, end);
    wrappedLines.push(chordLine.slice(start, boundary).trimEnd(), lyricLine.slice(start, boundary).trimEnd());
    start = boundary;
  }
  return wrappedLines;
}

function applyChordHighlighting(lyrics) {
  const chordLines = lyrics.querySelector('.chord-lines');
  if (!chordLines) return;
  const lines = chordLines.textContent.split('\n');
  chordLines.replaceChildren();
  lines.forEach((line, index) => {
    if (isChordLine(line) && line.trim()) {
      appendHighlightedChordLine(chordLines, line);
    } else {
      chordLines.append(document.createTextNode(line));
    }
    if (index < lines.length - 1) chordLines.append(document.createTextNode('\n'));
  });
}

const chordTokenPattern = /\b([A-G](?:#|b)?(?:(?:maj|min|dim|aug|sus|add|m)?\d*(?:[#b]\d+)*)?(?:\/[A-G](?:#|b)?)?)\b/g;

function appendHighlightedChordLine(container, line) {
  const pattern = new RegExp(chordTokenPattern.source, 'g');
  let lastEnd = 0;
  let match;
  while ((match = pattern.exec(line)) !== null) {
    if (match.index > lastEnd) {
      container.append(document.createTextNode(line.slice(lastEnd, match.index)));
    }
    const tokenSpan = document.createElement('span');
    tokenSpan.className = 'chord-token';
    tokenSpan.textContent = match[0];
    container.append(tokenSpan);
    lastEnd = match.index + match[0].length;
  }
  if (lastEnd < line.length) {
    container.append(document.createTextNode(line.slice(lastEnd)));
  }
}

function wrapChordText(lyrics, chordText) {
  const chordLines = lyrics.querySelector('.chord-lines');
  if (!chordLines) return;

  const font = getComputedStyle(lyrics);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = `${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;
  const characterWidth = context.measureText('0').width + parseFloat(font.letterSpacing || 0);
  const maxColumns = Math.max(1, Math.floor(lyrics.clientWidth / characterWidth));
  const lines = chordText.split('\n');
  const wrappedLines = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextLine = lines[index + 1];
    if (isChordLine(line) && nextLine && nextLine.trim() && !isChordLine(nextLine)) {
      wrappedLines.push(...wrapAlignedLines(line, nextLine, maxColumns));
      index += 1;
    } else if (line.length > maxColumns) {
      wrappedLines.push(...wrapAlignedLines('', line, maxColumns));
    } else {
      wrappedLines.push(line);
    }
  }

  chordLines.textContent = wrappedLines.join('\n');
}

function updateTransposeStatus() {
  transposeStatus.textContent = transposeSteps === 0
    ? 'Original key'
    : `${transposeSteps > 0 ? '+' : ''}${transposeSteps} ${Math.abs(transposeSteps) === 1 ? 'semitone' : 'semitones'}`;
  transposeDownButton.disabled = transposeSteps <= -12;
  transposeUpButton.disabled = transposeSteps >= 12;
}

function renderChordDisplay() {
  const lyrics = document.querySelector('.lyrics-text');
  if (!lyrics || !showChordsCheckbox.checked || !lyrics.dataset.chords) return;

  renderChordText(lyrics);
  fitLyrics(lyrics);
}

function renderChordText(lyrics) {
  wrapChordText(lyrics, transposeChordText(lyrics.dataset.chords, transposeSteps));
}

function showContents() {
  if (history.state?.app === appHistoryKey && history.state.view === 'song') {
    const randomDepth = history.state.random ? history.state.randomDepth || 1 : 1;
    history.go(-randomDepth);
    return;
  }
  navigateToAppView('home');
}

function updateJsonOutput() {
  const output = {
    title: converterTitle.value.trim(),
    genre: converterGenre.value.trim(),
    lyrics: converterLyrics.value
  };
  
  // Only include audio if provided
  if (converterAudio.value.trim()) {
    output.audio = converterAudio.value.trim();
  }
  
  // Only include chords if provided
  if (converterChords.value.trim()) {
    output.chords = converterChords.value;
  }
  
  converterOutput.value = JSON.stringify(output, null, 2);
}

function openConverter() {
  updateJsonOutput();
  converterDialog.showModal();
  converterTitle.focus();
}

function closeConverterDialog() {
  converterDialog.close();
}

async function copyJson() {
  updateJsonOutput();
  await navigator.clipboard.writeText(converterOutput.value);
  copyJsonButton.textContent = 'Copied';
  window.setTimeout(() => { copyJsonButton.textContent = 'Copy JSON'; }, 1400);
}

function downloadJson() {
  updateJsonOutput();
  const filename = `${converterTitle.value.trim() || 'song'}.json`.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();
  const file = new Blob([`${converterOutput.value}\n`], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function fitLyrics(lyrics) {
  const isChordMode = lyrics.classList.contains('showing-chords');
  const minimumSize = 13;
  const maximumSize = 48;
  const availableHeight = Math.max(180, window.innerHeight - lyrics.getBoundingClientRect().top - 28);
  lyrics.style.fontSize = `${maximumSize}px`;
  if (isChordMode) renderChordText(lyrics);

  while ((lyrics.scrollHeight > availableHeight || (!isChordMode && lyrics.scrollWidth > lyrics.clientWidth))
    && parseFloat(getComputedStyle(lyrics).fontSize) > minimumSize) {
    lyrics.style.fontSize = `${parseFloat(getComputedStyle(lyrics).fontSize) - 1}px`;
    if (isChordMode) renderChordText(lyrics);
  }

  const isOverflowing = lyrics.scrollHeight > availableHeight;
  lyrics.classList.toggle('is-overflowing', isOverflowing);

  if (isChordMode) applyChordHighlighting(lyrics);
}

function showMessage(message, isError = false) {
  const paragraph = document.createElement('p');
  paragraph.className = isError ? 'error-message' : 'loading-message';
  paragraph.textContent = message;
  lyricsContent.replaceChildren(paragraph);
}

/* Event Listeners */
if (mainTitle) {
  mainTitle.addEventListener('click', () => {
    navigateToAppView('landing');
  })
}
if (openBookButton) {
  openBookButton.addEventListener('click', () => {
    navigateToAppView('home');
  });
}
homeMenuButton.addEventListener('click', () => {
  navigateToAppView('landing');
  headerSideMenu?.close();
});
searchInput.addEventListener('input', renderContents);
songListToggle.addEventListener('click', () => {
  areSongsVisible = !areSongsVisible;
  localStorage.setItem(songListVisibilityKey, String(areSongsVisible));
  updateSongListVisibility();
});
collectionFilter.addEventListener('click', (event) => {
  const button = event.target.closest('[data-collection-filter]');
  if (!button) return;
  activeCollectionFilter = button.dataset.collectionFilter;
  localStorage.setItem(collectionFilterKey, activeCollectionFilter);
  updateCollectionFilterButtons();
  renderContents();
});
genreFilter.addEventListener('change', () => {
  localStorage.setItem('lyrics-book-genre', genreFilter.value);
  renderContents();
});
if (randomSongButton) if (randomSongButton) randomSongButton.addEventListener('click', openRandomSong);
if (randomSongListButton) randomSongListButton.addEventListener('click', openRandomSong);
if (randomSongToolbarButton) randomSongToolbarButton.addEventListener('click', () => openRandomSong({ cycle: true }));
songLikeButton.addEventListener('click', () => {
  const song = songs[selectedIndex];
  if (!song) return;
  toggleLike(song);
  updateSongSaveButtons(song);
  renderContents();
});
songBookmarkButton.addEventListener('click', () => {
  const song = songs[selectedIndex];
  if (!song) return;
  toggleBookmark(song);
  updateSongSaveButtons(song);
  renderContents();
});
if (converterButton) converterButton.addEventListener('click', openConverter);
closeConverter.addEventListener('click', closeConverterDialog);
converterTitle.addEventListener('input', updateJsonOutput);
converterGenre.addEventListener('input', updateJsonOutput);
converterLyrics.addEventListener('input', updateJsonOutput);
converterAudio.addEventListener('input', updateJsonOutput);
converterChords.addEventListener('input', updateJsonOutput);
copyJsonButton.addEventListener('click', copyJson);
downloadJsonButton.addEventListener('click', downloadJson);
backButton.addEventListener('click', showContents);
function updateChordVisibility() {
  const lyrics = document.querySelector('.lyrics-text');
  if (!lyrics) return;
  
  if (showChordsCheckbox.checked && lyrics.dataset.chords) {
    const chordLines = document.createElement('span');
    chordLines.className = 'chord-lines';
    chordLines.textContent = transposeChordText(lyrics.dataset.chords, transposeSteps);
    lyrics.replaceChildren(chordLines);
    lyrics.classList.add('showing-chords');
    transposeControls.hidden = false;
    renderChordText(lyrics);
  } else {
    lyrics.textContent = lyrics.dataset.lyrics;
    lyrics.classList.remove('showing-chords');
    transposeControls.hidden = true;
  }
  fitLyrics(lyrics);
}

showChordsCheckbox.addEventListener('change', updateChordVisibility);
transposeDownButton.addEventListener('click', () => {
  if (transposeSteps <= -12) return;
  transposeSteps -= 1;
  updateTransposeStatus();
  renderChordDisplay();
});
transposeUpButton.addEventListener('click', () => {
  if (transposeSteps >= 12) return;
  transposeSteps += 1;
  updateTransposeStatus();
  renderChordDisplay();
});
showAudioCheckbox.addEventListener('change', () => {
  if (showAudioCheckbox.checked && songAudio.getAttribute('src')) {
    songAudio.style.display = 'block';
  } else {
    songAudio.style.display = 'none';
  }
  if (songEmbed) songEmbed.hidden = !showAudioCheckbox.checked;
});
document.addEventListener('keydown', (event) => {
  if (converterDialog.open) return;
  if (event.key === 'Escape' && document.body.classList.contains('reading-mode')) showContents();
});
window.addEventListener('popstate', (event) => {
  if (event.state?.app === appHistoryKey) renderAppView(event.state, true);
});
window.addEventListener('resize', () => {
  const lyrics = document.querySelector('.lyrics-text');
  if (lyrics) fitLyrics(lyrics);
});

initializeAppHistory();
updateCollectionFilterButtons();
loadSongs();
