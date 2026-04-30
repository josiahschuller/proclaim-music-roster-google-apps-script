function areDatesEqual(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();
}

class SheetTable {
  constructor(sheetGetter) {
    this._sheetGetter = sheetGetter;
    this._sheet = null;
    this._values = null;
  }

  get sheet() {
    if (!this._sheet) this._sheet = this._sheetGetter();
    return this._sheet;
  }

  get values() {
    if (!this._values) this._values = this.sheet.getDataRange().getValues();
    return this._values;
  }

  getColumnIndex(columnName) {
    const idx = this.values[0].indexOf(columnName);
    if (idx === -1) {
      throw new ReferenceError("No column with the name '" + columnName + "' found");
    }
    return idx;
  }

  getIndexForValue(columnName, value) {
    const equalityFn = columnName === "Date" ? areDatesEqual : (x, y) => x === y;
    const idx = this.values.findIndex(row => equalityFn(row[this.getColumnIndex(columnName)], value));
    if (idx === -1) {
      throw new ReferenceError(`No value with the name ${value} found in column ${columnName}`);
    }
    return idx;
  }

  getCell(row, col) {
    return this.values[row][col];
  }

  setCell(row, col, value) {
    this.sheet.getRange(row + 1, col + 1).setValue(value);
  }
}

const ROSTER_TABLE = new SheetTable(
  () => SpreadsheetApp.openById(ROSTER_SPREADSHEET_ID).getActiveSheet()
);

const VOLUNTEERS_TABLE = new SheetTable(
  () => SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Volunteers")
);

const SONGS_TABLE = new SheetTable(
  () => SpreadsheetApp.openById(SONGS_SPREADSHEET_ID).getActiveSheet()
);

const EMAIL_SENDS_TABLE = new SheetTable(
  () => SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Email Sends")
);
