const BITLY_AUTH = PropertiesService.getScriptProperties().getProperty('BITLY_AUTH');

function shorten_link(link) {
  /*
  Makes a POST query to Bitly to shorten a given link
  Inputs:
  - link (String): the link to be shortened
  Output (string): a shortened link, or null if the link is empty or the request fails
  */

  if (!link) {
    return null;
  }

  // If auth token is not set (e.g. during testing), return a mock value
  // to avoid unnecessary Bitly API requests.
  if (!BITLY_AUTH) {
    return "MOCK_LINK_" + link;
  }

  const data = {
    "method": "POST",
    "muteHttpExceptions": true,
    "contentType": "application/json",
    "headers": {
      "Authorization": "Bearer " + BITLY_AUTH
    },
    "payload": JSON.stringify({
      "long_url": link
    })
  };

  try {
    const response = UrlFetchApp.fetch("https://api-ssl.bitly.com/v4/shorten", data);
    return JSON.parse(response)["link"];
  } catch (err) {
    Logger.log(err);
    return null;
  }
}

function test_create_link() {
  Logger.log(shorten_link("https://open.spotify.com/playlist/7niteYnlKKLDMAGKi33rjR?si=860d86180c12490b"));
}