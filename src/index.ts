#!/usr/bin/env bun

import { program } from "commander";
import * as chrono from "chrono-node";
import { getAuthClient, getAllAuthClients, getAccountNames } from "./auth.js";
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

const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
};

// Assign a consistent color to each account
const ACCOUNT_COLORS = [c.cyan, c.magenta, c.green, c.yellow];
function accountColor(account: string, accounts: string[]): string {
  const idx = accounts.indexOf(account);
  return ACCOUNT_COLORS[idx % ACCOUNT_COLORS.length];
}

function formatDate(event: any): string {
  if (event.start?.dateTime) {
    const d = new Date(event.start.dateTime);
    const day = d.toLocaleDateString("sv-SE", { weekday: "long" });
    const dayCapitalized = day.charAt(0).toUpperCase() + day.slice(1);
    const date = d.toLocaleDateString("sv-SE");
    return `${dayCapitalized} ${date}`;
  }
  return event.start?.date ?? "unknown";
}

function formatTime(event: any): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });

  if (event.start?.dateTime) {
    const start = fmt(new Date(event.start.dateTime));
    const end = event.end?.dateTime ? fmt(new Date(event.end.dateTime)) : "";
    return end ? `${start} – ${end}` : start;
  }
  return "heldag";
}

async function listAllEvents(timeMin: Date, timeMax: Date) {
  const clients = await getAllAuthClients();
  const allEvents: { account: string; event: any }[] = [];

  for (const { account, auth } of clients) {
    const events = await listEvents(auth, timeMin, timeMax);
    for (const event of events) {
      allEvents.push({ account, event });
    }
  }

  // Sort all events by start time
  allEvents.sort((a, b) => {
    const aTime = a.event.start?.dateTime || a.event.start?.date || "";
    const bTime = b.event.start?.dateTime || b.event.start?.date || "";
    return aTime.localeCompare(bTime);
  });

  return allEvents;
}

function printEvents(events: { account: string; event: any }[]) {
  if (events.length === 0) {
    console.log(`${c.dim}No events found.${c.reset}`);
    return;
  }

  const accounts = [...new Set(events.map((e) => e.account))];
  const multipleAccounts = accounts.length > 1;

  let lastDate = "";

  for (const { account, event } of events) {
    const date = formatDate(event);
    const time = formatTime(event);
    const title = event.summary ?? "(no title)";

    // Print date header when day changes
    if (date !== lastDate) {
      if (lastDate) console.log();
      console.log(`${c.bold}${c.white}${date}${c.reset}`);
      lastDate = date;
    }

    const acctTag = multipleAccounts
      ? `  ${accountColor(account, accounts)}${account}${c.reset}`
      : "";
    console.log(`  ${c.dim}${time}${c.reset}  ${title}${acctTag}`);

    // Show other attendees (exclude self)
    const attendees = (event.attendees || []).filter(
      (a: any) => !a.self && !a.resource
    );
    if (attendees.length > 0) {
      for (const a of attendees) {
        const name = a.displayName ? `${a.displayName} ` : "";
        console.log(`                   ${c.dim}${name}<${a.email}>${c.reset}`);
      }
    }
  }
  console.log();
}

program
  .option("-A, --add <title>", "Add a calendar event with the given title")
  .option("-T, --time <time>", "Time for the event (e.g. 14:00)")
  .option("-D, --duration <minutes>", "Duration in minutes (default: 60)", "60")
  .option("-L, --list", "List events for a given period")
  .option("-a, --account <name>", "Account to use (e.g. tiburon.se)")
  .argument("[title]", "Event title (used when no -A flag)")
  .argument("[datetime...]", "Date/time for the event (e.g. 14:00 tomorrow)")
  .action(async (title: string | undefined, datetime: string[], opts: Record<string, string>) => {
    // Add a new account
    if (opts.account && !opts.add && !opts.list && !title) {
      await getAuthClient(opts.account);
      console.log(`Account "${opts.account}" authenticated.`);
      return;
    }

    // List events
    if (opts.list !== undefined) {
      const allArgs = [title, ...datetime].filter(Boolean) as string[];
      if (allArgs.length === 0) allArgs.push("week");

      const { timeMin, timeMax } = parseListRange(allArgs);

      if (opts.account) {
        const auth = await getAuthClient(opts.account);
        const events = await listEvents(auth, timeMin, timeMax);
        printEvents(events.map((e) => ({ account: opts.account, event: e })));
      } else {
        const events = await listAllEvents(timeMin, timeMax);
        printEvents(events);
      }
      return;
    }

    // Add event
    const summary = opts.add || title;
    if (!summary) {
      // No flags and no arguments — default to listing this week
      const { timeMin, timeMax } = parseListRange(["week"]);
      const events = await listAllEvents(timeMin, timeMax);
      printEvents(events);
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

    // When adding, use specific account or first account
    let account = opts.account;
    if (!account) {
      const accounts = getAccountNames();
      if (accounts.length === 0) {
        console.error("No accounts configured. Add one with:\n  calle --account <name>");
        process.exit(1);
      }
      if (accounts.length > 1) {
        console.error(`Multiple accounts found. Specify one with -a:\n  ${accounts.map((a) => `-a ${a}`).join("\n  ")}`);
        process.exit(1);
      }
      account = accounts[0];
    }

    const auth = await getAuthClient(account);
    const event = await addEvent(auth, {
      summary: summary!,
      startTime: parsed,
      duration: parseInt(opts.duration, 10),
    });

    console.log(`Event created: ${event.summary} [${account}]`);
    console.log(`  When: ${new Date(event.start?.dateTime!).toLocaleString("sv-SE")}`);
    console.log(`  Link: ${event.htmlLink}`);
  });

program.parse();
