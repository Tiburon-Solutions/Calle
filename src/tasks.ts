import { google } from "googleapis";

export async function addTask(auth: any, title: string) {
  const tasks = google.tasks({ version: "v1", auth: auth as any });

  const res = await tasks.tasks.insert({
    tasklist: "@default",
    requestBody: { title },
  });

  return res.data;
}

export async function listTasks(auth: any) {
  const tasks = google.tasks({ version: "v1", auth: auth as any });

  const res = await tasks.tasks.list({
    tasklist: "@default",
    showCompleted: false,
    showHidden: false,
  });

  return res.data.items || [];
}
