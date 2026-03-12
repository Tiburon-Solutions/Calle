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

export async function completeTask(auth: any, query: string): Promise<{ title: string } | null> {
  const tasks = google.tasks({ version: "v1", auth: auth as any });

  const res = await tasks.tasks.list({
    tasklist: "@default",
    showCompleted: false,
    showHidden: false,
  });

  const items = res.data.items || [];
  const lower = query.toLowerCase();
  const match = items.find((t: any) => t.title?.toLowerCase().includes(lower));

  if (!match || !match.id) return null;

  await tasks.tasks.patch({
    tasklist: "@default",
    task: match.id,
    requestBody: { status: "completed" },
  });

  return { title: match.title! };
}
