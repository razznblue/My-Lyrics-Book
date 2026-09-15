const fs = require('fs');
const path = require('path');

// Defaults to checking songs.json, but you can specify a different file as a command line argument
// example: node scripts/scan-songs.js my-songs.json
const inputPath = process.argv[2] || 'songs.json';

function hasField(song, field) {
  return Object.prototype.hasOwnProperty.call(song, field);
}

function main() {
  const raw = fs.readFileSync(path.resolve(inputPath), 'utf8');
  const songs = JSON.parse(raw);

  if (!Array.isArray(songs)) {
    throw new Error('Input JSON must be an array of song objects.');
  }

  const missingBoth = [];
  const missingChords = [];
  const missingEmbed = [];

  songs.forEach((song) => {
    const title = song.title || '(untitled)';
    const hasChords = hasField(song, 'chords');
    const hasRecording = hasField(song, 'embed') || hasField(song, 'audio');

    if (!hasChords && !hasRecording) {
      missingBoth.push(title);
    } else if (!hasChords) {
      missingChords.push(title);
    } else if (!hasRecording) {
      missingEmbed.push(title);
    }
  });

  const report = (label, list) => {
    console.log(`\n${label} (${list.length}):`);
    if (list.length === 0) {
      console.log('  none');
    } else {
      list.sort((a, b) => a.localeCompare(b)).forEach((title) => console.log(`  - ${title}`));
    }
  };

  console.log(`Checked ${songs.length} song(s) in ${inputPath}`);
  report('Missing both chords and a recording (embed/audio)', missingBoth);
  report('Missing chords only', missingChords);
  report('Missing a recording (embed/audio) only', missingEmbed);

  const missingCount = missingBoth.length + missingChords.length + missingEmbed.length;
  console.log('\nSummary:');
  console.log(`  Has both fields:  ${songs.length - missingCount}`);
  console.log(`  Missing something: ${missingCount}`);
  console.log(`  Total:             ${songs.length}`);
}

main();