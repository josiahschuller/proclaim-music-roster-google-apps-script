

function test() {
  // Update the last time column for all songs for a particular Sunday
  const SUNDAY = "11/2/2024"
  updateTimesPerTimestamp(SUNDAY);
}

function getCell(sheet, row, column) {
  /*
  Gets a cell in a sheet
  */
  return sheet.getRange(row, column).getValue();
}

function setCell(sheet, row, column, value) {
  /*
  Sets a cell in a sheet with the given value
  */
  sheet.getRange(row, column).setValue(value);
}

function getLastTimeSung(song) {
  /*
  Gets the last time sung for a given song
  */
  let songRow = getRowIndexSong(song);
  let lastTimeSungCol = getColumnIndex(SONGS_VALUES, "Last time sung");
  return SONGS_SHEET.getRange(songRow, lastTimeSungCol).getValue();
}

function setLastTimeSung(song, lastTimeSung) {
  /*
  Updates the last time sung for a given song
  */
  let songRow = getRowIndexSong(song);
  let lastTimeSungCol = getColumnIndex(SONGS_VALUES, "Last time sung");

  setCell(SONGS_SHEET, songRow, lastTimeSungCol, lastTimeSung);
}

function convertStringToDate(dateString) {
  var parts = dateString.split("/");
  var day = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JavaScript Date
  var year = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

function updateTimesPerTimestamp(timestamp) {
  /*
  Updates the last time sung for all songs played on a timestamp
  */
  logger = new MyLogger();

  let timestampRow = getRowIndex(ROSTER_VALUES, convertStringToDate(timestamp));

  const SONG_COLUMNS = ["Song 1", "Song 2", "Song 3", "Song 4", "Song 5"];

  for (let i = 0; i < SONG_COLUMNS.length; i++) {
    let columnIndex = getColumnIndex(ROSTER_VALUES, SONG_COLUMNS[i]);
    let songName = getCell(ROSTER_SHEET, timestampRow, columnIndex);
    if (songName !== "" && songName !== null && songName !== undefined) {
      let previousLastTimeSung;
      try {
        previousLastTimeSung = getLastTimeSung(songName);
      } catch (error) {
        logger.log(error);
        continue;
      }
      
      setLastTimeSung(songName, timestamp);
      let newLastTimeSung = getLastTimeSung(songName);

      if (areDatesEqual(previousLastTimeSung, newLastTimeSung)) {
        logger.log(`Last time sung column for ${songName} is already up to date!`);
      } else {
        logger.log(`Updated the last time sung column for ${songName} from ${previousLastTimeSung.toLocaleDateString()} to ${newLastTimeSung.toLocaleDateString()}`);
      }
    }
  }

  return logger.getLogs();
}
