function shorten_link(link) {
  if (!link) return null;

  const authToken = PropertiesService.getScriptProperties().getProperty('BITLY_AUTH');
  // Keep local/test runs independent of the external Bitly service.
  if (!authToken) return `MOCK_LINK_${link}`;

  try {
    const response = UrlFetchApp.fetch('https://api-ssl.bitly.com/v4/shorten', {
      method: 'POST',
      muteHttpExceptions: true,
      contentType: 'application/json',
      headers: { Authorization: `Bearer ${authToken}` },
      payload: JSON.stringify({ long_url: link }),
    });
    const status = response.getResponseCode();
    const body = response.getContentText();
    if (status < 200 || status >= 300) {
      throw new Error(`Bitly API error ${status}: ${body}`);
    }
    const result = JSON.parse(body);
    if (!result.link) throw new Error('Bitly response did not include a shortened link.');
    return result.link;
  } catch (error) {
    Logger.log(error.message);
    return null;
  }
}

function test_create_link() {
  Logger.log(shorten_link('https://open.spotify.com/playlist/7niteYnlKKLDMAGKi33rjR?si=860d86180c12490b'));
}