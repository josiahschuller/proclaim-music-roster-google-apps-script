/** Return roster rows with a service ID inside an optional inclusive date range. */
function getRosterRowsForSync(startDateString, endDateString) {
  const dateIndex = ROSTER_TABLE.getColumnIndex('Date');
  const serviceIdIndex = ROSTER_TABLE.getColumnIndex('WorshipTools ID');
  const startDate = startDateString ? parseDateString(startDateString) : null;
  const endDate = endDateString ? parseDateString(endDateString) : null;
  if (startDate && endDate && endDate < startDate) {
    throw new RangeError('End date must be the same as or later than the start date.');
  }

  return ROSTER_TABLE.values.slice(1).filter(row => {
    if (!row[serviceIdIndex]) return false;
    const value = row[dateIndex];
    const rowDate = value instanceof Date
      ? new Date(value.getFullYear(), value.getMonth(), value.getDate())
      : parseDateString(String(value));
    if (startDate && rowDate < startDate) return false;
    if (endDate && rowDate > endDate) return false;
    return true;
  });
}

function syncAllWorshipToolsRows(bearerToken, startDateString, endDateString, label, syncFunction) {
  const logger = new MyLogger();
  const rows = getRosterRowsForSync(startDateString, endDateString);
  if (rows.length === 0) return 'No rows with a WorshipTools service ID found in the roster.';

  const dateIndex = ROSTER_TABLE.getColumnIndex('Date');
  rows.forEach(row => {
    const date = row[dateIndex] instanceof Date ? row[dateIndex] : parseDateString(String(row[dateIndex]));
    const dateString = formatDateString(date);
    logger.log(`\n--- Syncing ${label} ${dateString} ---`);
    try {
      logger.log(syncFunction(dateString, bearerToken));
    } catch (error) {
      logger.log(`ERROR for ${dateString}: ${error.message}`);
    }
  });
  return logger.getLogs();
}

/** Sync people rostered on one Sunday to WorshipTools. */
function syncRosterToWorshipTools(dateString, bearerToken) {
  const date = parseDateString(dateString);
  if (!isSunday(date)) throw new RangeError('Roster sync date must be a Sunday.');
  const wt = new WorshipToolsAPI(bearerToken);
  const logger = new MyLogger();
  const errors = [];
  const rowIndex = ROSTER_TABLE.getIndexForValue('Date', date);
  const row = ROSTER_TABLE.values[rowIndex];
  const serviceId = row[ROSTER_TABLE.getColumnIndex('WorshipTools ID')];
  if (!serviceId) throw new Error(`No WorshipTools service ID found for ${dateString}. Please add it to the "WorshipTools ID" column.`);

  MUSICIAN_ROLES.forEach(role => {
    const roleId = WORSHIP_TOOLS_ROLE_IDS[role];
    if (!roleId) {
      errors.push(`No WorshipTools role ID configured for "${role}" — skipping.`);
      return;
    }
    const names = row[ROSTER_TABLE.getColumnIndex(role)];
    if (!names) return;

    names.split(',').map(name => name.trim()).filter(Boolean).forEach(name => {
      try {
        const volunteerIndex = VOLUNTEERS_TABLE.getIndexForValue('Name', name);
        const userId = VOLUNTEERS_TABLE.values[volunteerIndex][VOLUNTEERS_TABLE.getColumnIndex('WorshipTools ID')];
        if (!userId) {
          errors.push(`No WorshipTools ID for volunteer "${name}" — skipping.`);
          return;
        }
        wt.rosterPersonToService(serviceId, userId, roleId);
        logger.log(`Rostered ${name} as ${role}`);
      } catch (error) {
        errors.push(`Failed to roster ${name} as ${role}: ${error.message}`);
      }
    });
  });
  appendErrors(logger, errors);
  return logger.getLogs();
}

function syncAllRosterToWorshipTools(bearerToken, startDateString, endDateString) {
  return syncAllWorshipToolsRows(bearerToken, startDateString, endDateString, 'people for', syncRosterToWorshipTools);
}

function syncAllSongsToWorshipTools(bearerToken, startDateString, endDateString) {
  return syncAllWorshipToolsRows(bearerToken, startDateString, endDateString, 'songs for', syncSongsToWorshipTools);
}

/** Replace the songs on a service cuelist with the rostered songs. */
function syncSongsToWorshipTools(dateString, bearerToken) {
  const date = parseDateString(dateString);
  if (!isSunday(date)) throw new RangeError('Song sync date must be a Sunday.');
  const wt = new WorshipToolsAPI(bearerToken);
  const logger = new MyLogger();
  const errors = [];
  const rowIndex = ROSTER_TABLE.getIndexForValue('Date', date);
  const row = ROSTER_TABLE.values[rowIndex];
  const serviceId = row[ROSTER_TABLE.getColumnIndex('WorshipTools ID')];
  if (!serviceId) throw new Error(`No WorshipTools service ID found for ${dateString}. Please add it to the "WorshipTools ID" column.`);

  const songs = [];
  SONG_COLUMNS.forEach(column => {
    const songName = row[ROSTER_TABLE.getColumnIndex(column)];
    if (!songName) return;
    try {
      const songIndex = SONGS_TABLE.getIndexForValue('Song', songName);
      const worshipToolsId = SONGS_TABLE.values[songIndex][SONGS_TABLE.getColumnIndex('WorshipTools ID')];
      if (!worshipToolsId) errors.push(`No WorshipTools ID for song "${songName}" — skipping.`);
      else songs.push({ worshipToolsId, displayName: songName });
    } catch (error) {
      errors.push(`Song "${songName}" not found in songs table: ${error.message}`);
    }
  });

  if (songs.length > 0) {
    wt.syncSongsToService(serviceId, songs);
    songs.forEach(song => logger.log(`Synced song: ${song.displayName}`));
  } else logger.log('No songs with WorshipTools IDs found to sync.');
  appendErrors(logger, errors);
  return logger.getLogs();
}

function appendErrors(logger, errors) {
  if (errors.length === 0) return;
  logger.log('\nWarnings / errors:');
  errors.forEach(error => logger.log(`  • ${error}`));
}
