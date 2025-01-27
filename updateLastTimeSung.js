

function test() {
  // Update the last time column for all songs for a particular Sunday
  const SUNDAY = "09/02/2025"
  updateTimesPerTimestamp(convertStringToDate(SUNDAY));
}

function getCell(sheet, row, column) {
  /*
  Gets a cell in a sheet
  */
  const values = sheet.getDataRange().getValues();
  return values[row][column];
}

function setCell(sheet, row, column, value) {
  /*
  Sets a cell in a sheet with the given value
  */
  sheet.getRange(row + 1, column + 1).setValue(value);
}

function getLastTimeSung(song) {
  /*
  Gets the last time sung for a given song
  */
  let songRow = getIndexForValue(SONGS_VALUES, "Song", song);
  let lastTimeSungCol = getColumnIndex(SONGS_VALUES, "Last time sung");
  return getCell(SONGS_SHEET, songRow, lastTimeSungCol);
}

function setLastTimeSung(song, lastTimeSung) {
  /*
  Updates the last time sung for a given song
  */
  let songRow = getIndexForValue(SONGS_VALUES, "Song", song);
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

  Inputs:
  - timestamp (Date): Timestamp to set last time sung to
  */
  logger = new MyLogger();

  let timestampRow = getIndexForValue(ROSTER_VALUES, "Date", timestamp);

  const SONG_COLUMNS = ["Song 1", "Song 2", "Song 3", "Song 4", "Song 5"];

  SONG_COLUMNS.forEach(songColumn => {
    let columnIndex = getColumnIndex(ROSTER_VALUES, songColumn);
    let songName = getCell(ROSTER_SHEET, timestampRow, columnIndex);
    if (!songName) {
      return;
    }
    
    // Get current last time sung timestamp for logging (but before it is overwritten)
    let previousLastTimeSung = getLastTimeSung(songName);
    
    // Set the timestamp
    setLastTimeSung(songName, timestamp);

    // Log message
    if (!previousLastTimeSung) {
      logger.log(`Set the last time sung column for ${songName} to ${timestamp.toLocaleDateString()}`);
    } else if (areDatesEqual(previousLastTimeSung, timestamp)) {
      logger.log(`Last time sung column for ${songName} is already up to date!`);
    } else {
      logger.log(`Updated the last time sung column for ${songName} from ${previousLastTimeSung.toLocaleDateString()} to ${timestamp.toLocaleDateString()}`);
    }
  });

  return logger.getLogs();
}
