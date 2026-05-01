function onOpen() {
  const userEmail = Session.getActiveUser().getEmail();

  // Only display menu for authorised users
  if (AUTHORIZED_USERS.includes(userEmail)) {
    SpreadsheetApp.getUi()
      .createMenu('Josiah Magic')
      .addItem('Generate weekly music email', 'generateWeeklyEmail')
      .addItem('Update "Last time sung" values', 'updateLastTimeSung')
      .addItem('Sync roster to WorshipTools', 'syncToWorshipToolsMenu')
      .addToUi();
  }
}

function generateWeeklyEmail() {
  SpreadsheetApp.getUi()
    .alert(generateAndSendWeeklyEmail());
}

function updateLastTimeSung() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.prompt(
    "Enter date of Sunday to update the 'last time sung' for each song:",
    ui.ButtonSet.OK_CANCEL
  );

  if (result.getSelectedButton() === ui.Button.OK) {
    const logs = updateTimesPerTimestamp(convertStringToDate(result.getResponseText()));
    ui.alert(logs);
  }
}

function syncToWorshipToolsMenu() {
  const ui = SpreadsheetApp.getUi();

  const dateResult = ui.prompt(
    'Sync roster to WorshipTools',
    'Enter the date of the Sunday to sync (DD/MM/YYYY):',
    ui.ButtonSet.OK_CANCEL
  );
  if (dateResult.getSelectedButton() !== ui.Button.OK) return;

  const tokenResult = ui.prompt(
    'Sync roster to WorshipTools',
    'Enter your WorshipTools Bearer token (weAuthToken cookie):',
    ui.ButtonSet.OK_CANCEL
  );
  if (tokenResult.getSelectedButton() !== ui.Button.OK) return;

  const summary = syncRosterToWorshipTools(dateResult.getResponseText().trim(), tokenResult.getResponseText().trim());
  ui.alert('Sync complete', summary, ui.ButtonSet.OK);
}
