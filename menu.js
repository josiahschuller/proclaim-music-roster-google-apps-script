
const ROSTER_SHEET = SpreadsheetApp.getActiveSheet();
const ROSTER_VALUES = ROSTER_SHEET.getDataRange().getValues();

const SONGS_SHEET = SpreadsheetApp.openById("1H0PYp0vqvONNPEbMCN-whh_rBvKkZUlWBXMH5VcVrYM").getActiveSheet();
const SONGS_VALUES = SONGS_SHEET.getDataRange().getValues();

function onOpen() {
  let ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('Josiah Magic')
      .addItem('Generate weekly music email', 'generateWeeklyEmail')
      .addItem('Update "Last time sung" values', 'updateLastTimeSung')
      .addToUi();
}

function generateWeeklyEmail() {
  SpreadsheetApp.getUi()
    .alert(generateMessage());
}

function updateLastTimeSung() {
  let ui = SpreadsheetApp.getUi();
  let result = ui.prompt(
    "Enter date of Sunday to update the 'last time sung' for each song:",
    ui.ButtonSet.OK_CANCEL
  );

  let button = result.getSelectedButton();
  let text = result.getResponseText();
  if (button == ui.Button.OK) {
    let logs = updateTimesPerTimestamp(text);
    ui.alert(logs);
  }
}


function processText(text) {
    // Process the text from the sidebar as needed
    Logger.log(text);
}
