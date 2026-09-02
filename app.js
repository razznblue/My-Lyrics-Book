const songList = document.querySelector('#song-list');
const lyricsContent = document.querySelector('#lyrics-content');
const searchInput = document.querySelector('#song-search');
const genreFilter = document.querySelector('#genre-filter');
const sortSongs = document.querySelector('#sort-songs');
const emptySearch = document.querySelector('#empty-search');
const songCount = document.querySelector('.song-count');
const fontStatus = document.querySelector('#font-status');
const printButton = document.querySelector('.print-button');
const randomSongButton = document.querySelector('#random-song');
const backButton = document.querySelector('#back-button');
const converterButton = document.querySelector('#converter-button');
const converterDialog = document.querySelector('#converter-dialog');
const closeConverter = document.querySelector('#close-converter');
const converterTitle = document.querySelector('#converter-title-input');
const converterGenre = document.querySelector('#converter-genre-input');
const converterLyrics = document.querySelector('#converter-lyrics-input');
const converterChords = document.querySelector('#converter-chords-input');
const converterOutput = document.querySelector('#converter-output');
const copyJsonButton = document.querySelector('#copy-json');
const downloadJsonButton = document.querySelector('#download-json');
const songAudio = document.querySelector('#song-audio');
const hearButton = document.querySelector('#hear-sample');
const converterAudio = document.querySelector('#converter-audio-input');
const showChordsCheckbox = document.querySelector('#show-chords');

let songs = [];
let selectedIndex = 0;
const savedGenre = localStorage.getItem('lyrics-book-genre') || 'all';
const savedSort = localStorage.getItem('lyrics-book-sort') || 'az';

async function loadSongs() {
  try {
    const response = await fetch('songs.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load songs.json (${response.status})`);
    songs = await response.json();
    if (!Array.isArray(songs)) throw new Error('songs.json must contain an array of songs.');
    populateGenreFilter();
    genreFilter.value = [...genreFilter.options].some(option => option.value === savedGenre) ? savedGenre : 'all';
    sortSongs.value = savedSort === 'default' ? 'az' : (['az', 'za'].includes(savedSort) ? savedSort : 'az');
    renderContents();
    if (!songs.length) showMessage('No songs yet. Add a song object to songs.json.');
    
    // Restore the current song if one was open before refresh
    const savedSongIndex = localStorage.getItem('lyrics-book-current-song');
    if (savedSongIndex !== null && parseInt(savedSongIndex) < songs.length) {
      showSong(parseInt(savedSongIndex));
    }
  } catch (error) {
    showMessage('Songs could not be loaded. Open this folder through a local web server if your browser blocks local JSON files.', true);
    console.error(error);
  }
}

function renderContents() {
  const query = searchInput.value.trim().toLowerCase();
  const matches = songs
    .map((song, index) => ({ song, index }))
    .filter(({ song }) => String(song.title).toLowerCase().includes(query))
    .filter(({ song }) => genreFilter.value === 'all' || String(song.genre || '') === genreFilter.value);

  if (sortSongs.value === 'az' || sortSongs.value === 'za') {
    const direction = sortSongs.value === 'az' ? 1 : -1;
    matches.sort((left, right) => direction * String(left.song.title).localeCompare(String(right.song.title)));
  }

  songList.replaceChildren(...matches.map(({ song, index }) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.className = 'song-link';
    button.type = 'button';
    button.textContent = song.title;
    button.setAttribute('aria-current', index === selectedIndex ? 'true' : 'false');
    button.addEventListener('click', () => showSong(index));
    item.append(button);
    return item;
  }));

  songCount.textContent = `${matches.length} ${matches.length === 1 ? 'song' : 'songs'}`;
  emptySearch.hidden = matches.length > 0;
}

function populateGenreFilter() {
  const genres = [...new Set(songs.map(song => String(song.genre || '').trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
  genreFilter.replaceChildren(new Option('All genres', 'all'), ...genres.map(genre => new Option(genre, genre)));
}

function getMatchingSongs() {
  const query = searchInput.value.trim().toLowerCase();
  return songs
    .map((song, index) => ({ song, index }))
    .filter(({ song }) => String(song.title).toLowerCase().includes(query))
    .filter(({ song }) => genreFilter.value === 'all' || String(song.genre || '') === genreFilter.value);
}

function openRandomSong() {
  const matches = getMatchingSongs();
  if (!matches.length) return;
  const randomMatch = matches[Math.floor(Math.random() * matches.length)];
  showSong(randomMatch.index);
}

function showSong(index) {
  const song = songs[index];
  if (!song) return;
  selectedIndex = index;
  localStorage.setItem('lyrics-book-current-song', index);
  document.body.classList.remove('home-mode');
  lyricsContent.replaceChildren();

  const title = document.createElement('h2');
  title.id = 'song-title';
  title.textContent = song.title;
  
  const lyrics = document.createElement('p');
  lyrics.className = 'lyrics-text';
  lyrics.textContent = song.lyrics;
  lyrics.dataset.lyrics = song.lyrics;
  lyrics.dataset.chords = song.chords || '';
  
  lyricsContent.append(title, lyrics);

  // Load audio if available
  if (song.audio) {
    songAudio.src = song.audio;
    songAudio.style.display = 'block';
  } else {
    songAudio.src = '';
    songAudio.style.display = 'none';
  }
  
  // Reset chords toggle to off when opening a new song
  showChordsCheckbox.checked = false;

  renderContents();
  document.body.classList.add('reading-mode');
  fitLyrics(lyrics);
}

function showContents() {
  songAudio.pause();
  songAudio.currentTime = 0;
  localStorage.removeItem('lyrics-book-current-song');
  document.body.classList.remove('reading-mode');
  document.body.classList.add('home-mode');
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
  const minimumSize = 14;
  const maximumSize = 48;
  const availableHeight = Math.max(180, window.innerHeight - lyrics.getBoundingClientRect().top - 28);
  lyrics.style.fontSize = `${maximumSize}px`;

  while (lyrics.scrollHeight > availableHeight && parseFloat(getComputedStyle(lyrics).fontSize) > minimumSize) {
    lyrics.style.fontSize = `${parseFloat(getComputedStyle(lyrics).fontSize) - 1}px`;
  }

  const isOverflowing = lyrics.scrollHeight > availableHeight;
  lyrics.classList.toggle('is-overflowing', isOverflowing);
  fontStatus.textContent = `${Math.round(parseFloat(getComputedStyle(lyrics).fontSize))}px${isOverflowing ? ' · long song' : ''}`;
}

function showMessage(message, isError = false) {
  const paragraph = document.createElement('p');
  paragraph.className = isError ? 'error-message' : 'loading-message';
  paragraph.textContent = message;
  lyricsContent.replaceChildren(paragraph);
}

searchInput.addEventListener('input', renderContents);
genreFilter.addEventListener('change', () => {
  localStorage.setItem('lyrics-book-genre', genreFilter.value);
  renderContents();
});
sortSongs.addEventListener('change', () => {
  localStorage.setItem('lyrics-book-sort', sortSongs.value);
  renderContents();
});
printButton.addEventListener('click', () => window.print());
randomSongButton.addEventListener('click', openRandomSong);
converterButton.addEventListener('click', openConverter);
closeConverter.addEventListener('click', closeConverterDialog);
converterDialog.addEventListener('click', (event) => {
  if (event.target === converterDialog) closeConverterDialog();
});
converterTitle.addEventListener('input', updateJsonOutput);
converterGenre.addEventListener('input', updateJsonOutput);
converterLyrics.addEventListener('input', updateJsonOutput);
converterChords.addEventListener('input', updateJsonOutput);
converterAudio.addEventListener('input', updateJsonOutput);
copyJsonButton.addEventListener('click', copyJson);
downloadJsonButton.addEventListener('click', downloadJson);
backButton.addEventListener('click', showContents);
showChordsCheckbox.addEventListener('change', () => {
  const lyrics = document.querySelector('.lyrics-text');
  if (!lyrics) return;
  
  if (showChordsCheckbox.checked && lyrics.dataset.chords) {
    lyrics.textContent = lyrics.dataset.chords;
    lyrics.classList.add('showing-chords');
  } else {
    lyrics.textContent = lyrics.dataset.lyrics;
    lyrics.classList.remove('showing-chords');
  }
  fitLyrics(lyrics);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.classList.contains('reading-mode')) showContents();
});
window.addEventListener('resize', () => {
  const lyrics = document.querySelector('.lyrics-text');
  if (lyrics) fitLyrics(lyrics);
});

loadSongs();
