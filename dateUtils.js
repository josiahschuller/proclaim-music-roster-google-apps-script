/** Parse a real calendar date in DD/MM/YYYY format (local time). */
function parseDateString(dateString) {
  if (typeof dateString !== "string") {
    throw new TypeError("Date must be a string in DD/MM/YYYY format.");
  }
  const match = dateString.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) throw new RangeError("Date must be in DD/MM/YYYY format.");

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new RangeError("Date is not a valid calendar date.");
  }
  return date;
}

function isSunday(date) {
  return date instanceof Date && !Number.isNaN(date.getTime()) && date.getDay() === 0;
}

function formatDateString(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError("Expected a valid Date.");
  }
  return [String(date.getDate()).padStart(2, "0"), String(date.getMonth() + 1).padStart(2, "0"), date.getFullYear()].join("/");
}
