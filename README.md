# Redis Tool

A lightweight, high-performance CLI utility for reading, writing, deleting, and listing keys in Redis using namespaces. Built with [Bun's native Redis client](https://bun.sh/docs/runtime/redis#redis).

This tool is designed to be dual-purpose:
1. **Console App:** Provides clean, human-readable output in your terminal.
2. **Subprocess:** Outputs exact raw strings (without extra newlines or formatting) when spawned by another application, making it perfectly suited for inter-process communication.

## Prerequisites

- [Bun](https://bun.sh/) installed on your machine.
- A running Redis server.

## Configuration

By default, Bun's Redis client will attempt to connect to `redis://localhost:6379`. You can override this by setting the `REDIS_URL` environment variable:

```bash
export REDIS_URL="redis://username:password@your-redis-host:6379"

```

## Usage

The tool accepts up to five positional arguments depending on the action:
`[action] [namespace] [key] [value] [ttl_in_seconds]`

*(Notes: The `key` is optional for `list`. The `value` is required for `write`. The `ttl_in_seconds` is optional for `write`.)*

### Running directly with Bun

**Write a persistent value:**

```bash
bun run index.ts write myapp session_id "xyz_12345"

```

**Write a value that expires (e.g., 3600 seconds / 1 hour):**

```bash
bun run index.ts write myapp temp_session "abc_987" 3600

```

**Read a value:**

```bash
bun run index.ts read myapp session_id

```

**Delete a value:**

```bash
bun run index.ts delete myapp session_id

```

**List all keys in a namespace:**

```bash
bun run index.ts list myapp

```

### Building a Standalone Executable

You can compile this script into a single, standalone binary. This means you won't need to prefix your commands with `bun run`.

```bash
bun build --compile --outfile redis-tool index.ts

```

**Using the compiled binary:**

```bash
./redis-tool write myapp test "hello world"
./redis-tool write myapp exp_test "hello" 60
./redis-tool read myapp test
./redis-tool delete myapp test
./redis-tool list myapp

```

## Using as a Subprocess

Because `redis-tool` automatically detects when it is not running in a TTY terminal, it strips conversational formatting and trailing newlines from output operations. This makes it incredibly easy to consume the stdout stream from another script.

**Example: Reading a single value**

```typescript
async function readValue() {
  const readProc = Bun.spawn(["./redis-tool", "read", "myapp", "test"]);
  const output = await new Response(readProc.stdout).text();
  console.log("Read from subprocess:", output); 
}

```

**Example: Parsing a list of keys**
When you use the `list` command as a subprocess, it outputs the keys separated by standard newlines (`\n`). You can easily parse this into an array:

```typescript
async function listKeys() {
  const listProc = Bun.spawn(["./redis-tool", "list", "myapp"]);
  const output = await new Response(listProc.stdout).text();
  
  // Split the raw string into a clean array of keys
  const keysArray = output.split("\n").filter(Boolean); 
  console.log("Keys found:", keysArray);
}

```

## How it Works (Namespaces)

When you provide a namespace and a key, the tool automatically joins them with a colon (`:`).
For example, running `./redis-tool write cache user_1 "Alice"` will execute `SET cache:user_1 "Alice"` under the hood. If you provide a TTL of 60, it will follow up with an `EXPIRE cache:user_1 60` command. Similarly, `./redis-tool list cache` executes a `KEYS cache:*` pattern match to find all relevant records.
