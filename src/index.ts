#!/usr/bin/env bun

import { program } from "commander";
import * as chrono from "chrono-node";
import { getAuthClient } from "./auth.js";
import { addEvent } from "./calendar.js";

program
  .name("calle")
  .description("Google Calendar CLI")
  .version("1.0.0");

program
  .option("-A, --add <title>", "Add a calendar event with the given title")
  .option("-T, --time <time>", "Time for the event (e.g. 14:00)")
  .option("-D, --duration <minutes>", "Duration in minutes (default: 60)", "60")
  .argument("[title]", "Event title (used when no -A flag)")
  .argument("[datetime...]", "Date/time for the event (e.g. 14:00 tomorrow)")
  .action(async (title: string | undefined, datetime: string[], opts: Record<string, string>) => {
    const summary = opts.add || title;
    if (!summary) {
      program.help();
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
