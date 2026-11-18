const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppsScript } = require('./helpers/loadAppsScript');

function loadUtilities(sheet) {
  const apps = loadAppsScript(['config.js', 'dateUtils.js', 'sheetUtils.js', 'updateLastTimeSung.js'], {
    SpreadsheetApp: {
      openById: () => ({ getActiveSheet: () => sheet }),
      getActiveSpreadsheet: () => ({ getSheetByName: () => sheet }),
    },
  });
  return apps;
}

test('convertStringToDate parses DD/MM/YYYY as a local date', () => {
  const { evaluate } = loadUtilities({});
  const date = evaluate('convertStringToDate("09/02/2025")');
  assert.equal(date.getFullYear(), 2025);
  assert.equal(date.getMonth(), 1);
  assert.equal(date.getDate(), 9);
  assert.throws(() => evaluate('parseDateString("31/02/2025")'), /valid calendar date/);
  assert.throws(() => evaluate('parseDateString("9/02/2025")'), /DD\/MM\/YYYY/);
});

test('areDatesEqual compares calendar days and handles Date and string inputs', () => {
  const { evaluate } = loadUtilities({});
  assert.equal(evaluate('areDatesEqual(new Date(2025, 1, 9, 8), new Date(2025, 1, 9, 20))'), true);
  assert.equal(evaluate('areDatesEqual(new Date(2025, 1, 9), new Date(2025, 1, 10))'), false);
});

test('SheetTable finds columns and values and reports missing entries', () => {
  const values = [['Date', 'Song'], [new Date(2025, 1, 9), 'Example']];
  const sheet = {
    getDataRange: () => ({ getValues: () => values }),
    getRange: () => ({ setValue() {} }),
  };
  const { evaluate } = loadUtilities(sheet);

  assert.equal(evaluate('ROSTER_TABLE.getColumnIndex("Song")'), 1);
  assert.equal(evaluate('ROSTER_TABLE.getIndexForValue("Song", "Example")'), 1);
  assert.throws(() => evaluate('ROSTER_TABLE.getColumnIndex("Missing")'), /No column/);
  assert.throws(() => evaluate('ROSTER_TABLE.getIndexForValue("Song", "Absent")'), /No value/);
});

test('SheetTable writes to the corresponding one-based sheet cell', () => {
  let written;
  const sheet = {
    getDataRange: () => ({ getValues: () => [['Song', 'Last time sung'], ['Example', null]] }),
    getRange: (row, column) => ({ setValue: value => { written = { row, column, value }; } }),
  };
  const { evaluate } = loadUtilities(sheet);
  evaluate('ROSTER_TABLE.setCell(1, 1, new Date(2025, 1, 9))');
  assert.equal(written.row, 2);
  assert.equal(written.column, 2);
  assert.equal(written.value.getDate(), 9);
});

test('SheetTable cache reflects writes made through setCell', () => {
  const values = [['Song', 'Last time sung'], ['Example', null]];
  const sheet = {
    getDataRange: () => ({ getValues: () => values }),
    getRange: (row, column) => ({ setValue: value => { values[row - 1][column - 1] = value; } }),
  };
  const { evaluate } = loadUtilities(sheet);
  evaluate('ROSTER_TABLE.setCell(1, 1, "Updated")');
  assert.equal(evaluate('ROSTER_TABLE.getCell(1, 1)'), 'Updated');
});

test('bulk sync row selection filters by service ID and start date', () => {
  const values = [
    ['Date', 'WorshipTools ID'],
    ['02/02/2025', 'service-old'],
    ['09/02/2025', 'service-next'],
    ['16/02/2025', ''],
  ];
  const sheet = { getDataRange: () => ({ getValues: () => values }) };
  const apps = loadAppsScript(['config.js', 'dateUtils.js', 'sheetUtils.js', 'myLogger.js', 'syncWorshipTools.js'], {
    SpreadsheetApp: { openById: () => ({ getActiveSheet: () => sheet }), getActiveSpreadsheet: () => ({ getSheetByName: () => sheet }) },
  });
  assert.deepEqual(Array.from(apps.evaluate('getRosterRowsForSync("09/02/2025")'), row => row[1]), ['service-next']);
  assert.deepEqual(Array.from(apps.evaluate('getRosterRowsForSync(null)'), row => row[1]), ['service-old', 'service-next']);
});

test('email recipients are deduplicated and To takes precedence over Cc', () => {
  const apps = loadAppsScript(['config.js', 'generateWeeklyEmail.js']);
  apps.context.getEmailAddresses = name => ({
    Alice: ['alice@example.com', 'parent@example.com'],
    Bob: ['bob@example.com'],
    Reece: ['alice@example.com'],
    Sound: ['bob@example.com', 'sound@example.com'],
  })[name];
  const params = apps.evaluate(`determineEmailParams({
    date: new Date(2025, 1, 9), songs: [],
    musicians: { Singers: ['Alice', 'Bob', 'Alice'] }, soundDeskPeople: ['Sound'],
  })`);
  assert.deepEqual(Array.from(params.to), ['alice@example.com', 'parent@example.com', 'bob@example.com']);
  assert.deepEqual(Array.from(params.cc), ['sound@example.com']);
});

test('date helpers identify Sundays and format dates consistently', () => {
  const { evaluate } = loadUtilities({});
  assert.equal(evaluate('isSunday(parseDateString("09/02/2025"))'), true);
  assert.equal(evaluate('isSunday(parseDateString("10/02/2025"))'), false);
  assert.equal(evaluate('formatDateString(parseDateString("09/02/2025"))'), '09/02/2025');
});
