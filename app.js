const songList = document.querySelector('#song-list');
const lyricsContent = document.querySelector('#lyrics-content');
const searchInput = document.querySelector('#song-search');
const genreFilter = document.querySelector('#genre-filter');
const sortSongs = document.querySelector('#sort-songs');
const emptySearch = document.querySelector('#empty-search');
const songCount = document.querySelector('.song-count');
const fontStatus = document.querySelector('#font-status');
const randomSongButton = document.querySelector('#random-song');
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

let songs = [];
let selectedIndex = 0;
let transposeSteps = 0;
let songEmbed = null;
const savedGenre = localStorage.getItem('lyrics-book-genre') || 'all';
const savedSort = localStorage.getItem('lyrics-book-sort') || 'az';
const contentsScrollKey = 'lyrics-book-contents-scroll';

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
    button.addEventListener('click', () => {
      saveContentsScroll();
      showSong(index);
    });
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
  saveContentsScroll();
  showSong(randomMatch.index);
}

function saveContentsScroll() {
  localStorage.setItem(contentsScrollKey, String(songList.scrollTop));
}

function restoreContentsScroll() {
  const savedScroll = localStorage.getItem(contentsScrollKey);
  if (savedScroll !== null) songList.scrollTop = parseInt(savedScroll, 10) || 0;
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
  showChordsCheckbox.checked = false;
  if (song.chords) {
    showChordsCheckbox.disabled = false;
  } else {
    showChordsCheckbox.disabled = true;
  }

  renderContents();
  document.body.classList.add('reading-mode');
  fitLyrics(lyrics);
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
  const chordPattern = /\b([A-G](?:#|b)?(?:(?:maj|min|dim|aug|sus|add)?\d*)?(?:\/[A-G](?:#|b)?)?)\b/g;

  return chords.split('\n').map(line => {
    return isChordLine(line, chordPattern)
      ? line.replace(chordPattern, token => transposeChordToken(token, steps))
      : line;
  }).join('\n');
}

function isChordLine(line, chordPattern = /\b([A-G](?:#|b)?(?:(?:maj|min|dim|aug|sus|add)?\d*)?(?:\/[A-G](?:#|b)?)?)\b/g) {
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
  songAudio.pause();
  songAudio.currentTime = 0;
  localStorage.removeItem('lyrics-book-current-song');
  document.body.classList.remove('reading-mode');
  document.body.classList.add('home-mode');
  requestAnimationFrame(restoreContentsScroll);
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
randomSongButton.addEventListener('click', openRandomSong);
converterButton.addEventListener('click', openConverter);
closeConverter.addEventListener('click', closeConverterDialog);
converterTitle.addEventListener('input', updateJsonOutput);
converterGenre.addEventListener('input', updateJsonOutput);
converterLyrics.addEventListener('input', updateJsonOutput);
converterAudio.addEventListener('input', updateJsonOutput);
converterChords.addEventListener('input', updateJsonOutput);
copyJsonButton.addEventListener('click', copyJson);
downloadJsonButton.addEventListener('click', downloadJson);
backButton.addEventListener('click', showContents);
showChordsCheckbox.addEventListener('change', () => {
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
});
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
window.addEventListener('resize', () => {
  const lyrics = document.querySelector('.lyrics-text');
  if (lyrics) fitLyrics(lyrics);
});

loadSongs();
