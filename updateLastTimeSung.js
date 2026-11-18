function test() {
  // Update the last time column for all songs for a particular Sunday
  const SUNDAY = "09/02/2025";
  updateTimesPerTimestamp(convertStringToDate(SUNDAY));
}

function getLastTimeSung(song) {
  const songRow = SONGS_TABLE.getIndexForValue("Song", song);
  const lastTimeSungCol = SONGS_TABLE.getColumnIndex("Last time sung");
  return SONGS_TABLE.getCell(songRow, lastTimeSungCol);
}

function setLastTimeSung(song, lastTimeSung) {
  const songRow = SONGS_TABLE.getIndexForValue("Song", song);
  const lastTimeSungCol = SONGS_TABLE.getColumnIndex("Last time sung");
  SONGS_TABLE.setCell(songRow, lastTimeSungCol, lastTimeSung);
}

function convertStringToDate(dateString) {
  return parseDateString(dateString);
}

function updateTimesPerTimestamp(timestamp) {
  /*
  Updates the last time sung for all songs played on a timestamp

  Inputs:
  - timestamp (Date): Timestamp to set last time sung to
  */
  const logger = new MyLogger();
  const timestampRow = ROSTER_TABLE.getIndexForValue("Date", timestamp);

  SONG_COLUMNS.forEach(songColumn => {
    const columnIndex = ROSTER_TABLE.getColumnIndex(songColumn);
    const songName = ROSTER_TABLE.getCell(timestampRow, columnIndex);
    if (!songName) return;

    const previousLastTimeSung = getLastTimeSung(songName);
    setLastTimeSung(songName, timestamp);

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
