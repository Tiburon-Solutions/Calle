import { google } from "googleapis";

interface AddEventOptions {
  summary: string;
  startTime: Date;
  duration?: number;
}

export async function addEvent(
  auth: any,
  { summary, startTime, duration = 60 }: AddEventOptions
) {
  const calendar = google.calendar({ version: "v3", auth: auth as any });

  const start = new Date(startTime);
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const event = {
    summary,
    start: { dateTime: start.toISOString(), timeZone: "Europe/Stockholm" },
    end: { dateTime: end.toISOString(), timeZone: "Europe/Stockholm" },
  };

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
  });

  return res.data;
}

export async function listEvents(
  auth: any,
  timeMin: Date,
  timeMax: Date
) {
  const calendar = google.calendar({ version: "v3", auth: auth as any });

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  return res.data.items || [];
}
