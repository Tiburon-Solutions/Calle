# Calle - Google Calendar CLI

A command-line tool for managing Google Calendar events and tasks. Supports multiple accounts.

## Setup

Requires [Bun](https://bun.sh) and a Google Cloud project with the Calendar and Tasks APIs enabled.

1. Create OAuth 2.0 credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and save as `~/.config/calle/credentials.json`
2. Install dependencies and link the CLI:

```sh
bun install
bun link
```

3. Authenticate an account:

```sh
calle --account you@gmail.com
```

## Usage

```sh
# List this week's events (default)
calle

# List events for a period
calle -L today
calle -L tomorrow
calle -L week
calle -L next week
calle -L month

# Add an event
calle "Meeting with Anna" 14:00 tomorrow
calle -A "Lunch" -T 12:00

# Add a task (no time = task)
calle "Buy groceries"

# List tasks
calle -L tasks

# Complete a task
calle -C "groceries"

# Set default account (for multi-account)
calle --default you@gmail.com
```

## License

MIT
