#!/usr/bin/env bun

import { google } from "googleapis";
import { authenticate } from "@google-cloud/local-auth";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CONFIG_DIR = path.join(os.homedir(), ".config", "calle");
const TOKEN_PATH = path.join(CONFIG_DIR, "token.json");
const CREDENTIALS_PATH = path.join(CONFIG_DIR, "credentials.json");
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

function ensureConfigDir(): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function loadSavedToken() {
  try {
    const content = fs.readFileSync(TOKEN_PATH, "utf-8");
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch {
    return null;
  }
}

function saveToken(client: Awaited<ReturnType<typeof authenticate>>): void {
  const keys = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
  const key = keys.installed || keys.web;
  const payload = {
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  };
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(payload, null, 2));
}

export async function getAuthClient() {
  ensureConfigDir();

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

  const client = loadSavedToken();
  if (client) return client;

  const newClient = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  if (newClient.credentials) {
    saveToken(newClient);
  }

  return newClient;
}
