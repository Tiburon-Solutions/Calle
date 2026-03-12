#!/usr/bin/env node

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
  .argument("[date]", "Date for the event (e.g. tomorrow, next friday)")
  .action(async (date, opts) => {
    if (!opts.add) {
      program.help();
    }

    const dateStr = [opts.time, date].filter(Boolean).join(" ");
    if (!dateStr) {
      console.error("Error: Provide a time (-T) and/or date (e.g. tomorrow)");
      process.exit(1);
    }

    const parsed = chrono.parseDate(dateStr, new Date(), { forwardDate: true });
    if (!parsed) {
      console.error(`Error: Could not parse date/time "${dateStr}"`);
      process.exit(1);
    }

    const auth = await getAuthClient();
    const event = await addEvent(auth, {
      summary: opts.add,
      startTime: parsed,
      duration: parseInt(opts.duration, 10),
    });

    console.log(`Event created: ${event.summary}`);
    console.log(`  When: ${new Date(event.start.dateTime).toLocaleString()}`);
    console.log(`  Link: ${event.htmlLink}`);
  });

program.parse();
