/**
 * Syncs the musicians rostered in the spreadsheet for a given Sunday to
 * WorshipTools, rostering each person under their correct role.
 *
 * @param {string} dateString  - Date of the Sunday to sync (DD/MM/YYYY).
 * @param {string} bearerToken - WorshipTools Bearer token (weAuthToken cookie).
 * @returns {string} Human-readable summary of what was rostered and any errors.
 */
function syncRosterToWorshipTools(dateString, bearerToken) {
  const date = convertStringToDate(dateString);
  const wt = new WorshipToolsAPI(bearerToken);
  const logger = new MyLogger();
  const errors = [];

  const rowIndex = ROSTER_TABLE.getIndexForValue("Date", date);
  const row = ROSTER_TABLE.values[rowIndex];

  const serviceId = row[ROSTER_TABLE.getColumnIndex("WorshipTools ID")];
  if (!serviceId) {
    throw new Error(`No WorshipTools service ID found in the roster for ${dateString}. Please add it to the "WorshipTools ID" column.`);
  }

  MUSICIAN_ROLES.forEach(role => {
    const roleId = WORSHIP_TOOLS_ROLE_IDS[role];
    if (!roleId) {
      errors.push(`No WorshipTools role ID configured for "${role}" — skipping.`);
      return;
    }

    const namesStr = row[ROSTER_TABLE.getColumnIndex(role)];
    if (!namesStr) return;

    namesStr.split(", ").forEach(name => {
      try {
        const volunteerRowIndex = VOLUNTEERS_TABLE.getIndexForValue("Name", name);
        const userId = VOLUNTEERS_TABLE.values[volunteerRowIndex][VOLUNTEERS_TABLE.getColumnIndex("WorshipTools ID")];
        if (!userId) {
          errors.push(`No WorshipTools ID for volunteer "${name}" — skipping.`);
          return;
        }

        wt.rosterPersonToService(serviceId, userId, roleId);
        logger.log(`Rostered ${name} as ${role}`);
      } catch (e) {
        errors.push(`Failed to roster ${name} as ${role}: ${e.message}`);
      }
    });
  });

  if (errors.length > 0) {
    logger.log("\nWarnings / errors:");
    errors.forEach(e => logger.log(`  • ${e}`));
  }

  return logger.getLogs();
}

/**
 * Syncs all Sundays that have a WorshipTools service ID in the roster sheet.
 *
 * @param {string} bearerToken - WorshipTools Bearer token (weAuthToken cookie).
 * @returns {string} Human-readable summary of what was rostered and any errors.
 */
function syncAllRosterToWorshipTools(bearerToken, startDateString) {
  const logger = new MyLogger();

  const dateColIndex = ROSTER_TABLE.getColumnIndex("Date");
  const serviceIdColIndex = ROSTER_TABLE.getColumnIndex("WorshipTools ID");

  const startDate = startDateString ? convertStringToDate(startDateString) : null;

  const rowsWithServiceId = ROSTER_TABLE.values.slice(1).filter(row => {
    if (!row[serviceIdColIndex]) return false;
    if (startDate) {
      const rowDate = row[dateColIndex] instanceof Date ? row[dateColIndex] : convertStringToDate(String(row[dateColIndex]));
      return rowDate >= startDate;
    }
    return true;
  });

  if (rowsWithServiceId.length === 0) {
    return "No rows with a WorshipTools service ID found in the roster.";
  }

  rowsWithServiceId.forEach(row => {
    const date = row[dateColIndex];
    const dateString = date instanceof Date
      ? Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy")
      : String(date);
    logger.log(`\n--- Syncing ${dateString} ---`);
    try {
      const result = syncRosterToWorshipTools(dateString, bearerToken);
      logger.log(result);
    } catch (e) {
      logger.log(`ERROR for ${dateString}: ${e.message}`);
    }
  });

  return logger.getLogs();
}

function syncAllSongsToWorshipTools(bearerToken, startDateString) {
  const logger = new MyLogger();

  const dateColIndex = ROSTER_TABLE.getColumnIndex("Date");
  const serviceIdColIndex = ROSTER_TABLE.getColumnIndex("WorshipTools ID");

  const startDate = startDateString ? convertStringToDate(startDateString) : null;

  const rowsWithServiceId = ROSTER_TABLE.values.slice(1).filter(row => {
    if (!row[serviceIdColIndex]) return false;
    if (startDate) {
      const rowDate = row[dateColIndex] instanceof Date ? row[dateColIndex] : convertStringToDate(String(row[dateColIndex]));
      return rowDate >= startDate;
    }
    return true;
  });

  if (rowsWithServiceId.length === 0) {
    return "No rows with a WorshipTools service ID found in the roster.";
  }

  rowsWithServiceId.forEach(row => {
    const date = row[dateColIndex];
    const dateString = date instanceof Date
      ? Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy")
      : String(date);
    logger.log(`\n--- Syncing songs for ${dateString} ---`);
    try {
      const result = syncSongsToWorshipTools(dateString, bearerToken);
      logger.log(result);
    } catch (e) {
      logger.log(`ERROR for ${dateString}: ${e.message}`);
    }
  });

  return logger.getLogs();
}

/**
 * Syncs the songs in the spreadsheet for a given Sunday to the WorshipTools
 * service cuelist, replacing any songs currently on that service.
 *
 * @param {string} dateString  - Date of the Sunday to sync (DD/MM/YYYY).
 * @param {string} bearerToken - WorshipTools Bearer token (weAuthToken cookie).
 * @returns {string} Human-readable summary of what was synced and any errors.
 */
function syncSongsToWorshipTools(dateString, bearerToken) {
  const date = convertStringToDate(dateString);
  const wt = new WorshipToolsAPI(bearerToken);
  const logger = new MyLogger();
  const errors = [];

  const rowIndex = ROSTER_TABLE.getIndexForValue("Date", date);
  const row = ROSTER_TABLE.values[rowIndex];

  const serviceId = row[ROSTER_TABLE.getColumnIndex("WorshipTools ID")];
  if (!serviceId) {
    throw new Error(`No WorshipTools service ID found for ${dateString}. Please add it to the "WorshipTools ID" column.`);
  }

  const songs = [];
  SONG_COLUMNS.forEach(songColumn => {
    const songName = row[ROSTER_TABLE.getColumnIndex(songColumn)];
    if (!songName) return;

    try {
      const songRowIndex = SONGS_TABLE.getIndexForValue("Song", songName);
      const worshipToolsId = SONGS_TABLE.values[songRowIndex][SONGS_TABLE.getColumnIndex("WorshipTools ID")];
      if (!worshipToolsId) {
        errors.push(`No WorshipTools ID for song "${songName}" — skipping.`);
        return;
      }
      songs.push({ worshipToolsId, displayName: songName });
    } catch (e) {
      errors.push(`Song "${songName}" not found in songs table: ${e.message}`);
    }
  });

  if (songs.length > 0) {
    wt.syncSongsToService(serviceId, songs);
    songs.forEach(s => logger.log(`Synced song: ${s.displayName}`));
  } else {
    logger.log("No songs with WorshipTools IDs found to sync.");
  }

  if (errors.length > 0) {
    logger.log("\nWarnings / errors:");
    errors.forEach(e => logger.log(`  • ${e}`));
  }

  return logger.getLogs();
}
