function test_weekly_email_stuff() {
  const nextSundayDate = getNextDate(new Date());
  const serviceData = getServiceData(nextSundayDate);
  const emailMessage = generateMessage(serviceData);
  Logger.log(emailMessage);
}

function sendEmailIfNotAlreadySent() {
  const nextSundayDate = getNextDate(new Date());
  if (!checkIfEmailAlreadySent(nextSundayDate)) {
    generateAndSendWeeklyEmail();
    logEmailSent(nextSundayDate);
  } else {
    Logger.log("Already sent for this Sunday");
  }
}

function checkIfEmailAlreadySent(nextSundayDate) {
  try {
    EMAIL_SENDS_TABLE.getIndexForValue("Date", nextSundayDate);
    return true;
  } catch {
    return false;
  }
}

function logEmailSent(nextSundayDate) {
  const TOP_ROW = 2;
  EMAIL_SENDS_TABLE.sheet.insertRowBefore(TOP_ROW);
  EMAIL_SENDS_TABLE.sheet.getRange(TOP_ROW, 1, 1, 2).setValues([[nextSundayDate, new Date()]]);
}

function generateAndSendWeeklyEmail() {
  /*
  This is the main function that is called automatically once per week
  */
  const today = new Date();
  try {
    const nextSundayDate = getNextDate(today);
    const serviceData = getServiceData(nextSundayDate);
    const emailParams = determineEmailParams(serviceData);
    sendEmail(emailParams.to, emailParams.cc, emailParams.subject, emailParams.message);
    return "Sent email successfully!";
  } catch (error) {
    Logger.log(error.message);
    sendEmail(
      [SENDER_EMAIL],
      [],
      "Error sending weekly Proclaim music email",
      `Error message:\n${error.message}`,
    );
    return error.message;
  }
}

function getNextDate(referenceDate) {
  /*
  Returns the date of the first row in the roster that is later than referenceDate.
  */
  for (let row = 1; row < ROSTER_TABLE.values.length; row++) {
    const date = ROSTER_TABLE.values[row][ROSTER_TABLE.getColumnIndex("Date")];
    if (new Date(date) > referenceDate) {
      return date;
    }
  }
  throw new ReferenceError("No date later than today found");
}

function addMusician(musicians, role, name) {
  if (role in musicians) {
    musicians[role].push(name);
  } else {
    musicians[role] = [name];
  }
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
    - "soundDeskPeople": list of names on the sound desk
  */
  const relevantRow = ROSTER_TABLE.values[ROSTER_TABLE.getIndexForValue("Date", date)];

  const musicians = {};

  MUSICIAN_ROLES.forEach(role => {
    const roleMusiciansStr = relevantRow[ROSTER_TABLE.getColumnIndex(role)];
    if (!roleMusiciansStr) return;
    roleMusiciansStr.split(", ").forEach(name => addMusician(musicians, role, name));
  });

  const songs = [];
  SONG_COLUMNS.forEach(songColumn => {
    const songName = relevantRow[ROSTER_TABLE.getColumnIndex(songColumn)];
    if (!songName) return;
    songs.push(getSongInformation(songName));
  });

  const soundDeskStr = relevantRow[ROSTER_TABLE.getColumnIndex("Sound Desk")];
  const soundDeskPeople = soundDeskStr ? soundDeskStr.split(", ") : [];

  return { date, songs, musicians, soundDeskPeople };
}

function getSongInformation(songName) {
  const songRow = SONGS_TABLE.values[SONGS_TABLE.getIndexForValue("Song", songName)];

  return {
    name: songName,
    spotifyLink: shorten_link(songRow[SONGS_TABLE.getColumnIndex("Spotify")]),
    chordChart: shorten_link(songRow[SONGS_TABLE.getColumnIndex("Chord chart")]),
    leadSheet: shorten_link(songRow[SONGS_TABLE.getColumnIndex("Lead sheet")]),
  };
}

function generateMessage(serviceData) {
  const openingStatements = [
    "Thanks for volunteering your talents to serve on the band this week.",
    "Thanks for volunteering to serve on the band this week.",
    "Thanks for serving the church by being on the band this week.",
    "Thanks in advance for leading the church in worship through song this week.",
    "Thanks in advance for all the time and talents you put into serving this week.",
    "Appreciate your work as always to serve on the band at church.",
  ];

  const randomOpening = openingStatements[Math.floor(Math.random() * openingStatements.length)];

  const teamLines = Object.entries(serviceData.musicians)
    .map(([role, musos]) => `${role}: ${musos.join(", ")}`)
    .join("\n");

  const songLines = serviceData.songs.map(song => {
    const parts = [
      song.spotifyLink && `Spotify: ${song.spotifyLink}`,
      song.chordChart  && `Chord sheet: ${song.chordChart}`,
      song.leadSheet   && `Lead sheet: ${song.leadSheet}`,
    ].filter(Boolean);
    return `- ${song.name} (${parts.join(", ")})`;
  }).join("\n");

  const isJosiahPlaying = Object.values(serviceData.musicians).flat()
    .some(name => name.toUpperCase().includes("JOSIAH"));

  const practiceNote = isJosiahPlaying
    ? `What time would you all be free for a practice? I'm happy to host, but happy to meet wherever works best. I can print sheet music for anyone who needs.`
    : `Please organise a time and place to practise by replying all to this email (and decide on who will print sheet music).`;

  return `Hi all,\n\n${randomOpening}\n\nThe team:\n${teamLines}\n\nThe songs (give them a good listen before the practice!):\n${songLines}\n\n${practiceNote}\n\nAs usual, meet at 7:30am on Sunday for set-up and a quick run through. Let me know if you have any questions!\n\nIn Christ\nJosiah\n\nNote: this email has been auto-generated.`;
}

function generateSubject(serviceData) {
  const dateString = (new Date(serviceData.date)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `Proclaim Music ${dateString}`;
}

function getEmailAddresses(volunteerName) {
  const rowIndex = VOLUNTEERS_TABLE.getIndexForValue("Name", volunteerName);
  const emailAddress = VOLUNTEERS_TABLE.values[rowIndex][VOLUNTEERS_TABLE.getColumnIndex("Email Address")];
  if (!emailAddress) {
    throw new ReferenceError(`Volunteer ${volunteerName} has no email address listed!`);
  }
  const emailAddresses = [emailAddress];
  const parentEmail = VOLUNTEERS_TABLE.values[rowIndex][VOLUNTEERS_TABLE.getColumnIndex("Parent Email Address (if under 18)")];
  if (parentEmail) {
    emailAddresses.push(parentEmail);
  }
  return emailAddresses;
}

function determineEmailParams(serviceData) {
  const volunteers = [...new Set(
    Object.values(serviceData.musicians).flat()
  )];

  const to = volunteers.flatMap(name => getEmailAddresses(name));
  const cc = [
    ...CC_RECIPIENTS.flatMap(name => getEmailAddresses(name)),
    ...serviceData.soundDeskPeople.flatMap(name => getEmailAddresses(name)),
  ];

  return {
    to,
    cc,
    subject: generateSubject(serviceData),
    message: generateMessage(serviceData),
  };
}

function sendEmail(to, cc, subject, message) {
  GmailApp.sendEmail(
    to.join(", "),
    subject,
    message,
    {
      cc: cc.join(", "),
      name: SENDER_NAME,
    }
  );
  Logger.log(`Email with subject "${subject}" sent successfully!`);
}
