const fs = require('fs');
const path = require('path');

/* Okina Cleanup Script
 - Go through each "Hawaiain" song in songs.json and replace all apostraphes with 
an okina (ʻ) for proper olelo Hawaiʻi writing.
*/

// Path to the input file
const inputPath = process.argv[2] || 'songs.json';
const outputPath = process.argv[3] || 'songs.updated.json';

const OKINA = 'ʻ';

function replaceApostrophes(text) {
  if (typeof text !== 'string') return { changed: false, value: text };
  const updated = text.split("'").join(OKINA).split('`').join(OKINA);
  return { changed: updated !== text, value: updated };
}

function main() {
  const raw = fs.readFileSync(path.resolve(inputPath), 'utf8');
  const songs = JSON.parse(raw);

  if (!Array.isArray(songs)) {
    throw new Error('Input JSON must be an array of song objects.');
  }

  const fieldsToCheck = ['title', 'lyrics', 'chords'];
  const affected = [];

  songs.forEach((song) => {
    if (song.genre !== 'Hawaiian') return;

    const changedFields = [];

    fieldsToCheck.forEach((field) => {
      const { changed, value } = replaceApostrophes(song[field]);
      if (changed) {
        song[field] = value;
        changedFields.push(field);
      }
    });

    if (changedFields.length > 0) {
      affected.push({ title: song.title, fields: changedFields });
    }
  });

  // Write the updated data to a new file (leaves the original untouched)
  fs.writeFileSync(path.resolve(outputPath), JSON.stringify(songs, null, 2) + '\n', 'utf8');

  // Log results
  if (affected.length === 0) {
    console.log('No Hawaiian songs had straight apostrophes to replace.');
  } else {
    console.log(`Updated ${affected.length} Hawaiian song(s):\n`);
    affected.forEach(({ title, fields }) => {
      console.log(`- "${title}" → fields changed: ${fields.join(', ')}`);
    });
  }

  console.log(`\nOutput written to ${outputPath}`);
}

main();