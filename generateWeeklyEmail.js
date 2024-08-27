
function test_stuff() {
  Logger.log(generateMessage(new Date(2024, 3, 8))); // Month is indexed by 0, i.e. January is 0
}

function getColumnIndex(values, name) {
  /*
  Returns the column index, given the name of the column
  Inputs:
  - name (String): The name of the column
  Output (Number): index of the column
  */
  let columnIndex = values[0].indexOf(name);
  return columnIndex + 1;
}

function areDatesEqual(date1, date2) {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
}

function getRowIndex(values, name) {
  /*
    Returns the row index of the first occurrence of 'name' in a column.
    Inputs:
      - values (Array): A 2D array of values from a column in the sheet.
      - name (String): The name to search for in the column.
    Output (Number): The row index of the first occurrence of 'name', or -1 if not found.
  */
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] != undefined && values[i][0] instanceof Date) {
      if (areDatesEqual(values[i][0], name)) {
        return i + 1; // Adding 1 because array indices start at 0, but spreadsheet rows start at 1
      }
    }
    else {
      if (values[i][0] === name) {
        return i + 1; // Adding 1 because array indices start at 0, but spreadsheet rows start at 1
      }
    }
  }
  throw new ReferenceError("No row with the name '" + name + "' found");
}

function getRowIndexSong(songChosen) {
  /*
  Returns the row index of the given song
  Inputs:
  - song (String): the song
  Output (Number): index of the row
  */

  for (let row = 1; row < SONGS_VALUES.length; row++) {
    let song = SONGS_VALUES[row][getColumnIndex(ROSTER_VALUES, "Song")];
    
    if (song === songChosen) {
      return row + 1;
    }
  }
  throw new ReferenceError("No song with the name '" + songChosen + "' found");
}

function getSpotifySong(songChosen) {
  /*
  Returns the Spotify link of a given song
  Inputs:
  - songChosen (String): the name of the song
  Output (String): Spotify link to the song
  */
  return SONGS_SHEET.getRange(getRowIndexSong(songChosen), getColumnIndex(SONGS_VALUES, "Spotify")).getValue();
}

function getChordSheetSong(songChosen) {
  /*
  Returns a link to the chord sheet of a given song
  Inputs:
  - songChosen (String): the name of the song
  Output (String): link to the chord sheet of the song
  */
  return SONGS_SHEET.getRange(getRowIndexSong(songChosen), getColumnIndex(SONGS_VALUES, "Chord chart")).getValue();
}

function getLeadSheetSong(songChosen) {
  /*
  Returns a link to the lead sheet of a given song
  Inputs:
  - songChosen (String): the name of the song
  Output (String): link to the lead sheet of the song
  */
  return SONGS_SHEET.getRange(getRowIndexSong(songChosen), getColumnIndex(SONGS_VALUES, "Lead sheet")).getValue();
}

function getRowIndexNextSunday(reference_date = new Date()) {
  /*
  Returns the row index of the first date that is greater than today.
  That is, it finds the row index for the next Sunday
  Inputs:
  - OPTIONAL: reference_date (Date): the date before the next Sunday. Default is today's date
  Output (Number): index of the row
  */
  for (let row = 1; row < ROSTER_VALUES.length; row++) {
    let date = ROSTER_VALUES[row][getColumnIndex(ROSTER_VALUES, "Date") - 1];
    
    if (new Date(date) > reference_date) {
      // If the date is a later date than today, then return this date
      return row + 1;
    }
  }
  throw new ReferenceError("No date later than today found")
}

function songText(songName, rowIndex) {
  /*
  Generates message text for a song from the given song name and date
  Inputs:
  - songName (String): the name of the song
  - rowIndex (Number): Index of the row
  Output (String): message text for the song
  */
  let song = getCell(ROSTER_SHEET, rowIndex, getColumnIndex(ROSTER_VALUES, songName));

  if (song === "") {
    return "";
  }

  let text = `\n- ${song} (`;

  let spotifyLink = shorten_link(getSpotifySong(song))
  if (spotifyLink !== undefined) {
    text += `Spotify: ${spotifyLink}, `;
  }

  let chordSheetLink = shorten_link(getChordSheetSong(song));
  if (chordSheetLink !== undefined) {
    text += `chord sheet: ${chordSheetLink}, `;
  }

  let leadSheetLink = shorten_link(getLeadSheetSong(song));
  if (leadSheetLink !== undefined) {
    text += `lead sheet: ${leadSheetLink}, `;
  }
  
  // Remove the last comma and space
  text = text.slice(0, -2);

  text += ")";

  return text;
}


function generateMessage(date = new Date()) {
  /*
  Writes the contents of a message to be sent to the music team.
  Inputs:
  - OPTIONAL: date (Date): the date before the next Sunday. Default is today's date
  Output (String): The contents of the message
  */

  let relevantRow = getRowIndexNextSunday(date);

  let output = ""
  output += 
  `Hi all,\
  \n\nThanks for volunteering your talents to serve on the band this week.\
  \n\nThe team:\
  \nSingers: ${getCell(ROSTER_SHEET, relevantRow, getColumnIndex(ROSTER_VALUES, "Singers"))}`;
  let keys = getCell(ROSTER_SHEET, relevantRow, getColumnIndex(ROSTER_VALUES, "Keys"));
  if (keys != "") {
    output += `\nKeys: ${keys}`;
  }
  let guitar = getCell(ROSTER_SHEET, relevantRow, getColumnIndex(ROSTER_VALUES, "Guitar"));
  if (guitar != "") {
    output += `\nGuitar: ${guitar}`;
  }
  let other = getCell(ROSTER_SHEET, relevantRow, getColumnIndex(ROSTER_VALUES, "Other"));
  if (other != "") {
    output += `\nOther: ${other}`;
  }

  output += '\n\nThe songs (give them a good listen before the practice!):';
  output += songText("Song 1", relevantRow);
  output += songText("Song 2", relevantRow);
  output += songText("Song 3", relevantRow);
  output += songText("Song 4", relevantRow);
  output += songText("Song 5", relevantRow);
  if (output.toUpperCase().includes("JOSIAH")) {
    output += `\n\nWould you all be free for a practice at THIS TIME at my house (450 Middle Road, Pearcedale)? I can print sheet music for everyone.`;
  } else {
    output += `\n\nPlease organise a time and place to practise by replying all to this email and decide on who will print sheet music.`;

  }
  output += `\n\nAs usual, meet at 7:30am on Sunday for set-up and a quick run through. Let me know if you have any questions!\
  \n\nIn Christ\
  \nJosiah`;

  return output;
}

/*
Example output:

Hi all,  

Thanks for volunteering your talents to serve on the band this week.  

The team:  
Singers: Paul, Owen, Lauren
Keys: Lauren
Other: Caleb

The songs (give them a good listen before the practice!):
- This Is The Day (Spotify: https://spoti.fi/3pZ0egH, chord sheet: https://bit.ly/42NZolj, lead sheet: https://bit.ly/3Y7fy7Y)
- How Deep the Father's Love For Us (Spotify: https://spoti.fi/43iN6Bs, chord sheet: https://bit.ly/3Ovu5HK, lead sheet: https://bit.ly/3Q4JDTD)
- Look And See (Spotify: https://spoti.fi/3R9VM8n, chord sheet: https://bit.ly/3Om5CnD, lead sheet: https://bit.ly/3Opi99N)
- This Life I Live (Spotify: https://spoti.fi/3LB9sbs, chord sheet: https://bit.ly/3LUl6yD, lead sheet: https://bit.ly/3Q3v8PT)
- In Christ Alone (Spotify: https://spoti.fi/3xkGl3P, chord sheet: https://bit.ly/3K4EdVp, lead sheet: https://bit.ly/3Op5wLX)

Please organise a time and place to practise by replying all to this email and decide on who will print sheet music. After the practice, please email Elise with the song structures (so she can put the slides together).
Would you all be free on THIS TIME at my house (10 Dakota Street, Officer)? I can print sheet music for everyone.

As usual, meet at 7:30am on Sunday for set-up and a quick run through. Let me know if you have any questions!  

In Christ  
*/


