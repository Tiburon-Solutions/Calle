#!/usr/bin/env bun

import { google } from "googleapis";
import { authenticate } from "@google-cloud/local-auth";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CONFIG_DIR = path.join(os.homedir(), ".config", "calle");
const ACCOUNTS_DIR = path.join(CONFIG_DIR, "accounts");
const CREDENTIALS_PATH = path.join(CONFIG_DIR, "credentials.json");
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

function ensureConfigDir(): void {
  fs.mkdirSync(ACCOUNTS_DIR, { recursive: true });
}

function tokenPath(account: string): string {
  return path.join(ACCOUNTS_DIR, `${account}.json`);
}

function loadSavedToken(account: string) {
  try {
    const content = fs.readFileSync(tokenPath(account), "utf-8");
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch {
    return null;
  }
}

function saveToken(account: string, client: Awaited<ReturnType<typeof authenticate>>): void {
  const keys = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
  const key = keys.installed || keys.web;
  const payload = {
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  };
  fs.writeFileSync(tokenPath(account), JSON.stringify(payload, null, 2));
}

function checkCredentials(): void {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error(
      `Missing credentials file at ${CREDENTIALS_PATH}\n\n` +
        "To set up Google Calendar access:\n" +
        "1. Go to https://console.cloud.google.com/apis/credentials\n" +
        "2. Create an OAuth 2.0 Client ID (Desktop app)\n" +
        "3. Download the JSON and save it as:\n" +
        `   ${CREDENTIALS_PATH}\n`
    );
    process.exit(1);
  }
}

export function getAccountNames(): string[] {
  ensureConfigDir();
  try {
    return fs
      .readdirSync(ACCOUNTS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}

export async function getAuthClient(account: string) {
  ensureConfigDir();
  checkCredentials();

  const client = loadSavedToken(account);
  if (client) return client;

  console.log(`Authenticate account "${account}" in your browser...`);
  const newClient = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  if (newClient.credentials) {
    saveToken(account, newClient);
  }

  return newClient;
}

export async function getAllAuthClients(): Promise<{ account: string; auth: any }[]> {
  const accounts = getAccountNames();
  if (accounts.length === 0) {
    console.error(
      "No accounts configured. Add one with:\n  calle --account <name>\n\n" +
        "Example:\n  calle --account tiburon.se"
    );
    process.exit(1);
  }

  const clients = [];
  for (const account of accounts) {
    const auth = await getAuthClient(account);
    clients.push({ account, auth });
  }
  return clients;
}
