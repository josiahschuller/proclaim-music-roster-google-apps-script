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
