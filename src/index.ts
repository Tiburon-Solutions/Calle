#!/usr/bin/env bun

import { program } from "commander";
import * as chrono from "chrono-node";
import { getAuthClient } from "./auth.js";
import { addEvent, listEvents } from "./calendar.js";

program
  .name("calle")
  .description("Google Calendar CLI")
  .version("1.0.0");

function parseListRange(args: string[]): { timeMin: Date; timeMax: Date } {
  const input = args.join(" ").toLowerCase().trim();
  const now = new Date();

  // "next week", "next month"
  const isNext = input.startsWith("next ");
  const period = isNext ? input.slice(5) : input;

  if (period === "week") {
    const dayOfWeek = now.getDay();
    // Monday = start of week (Swedish convention)
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    if (isNext) {
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + mondayOffset + 7);
      nextMonday.setHours(0, 0, 0, 0);
      const nextSunday = new Date(nextMonday);
      nextSunday.setDate(nextMonday.getDate() + 7);
      return { timeMin: nextMonday, timeMax: nextSunday };
    }

    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + mondayOffset + 7);
    endOfWeek.setHours(0, 0, 0, 0);
    return { timeMin: now, timeMax: endOfWeek };
  }

  if (period === "month") {
    if (isNext) {
      const firstOfNext = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const endOfNext = new Date(now.getFullYear(), now.getMonth() + 2, 1);
      return { timeMin: firstOfNext, timeMax: endOfNext };
    }

    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { timeMin: now, timeMax: endOfMonth };
  }

  if (period === "today") {
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    return { timeMin: now, timeMax: endOfDay };
  }

  if (period === "tomorrow") {
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(now.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setDate(tomorrowStart.getDate() + 1);
    return { timeMin: tomorrowStart, timeMax: tomorrowEnd };
  }

  console.error(`Error: Unknown period "${input}". Use: today, tomorrow, week, month, next week, next month`);
  process.exit(1);
}

function formatEventTime(event: any): string {
  if (event.start?.dateTime) {
    return new Date(event.start.dateTime).toLocaleString("sv-SE");
  }
  // All-day event
  return event.start?.date ?? "unknown";
}

program
  .option("-A, --add <title>", "Add a calendar event with the given title")
  .option("-T, --time <time>", "Time for the event (e.g. 14:00)")
  .option("-D, --duration <minutes>", "Duration in minutes (default: 60)", "60")
  .option("-L, --list", "List events for a given period")
  .argument("[title]", "Event title (used when no -A flag)")
  .argument("[datetime...]", "Date/time for the event (e.g. 14:00 tomorrow)")
  .action(async (title: string | undefined, datetime: string[], opts: Record<string, string>) => {
    if (opts.list !== undefined) {
      const allArgs = [title, ...datetime].filter(Boolean) as string[];
      if (allArgs.length === 0) allArgs.push("week");

      const { timeMin, timeMax } = parseListRange(allArgs);
      const auth = await getAuthClient();
      const events = await listEvents(auth, timeMin, timeMax);

      if (events.length === 0) {
        console.log("No events found.");
        return;
      }

      for (const event of events) {
        console.log(`  ${formatEventTime(event)}  ${event.summary ?? "(no title)"}`);
      }
      return;
    }

    const summary = opts.add || title;
    if (!summary) {
      // No flags and no arguments — default to listing this week
      const { timeMin, timeMax } = parseListRange(["week"]);
      const auth = await getAuthClient();
      const events = await listEvents(auth, timeMin, timeMax);

      if (events.length === 0) {
        console.log("No events found.");
        return;
      }

      for (const event of events) {
        console.log(`  ${formatEventTime(event)}  ${event.summary ?? "(no title)"}`);
      }
      return;
    }

    const dateStr = opts.add
      ? [opts.time, title, ...datetime].filter(Boolean).join(" ")
      : [opts.time, ...datetime].filter(Boolean).join(" ");

    if (!dateStr) {
      console.error("Error: Provide a time (e.g. 14:00 tomorrow)");
      process.exit(1);
    }

    const parsed = chrono.parseDate(dateStr, new Date(), { forwardDate: true });
    if (!parsed) {
      console.error(`Error: Could not parse date/time "${dateStr}"`);
      process.exit(1);
    }

    const auth = await getAuthClient();
    const event = await addEvent(auth, {
      summary: summary!,
      startTime: parsed,
      duration: parseInt(opts.duration, 10),
    });

    console.log(`Event created: ${event.summary}`);
    console.log(`  When: ${new Date(event.start?.dateTime!).toLocaleString("sv-SE")}`);
    console.log(`  Link: ${event.htmlLink}`);
  });

program.parse();
