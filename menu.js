function onOpen() {
  const userEmail = Session.getActiveUser().getEmail();
  if (!AUTHORIZED_USERS.includes(userEmail)) return;

  SpreadsheetApp.getUi()
    .createMenu('Josiah Magic')
    .addItem('Generate weekly music email', 'generateWeeklyEmail')
    .addItem('Update "Last time sung" values', 'updateLastTimeSung')
    .addItem('Sync people to WorshipTools', 'syncToWorshipToolsMenu')
    .addItem('MULTI: Sync people to WorshipTools', 'syncAllToWorshipToolsMenu')
    .addItem('Sync songs to WorshipTools', 'syncSongsToWorshipToolsMenu')
    .addItem('MULTI: Sync songs to WorshipTools', 'syncAllSongsToWorshipToolsMenu')
    .addToUi();
}

function promptText(ui, title, message) {
  const result = ui.prompt(title, message, ui.ButtonSet.OK_CANCEL);
  return result.getSelectedButton() === ui.Button.OK ? result.getResponseText().trim() : null;
}

function promptSyncInputs(ui, title, allowBlankDate) {
  const datePrompt = allowBlankDate
    ? 'Enter a starting date (DD/MM/YYYY), or leave blank to sync all weeks:'
    : 'Enter the date of the Sunday to sync (DD/MM/YYYY):';
  const dateText = promptText(ui, title, datePrompt);
  if (dateText === null) return null;

  let date = null;
  if (dateText) {
    try {
      date = parseDateString(dateText);
    } catch (error) {
      ui.alert(error.message);
      return null;
    }
    if (!allowBlankDate && !isSunday(date)) {
      ui.alert('Please enter a valid Sunday date in DD/MM/YYYY format.');
      return null;
    }
  } else if (!allowBlankDate) {
    ui.alert('A date is required.');
    return null;
  }

  const token = promptText(ui, title, 'Enter your WorshipTools Bearer token (weAuthToken cookie):');
  return token === null ? null : { dateText: date ? formatDateString(date) : null, token };
}

function generateWeeklyEmail() {
  const ui = SpreadsheetApp.getUi();
  const dateText = promptText(ui, 'Generate weekly music email', 'Enter the date of the Sunday to generate the email for (DD/MM/YYYY):');
  if (dateText === null) return;
  try {
    const date = parseDateString(dateText);
    if (!isSunday(date)) throw new RangeError('Please enter a valid Sunday date in DD/MM/YYYY format.');
    ui.alert(generateAndSendWeeklyEmail(date));
  } catch (error) {
    ui.alert(error.message);
  }
}

function updateLastTimeSung() {
  const ui = SpreadsheetApp.getUi();
  const dateText = promptText(ui, 'Update last time sung', 'Enter date of Sunday (DD/MM/YYYY):');
  if (dateText === null) return;
  try {
    const date = parseDateString(dateText);
    if (!isSunday(date)) throw new RangeError('Please enter a valid Sunday date in DD/MM/YYYY format.');
    ui.alert(updateTimesPerTimestamp(date));
  } catch (error) {
    ui.alert(error.message);
  }
}

function syncToWorshipToolsMenu() { runSingleSyncMenu('Sync people to WorshipTools', syncRosterToWorshipTools); }
function syncSongsToWorshipToolsMenu() { runSingleSyncMenu('Sync songs to WorshipTools', syncSongsToWorshipTools); }
function syncAllToWorshipToolsMenu() { runBulkSyncMenu('MULTI: Sync people to WorshipTools', syncAllRosterToWorshipTools); }
function syncAllSongsToWorshipToolsMenu() { runBulkSyncMenu('MULTI: Sync songs to WorshipTools', syncAllSongsToWorshipTools); }

function runSingleSyncMenu(title, syncFunction) {
  const ui = SpreadsheetApp.getUi();
  const inputs = promptSyncInputs(ui, title, false);
  if (!inputs) return;
  if (syncFunction === syncSongsToWorshipTools && !confirmSongReplacement(ui)) return;
  ui.alert('Sync complete', syncFunction(inputs.dateText, inputs.token), ui.ButtonSet.OK);
}

function runBulkSyncMenu(title, syncFunction) {
  const ui = SpreadsheetApp.getUi();
  const inputs = promptSyncInputs(ui, title, true);
  if (!inputs) return;
  if (syncFunction === syncAllSongsToWorshipTools && !confirmSongReplacement(ui)) return;
  ui.alert('Sync complete', syncFunction(inputs.token, inputs.dateText), ui.ButtonSet.OK);
}

function confirmSongReplacement(ui) {
  return ui.alert(
    'Replace WorshipTools songs?',
    'This replaces the existing song list on each selected service. Continue?',
    ui.ButtonSet.YES_NO
  ) === ui.Button.YES;
}
