/**
 * Create a short link using the Short.io API.
 * Configure SHORTIO_API_KEY and SHORTIO_DOMAIN in Apps Script Script Properties.
 */
function shortenLink(url) {
  if (!url) return null;

  const properties = PropertiesService.getScriptProperties();
  const apiKey = properties.getProperty('SHORTIO_API_KEY');
  const domain = properties.getProperty('SHORTIO_DOMAIN');

  // Keep local development and tests independent of Short.io.
  if (!apiKey) return `MOCK_LINK_${url}`;
  if (!domain) {
    Logger.log('Short.io is configured without SHORTIO_DOMAIN; cannot create a short link.');
    return null;
  }

  try {
    const response = UrlFetchApp.fetch('https://api.short.io/links', {
      method: 'POST',
      muteHttpExceptions: true,
      contentType: 'application/json',
      headers: { Authorization: apiKey },
      payload: JSON.stringify({ originalURL: url, domain }),
    });
    const status = response.getResponseCode();
    const body = response.getContentText();
    if (status < 200 || status >= 300) {
      throw new Error(`Short.io API error ${status}: ${body}`);
    }

    const result = JSON.parse(body);
    if (!result.shortURL) throw new Error('Short.io response did not include a shortURL.');
    return result.shortURL;
  } catch (error) {
    Logger.log(error.message);
    return null;
  }
}

function test_create_link() {
  Logger.log(shortenLink('https://open.spotify.com/playlist/7niteYnlKKLDMAGKi33rjR?si=860d86180c12490b'));
}
