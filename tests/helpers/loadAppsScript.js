const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '../..');

/** Load Apps Script source into an isolated VM with injectable Google service mocks. */
function loadAppsScript(files, services = {}) {
  const context = vm.createContext({
    console,
    Logger: { log() {} },
    SpreadsheetApp: services.SpreadsheetApp || {},
    PropertiesService: services.PropertiesService || {
      getScriptProperties: () => ({ getProperty: () => null }),
    },
    ...services,
  });

  for (const file of files) {
    const filename = path.join(ROOT, file);
    vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
  }

  return {
    context,
    evaluate(source) {
      return vm.runInContext(source, context);
    },
  };
}

module.exports = { loadAppsScript };
