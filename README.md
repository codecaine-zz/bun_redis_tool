# Redis Tool

A lightweight, high-performance utility for reading, writing, deleting, and listing keys in Redis using namespaces. Built with [Bun's native Redis client](https://bun.sh/docs/runtime/redis#redis).

This tool is designed to be multi-purpose:
1. **Console App:** Provides clean, human-readable output in your terminal when run directly.
2. **Subprocess:** Outputs exact raw strings (without extra newlines or formatting) when spawned by another application, making it perfectly suited for inter-process communication.
3. **Importable Module:** Can be compiled to a single file and imported directly into other Bun runtime files.

## Prerequisites

- [Bun](https://bun.sh/) installed on your machine.
- A running Redis server.

## Configuration

By default, Bun's Redis client will attempt to connect to `redis://localhost:6379`. You can override this by setting the `REDIS_URL` environment variable:

```bash
export REDIS_URL="redis://username:password@your-redis-host:6379"
```

## Installation

Install the package in your project using Bun:

```bash
bun add bun-redis-tool
```

Or with npm:

```bash
npm install bun-redis-tool
```

## Compilation & Bundling

You can compile and bundle the tool in two different formats:

### 1. Bundled Single JS File (For importing in other Bun files)
To bundle the tool into a single module file that you can import in other Bun projects:

```bash
bun run build
```
This outputs a single-file bundle to `dist/redis_tool.js`.

### 2. Standalone Executable (CLI)
To compile the script into a single, standalone binary:

```bash
bun run compile
```
This compiles the tool into the standalone executable `redis-tool`.

## Usage as an Importable Module

You can import `RedisTool` from `bun-redis-tool` in any other Bun runtime file. Below are comprehensive examples covering everything the module can do.

### 1. Initialization and Connection Modes

The `RedisTool` class is highly flexible. It accepts the namespace as the first argument, and optionally a Redis client configuration or existing instance as the second argument:

```typescript
import { RedisTool } from "bun-redis-tool";
import { RedisClient } from "bun";

// Mode A: Connect using default configuration (uses REDIS_URL environment variable or localhost:6379)
const cache = new RedisTool("cache");

// Mode B: Connect to a custom Redis URL string
const db = new RedisTool("users", "redis://:my-secret-password@redis-host:6379");

// Mode C: Reuse an existing client connection (ideal for multiple namespaces to avoid opening extra socket connections)
const sharedClient = new RedisClient();
const sessions = new RedisTool("session", sharedClient);
const metrics = new RedisTool("metric", sharedClient);
```

### 2. Reading and Writing Data

The tool automatically prefixes keys with the namespace (e.g. `namespace:key`).

```typescript
// A. Write a persistent value (string)
await cache.write("theme", "dark");

// B. Read a value (returns string or null if key does not exist)
const theme = await cache.read("theme"); // "dark"
const missing = await cache.read("nonexistent"); // null

// C. Storing and retrieving JSON objects
const userObj = { id: 42, name: "Alice", roles: ["admin"] };
await cache.write("user_42", JSON.stringify(userObj));

const rawUser = await cache.read("user_42");
if (rawUser) {
  const user = JSON.parse(rawUser);
  console.log(user.name); // "Alice"
}
```

### 3. Expiration and TTL (Time-To-Live)

You can specify a TTL in seconds when writing a key.

```typescript
// Write a key that automatically expires after 10 minutes (600 seconds)
await cache.write("temp_token", "abc123xyz", 600);
```

### 4. Listing Keys

You can query all keys belonging to the current namespace.

```typescript
// Set some keys
await cache.write("key_a", "val_a");
await cache.write("key_b", "val_b");

// List all keys (returns string[] of matching keys, including namespace prefix)
const allKeys = await cache.list();
console.log(allKeys); // ["cache:key_a", "cache:key_b"]
```

### 5. Deleting Data

```typescript
// A. Delete a single key (returns number of keys deleted: 1 if deleted, 0 if it didn't exist)
const deletedCount = await cache.delete("key_a"); // 1
const deleteNonexistent = await cache.delete("key_a"); // 0

// B. Delete ALL keys within the namespace (Clear)
// This finds all keys matching "namespace:*" and deletes them at once
const clearedCount = await cache.clear();
console.log(`Cleared ${clearedCount} namespace keys`);
```

### 6. Closing Connections

Always clean up connections once you are done using the client:

```typescript
cache.close();
// Note: If you passed an existing RedisClient to the constructor,
// calling close() on RedisTool will also close that shared client.
```

## CLI Usage

The tool accepts up to five positional arguments depending on the action:
`[action] [namespace] [key] [value] [ttl_in_seconds]`

*(Notes: The `key` is optional for `list` and `clear`. The `value` is required for `write`. The `ttl_in_seconds` is optional for `write`.)*

### Running directly with Bun

**Write a persistent value:**

```bash
bun run redis_tool.ts write myapp session_id "xyz_12345"
```

**Write a value that expires (e.g., 3600 seconds / 1 hour):**

```bash
bun run redis_tool.ts write myapp temp_session "abc_987" 3600
```

**Read a value:**

```bash
bun run redis_tool.ts read myapp session_id
```

**Delete a value:**

```bash
bun run redis_tool.ts delete myapp session_id
```

**List all keys in a namespace:**

```bash
bun run redis_tool.ts list myapp
```

**Delete all keys in a namespace (Clear):**

```bash
bun run redis_tool.ts clear myapp
```

### Running the Standalone Executable

Once compiled, you can run the binary directly:

```bash
./redis-tool write myapp test "hello world"
./redis-tool read myapp test
```

If you move the compiled binary to your `/usr/local/bin` folder, you can run it from any directory:

```bash
sudo mv redis-tool /usr/local/bin/
redis-tool list myapp
```

## Usage as a Subprocess

Because `redis_tool.ts` automatically detects when it is not running in a TTY terminal, it strips conversational formatting and trailing newlines from output operations. This makes it incredibly easy to consume the stdout stream from another script.

**Example: Reading a single value**

```typescript
async function readValue() {
  const readProc = Bun.spawn(["redis-tool", "read", "myapp", "test"]);
  const output = await new Response(readProc.stdout).text();
  console.log("Read from subprocess:", output); 
}
```

**Example: Parsing a list of keys**

```typescript
async function listKeys() {
  const listProc = Bun.spawn(["redis-tool", "list", "myapp"]);
  const output = await new Response(listProc.stdout).text();
  
  // Split the raw string into a clean array of keys
  const keysArray = output.split("\n").filter(Boolean); 
  console.log("Keys found:", keysArray);
}
```

## How it Works (Namespaces)

When you provide a namespace and a key, the tool automatically joins them with a colon (`:`).
For example, running `redis-tool write cache user_1 "Alice"` will execute `SET cache:user_1 "Alice"` under the hood. If you provide a TTL of 60, it will follow up with an `EXPIRE cache:user_1 60` command. Similarly, `redis-tool list cache` executes a `KEYS cache:*` pattern match to find all relevant records.
