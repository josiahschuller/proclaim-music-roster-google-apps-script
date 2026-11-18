const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppsScript } = require('./helpers/loadAppsScript');

function loadShortIo({ apiKey = null, domain = null, fetch } = {}) {
  const logs = [];
  const apps = loadAppsScript(['shortIo.js'], {
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: name => ({ SHORTIO_API_KEY: apiKey, SHORTIO_DOMAIN: domain })[name] || null,
      }),
    },
    UrlFetchApp: { fetch },
    Logger: { log: message => logs.push(message) },
  });
  return { ...apps, logs };
}

test('shortenLink skips empty URLs and returns a local mock without credentials', () => {
  const apps = loadShortIo();
  assert.equal(apps.evaluate('shortenLink("")'), null);
  assert.equal(apps.evaluate('shortenLink("https://example.com")'), 'MOCK_LINK_https://example.com');
});

test('shortenLink sends the Short.io API key, domain, and original URL', () => {
  let request;
  const apps = loadShortIo({
    apiKey: 'test-api-key',
    domain: 'example.short.gy',
    fetch: (url, options) => {
      request = { url, options };
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ shortURL: 'https://example.short.gy/abc' }) };
    },
  });

  assert.equal(apps.evaluate('shortenLink("https://example.com/long")'), 'https://example.short.gy/abc');
  assert.equal(request.url, 'https://api.short.io/links');
  assert.equal(request.options.headers.Authorization, 'test-api-key');
  assert.deepEqual(JSON.parse(request.options.payload), {
    originalURL: 'https://example.com/long',
    domain: 'example.short.gy',
  });
});

test('shortenLink reports API failures and missing Short.io domains', () => {
  const failing = loadShortIo({
    apiKey: 'test-api-key',
    domain: 'example.short.gy',
    fetch: () => ({ getResponseCode: () => 401, getContentText: () => 'unauthorized' }),
  });
  assert.equal(failing.evaluate('shortenLink("https://example.com")'), null);
  assert.match(failing.logs[0], /Short.io API error 401/);

  const missingDomain = loadShortIo({ apiKey: 'test-api-key' });
  assert.equal(missingDomain.evaluate('shortenLink("https://example.com")'), null);
  assert.match(missingDomain.logs[0], /SHORTIO_DOMAIN/);
});
