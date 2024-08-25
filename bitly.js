const BITLY_AUTH = PropertiesService.getScriptProperties().getProperty('BITLY_AUTH');

function shorten_link(link) {
  /*
  Makes a POST query to Bitly to shorten a given link
  Inputs:
  - link (String): the link to be shortened
  Output (string): a shortened link
  */

  // If auth token is commented out (for during testing), return a mock value.
  // This is so that we're not bombarding the Bitly API with unnecessary requests.
  if (typeof BITLY_AUTH === "undefined") {
    return "MOCK_LINK_" + link;
  }

  let data = {
    "method": "POST",
    'muteHttpExceptions': true,
    "contentType": "application/json",
    "headers": {
      "Authorization": "Bearer " + BITLY_AUTH
    },
    "payload": JSON.stringify({
      "long_url": link
    })
  }

  let response;
  try {
    // Send the request
    response = UrlFetchApp.fetch("https://api-ssl.bitly.com/v4/shorten", data);
  } catch(err) {
    Logger.log(err);
  } finally {
    let responseJSON = JSON.parse(response);
    return responseJSON["link"];
  }
}

function test_create_link() {
  // Logger.log(shorten_link("https://open.spotify.com/track/6PuRiFmPgp8xQNIAwMSISl?si=321b35e196d24704"));
  Logger.log(shorten_link("https://open.spotify.com/playlist/7niteYnlKKLDMAGKi33rjR?si=860d86180c12490b"));
}