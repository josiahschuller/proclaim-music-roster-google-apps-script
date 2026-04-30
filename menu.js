function onOpen() {
  const userEmail = Session.getActiveUser().getEmail();

  // Only display menu for authorised users
  if (AUTHORIZED_USERS.includes(userEmail)) {
    SpreadsheetApp.getUi()
      .createMenu('Josiah Magic')
      .addItem('Generate weekly music email', 'generateWeeklyEmail')
      .addItem('Update "Last time sung" values', 'updateLastTimeSung')
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
