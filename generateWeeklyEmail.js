
function test_stuff() {
  const nextSundayDate = getNextDate(new Date(2025, 0, 8)); // Month is indexed by 0, i.e. January is 0
  const serviceData = getServiceData(nextSundayDate);
  const emailParams = determineEmailParams(serviceData);

  const emailMessage = generateMessage(serviceData);

  Logger.log(emailMessage);
}

function generateAndSendWeeklyEmail() {
  /*
  This is the main function that is called automatically once per week
  */
  try {
    const nextSundayDate = getNextDate(new Date());
    const serviceData = getServiceData(nextSundayDate);
    const emailParams = determineEmailParams(serviceData);
    sendEmail(emailParams.to, emailParams.cc, emailParams.subject, emailParams.message);
    return "Sent email successfully!";
  } catch (error) {
    Logger.log(error.message);
    sendEmail(
      ["josiahschuller@gmail.com"],
      [],
      "Error sending weekly Proclaim music email",
      `Error message:\n${error.message}`,
    )
    return error.message;
  }
}

function getColumnIndex(values, columnName) {
  /*
  Returns the column index, given the name of the column
  Inputs:
  - values (Array): A 2D array of values from the sheet
  - name (String): The name of the column
  Output (Number): index of the column
  */
  let columnIndex = values[0].indexOf(columnName);
  if (columnIndex === -1) {
    throw new ReferenceError("No column with the name '" + columnName + "' found");
  }
  return columnIndex;
}

function getIndexForValue(values, columnName, value) {
  /*
  Returns the row index of the given value in the given column
  Inputs:
    - values (Array): A 2D array of values from a column in the sheet.
    - columnName (String): Name of the column containing the value
    - value (Any): Value in the column
  Output (Number): index of the row
  */
  let equalityFunction;
  if (columnName === "Date") {
    equalityFunction = areDatesEqual;
  } else {
    equalityFunction = (x, y) => x === y;
  }

  let matchedRowIndex = values.findIndex(row => equalityFunction(row[getColumnIndex(values, columnName)], value));
  if (matchedRowIndex === -1) {
    throw new ReferenceError(`No value with the name ${value} found in column ${columnName}`);
  } else {
    return matchedRowIndex;
  }
}

function areDatesEqual(date1, date2) {
  /*
  Returns true if the two dates are equal

  Inputs:
  - date1 (Date/String): first date
  - date2 (Date/String): second date
  Output (Boolean): true if the dates are equal
  */
  const date1Date = new Date(date1);
  const date2Date = new Date(date2);
  return date1Date.getDate() === date2Date.getDate() &&
         date1Date.getMonth() === date2Date.getMonth() &&
         date1Date.getFullYear() === date2Date.getFullYear();
}

function getSongInformation(songName) {
  /*
  Returns information for a song
  Inputs:
  - songName (String): the name of the song
  Output (Object):
    - "name": name of the song
    - "spotifyLink": Spotify link for the song
    - "chordChart": chord chart for the song
    - "leadSheet": lead sheet for the song
  */
  let songRow = SONGS_VALUES[getIndexForValue(SONGS_VALUES, "Song", songName)];

  return {
    name: songName,
    spotifyLink: shorten_link(songRow[getColumnIndex(SONGS_VALUES, "Spotify")]),
    chordChart: shorten_link(songRow[getColumnIndex(SONGS_VALUES, "Chord chart")]),
    leadSheet: shorten_link(songRow[getColumnIndex(SONGS_VALUES, "Lead sheet")]),
  };
}

function getNextDate(reference_date) {
  /*
  Returns the date of the first date that is greater than today.
  That is, it finds the row index for the next Sunday
  Inputs:
  - reference_date (Date): the date before the next Sunday.
  Output (Date): Date object of the next date
  */
  for (let row = 1; row < ROSTER_VALUES.length; row++) {
    let date = ROSTER_VALUES[row][getColumnIndex(ROSTER_VALUES, "Date")];
    
    if (new Date(date) > reference_date) {
      // If the date is a later date than today, then return this date
      return date;
    }
  }
  throw new ReferenceError("No date later than today found")
}

function getServiceData(date) {
  /*
  Gets the data for one week.
  Inputs:
  - date (Date): the date of the service to get data for.
  Output (Object):
    - "date": service date
    - "songs": list of information objects for each song
    - "musicians": object, where the keys are roles and the values are lists of volunteer names
  */
  let relevantRowIndex = getIndexForValue(ROSTER_VALUES, "Date", date);
  let relevantRow = ROSTER_VALUES[relevantRowIndex];

  let musicians = {};

  ["Singers", "Keys", "Guitar"].forEach(role => {
    let roleMusiciansStr = relevantRow[getColumnIndex(ROSTER_VALUES, role)];
    if (roleMusiciansStr === "") {
      return;
    }
    let roleMusicians = roleMusiciansStr.split(", ");

    roleMusicians.forEach(muso => {
      if (role in musicians) {
        musicians[role].push(muso);
      } else {
        musicians[role] = [muso];
      }
    });
  });

  let otherMusiciansStr = relevantRow[getColumnIndex(ROSTER_VALUES, "Other")]
  if (otherMusiciansStr !== "") {
    let otherMusicians = otherMusiciansStr.split(", ");
    // Assumes that other musos are in the form of "Role1: Name1, Role2: Name2, ..."
    otherMusicians.forEach(roleMuso => {
      let [role, muso] = roleMuso.split(": ");
      if (role in musicians) {
        musicians[role].push(muso);
      } else {
        musicians[role] = [muso];
      }
    });
  }

  let songs = [];
  ["Song 1", "Song 2", "Song 3", "Song 4", "Song 5"].forEach(songColumn => {
    let songName = relevantRow[getColumnIndex(ROSTER_VALUES, songColumn)];
    if (!songName) {
      return;
    }
    songs.push(getSongInformation(relevantRow[getColumnIndex(ROSTER_VALUES, songColumn)]))
  })

  return {
    date: date,
    songs: songs,
    musicians: musicians,
  }
}

function generateMessage(serviceData) {
  /*
  Writes the contents of a message to be sent to the music team.
  Inputs:
  - serviceData (Object): service data containing the following:
    - "date": service date
    - "songs": list of information objects for each song
    - "musicians": object, where the keys are roles and the values are lists of volunteer names
  Output (String): The contents of the message
  */

  const openingStatements = [
    "Thanks for volunteering your talents to serve on the band this week.",
    "Thanks for volunteering to serve on the band this week.",
    "Thanks for serving the church by being on the band this week.",
    "Thanks in advance for leading the church in worship through song this week.",
    "Thanks in advance for all the time and talents you put into serving this week.",
  ];

  const randomOpeningStatement = openingStatements[Math.floor(Math.random() * openingStatements.length)];

  let output = ""
  output += 
  `Hi all,\
  \n\n${randomOpeningStatement}\
  \n\nThe team:`;
  output += Object.entries(serviceData.musicians).map(([role, musos]) => `\n${role}: ${musos.join(", ")}`);

  output += '\n\nThe songs (give them a good listen before the practice!):';
  output += serviceData.songs.map(songInformation => {
      let songText = `\n- ${songInformation.name} (`;
      if (songInformation.spotifyLink) {
        songText += `Spotify: ${songInformation.spotifyLink}, `;
      }
      if (songInformation.chordChart) {
        songText += `Chord sheet: ${songInformation.chordChart}, `;
      }
      if (songInformation.leadSheet) {
        songText += `Lead sheet: ${songInformation.leadSheet}, `;
      }
      songText = songText.slice(0, -2);  // Remove ", " from end of the string
      songText += ")";
      return songText;
    }
  );
  if (output.toUpperCase().includes("JOSIAH")) {
    output += `\n\nWhat time would you all be free for a practice? I'm happy to host, but happy to meet wherever works best. I can print sheet music for anyone who needs.`;
  } else {
    output += `\n\nPlease organise a time and place to practise by replying all to this email (and decide on who will print sheet music).`;
  }
  output += `\n\nAs usual, meet at 7:30am on Sunday for set-up and a quick run through. Let me know if you have any questions!\
  \n\nIn Christ\
  \nJosiah`;

  return output;
}

function generateSubject(serviceData) {
  /*
  Writes the subject of the email.
  Inputs:
  - serviceData (Object): service data containing the following:
    - "date": service date
    - "songs": list of information objects for each song
    - "musicians": object, where the keys are roles and the values are lists of volunteer names
  Output (String): The subject for the email
  */
  const dateString = (new Date(serviceData.date)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `Proclaim Music ${dateString}`;
}

function getEmailAddresses(volunteerName) {
  /*
  Get the email address of a volunteer (and of their parent if listed)
  Inputs:
  - volunteerName (String): name of the volunteer
  Output (Array): array containing email address of volunteer and optionally of their parent
  */
  const volunteerRowIndex = getIndexForValue(VOLUNTEERS_VALUES, "Name", volunteerName);
  const volunteerEmailAddress = VOLUNTEERS_VALUES[volunteerRowIndex]["Email Address"];
  if (!volunteerEmailAddress) {
    throw new ReferenceError(`Volunteer ${volunteerName} has no email address listed!`);
  }
  const emailAddresses = [volunteerEmailAddress];
  const parentEmailAddress = VOLUNTEERS_VALUES[volunteerRowIndex]["Parent Email Address (if under 18)"];
  if (parentEmailAddress !== "") {
    emailAddresses.push(parentEmailAddress);
  }
  
  return emailAddresses;
}

function determineEmailParams(serviceData) {
  /*
  Determines parameters for the weekly email to send
  Inputs:
  - serviceData (Object): data for the service to send email regarding
  Output (Object):
    - to (Array): email addresses to send email to
    - cc (Array): email addresses to carbon copy
    - subject (String): subject of the email
    - message (String): message of the email
  */
  const volunteers = [...new Set(
    Object.entries(serviceData.musicians).map(
        ([role, names]) => names
      ).flat()
    )];

  const to = [];
  const cc = [];

  // Add Reece to cc
  const reeceEmailAddress = VOLUNTEERS_VALUES[getIndexForValue(VOLUNTEERS_VALUES, "Name", "Reece")][getColumnIndex(VOLUNTEERS_VALUES, "Email Address")];
  if (!reeceEmailAddress) {
    throw new ReferenceError(`Reece has no email address listed!`);
  }
  cc.push(reeceEmailAddress);

  // Add volunteers (and optionally their parents)
  volunteers.forEach(volunteerName => {
    const volunteerRowIndex = getIndexForValue(VOLUNTEERS_VALUES, "Name", volunteerName);
    const volunteerEmailAddress = VOLUNTEERS_VALUES[volunteerRowIndex][getColumnIndex(VOLUNTEERS_VALUES, "Email Address")];
    if (!volunteerEmailAddress) {
      throw new ReferenceError(`Volunteer ${volunteerName} has no email address listed!`);
    }
    to.push(volunteerEmailAddress);
    const parentEmailAddress = VOLUNTEERS_VALUES[volunteerRowIndex][getColumnIndex(VOLUNTEERS_VALUES, "Parent Email Address (if under 18)")];
    if (parentEmailAddress !== "") {
      cc.push(parentEmailAddress);
    }
  });

  return {
    to: to,
    cc: cc,
    subject: generateSubject(serviceData),
    message: generateMessage(serviceData),
  }
}

function sendEmail(to, cc, subject, message) {
  /*
  Send email.
  Inputs:
  - to (Array): email addresses to send email to
  - cc (Array): email addresses to carbon copy
  - subject (String): subject of the email
  - message (String): message of the email
  */
  GmailApp.sendEmail(
    to.join(", "),
    subject,
    message,
    {
      cc: cc.join(", "),
      name: "Josiah Schuller",
    }
  );
  Logger.log(`Email with subject "${subject}" sent successfully! `);
}

