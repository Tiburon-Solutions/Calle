import { google } from "googleapis";

export async function addEvent(auth, { summary, startTime, duration = 60 }) {
  const calendar = google.calendar({ version: "v3", auth });

  const start = new Date(startTime);
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const event = {
    summary,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
  });

  return res.data;
}
