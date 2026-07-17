# Redis Tool

A lightweight, high-performance utility for reading, writing, deleting, and listing keys in Redis using namespaces. Built on top of the official [redis npm package](https://www.npmjs.com/package/redis) to ensure compatibility across both **Node.js** and **Bun** runtime environments.

This tool is designed to be multi-purpose:
1. **Console App:** Provides clean, human-readable output in your terminal when run directly.
2. **Subprocess:** Outputs exact raw strings (without extra newlines or formatting) when spawned by another application, making it perfectly suited for inter-process communication.
3. **Importable Module:** Can be imported directly into other Node.js or Bun projects with full TypeScript and ES Module / CommonJS support.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16+) or [Bun](https://bun.sh/) installed on your machine.
- A running Redis server.

## Configuration

By default, the client attempts to connect to `redis://localhost:6379`. You can override this by setting the `REDIS_URL` environment variable:

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

To bundle the package:

```bash
bun run build
```
This uses `tsup` under the hood to compile and bundle the source code into CommonJS (`dist/index.cjs`), ESM (`dist/index.js`), and type definitions (`dist/index.d.ts`).

## Usage as an Importable Module

You can import `RedisTool` from `bun-redis-tool` in any Node.js or Bun project.

### 1. Initialization and Connection Modes

The `RedisTool` class accepts a namespace as the first argument, and optionally an existing Redis client or a connection URL as the second:

```typescript
import { RedisTool } from "bun-redis-tool";

// Mode A: Connect using default configuration (uses REDIS_URL environment variable or localhost:6379)
const cache = new RedisTool("cache");

// Mode B: Connect to a custom Redis URL string
const db = new RedisTool("users", "redis://:my-secret-password@redis-host:6379");

// Mode C: Reuse an existing node-redis client connection
const sharedClient = new RedisTool("shared");
const sessions = new RedisTool("session", sharedClient);
const metrics = new RedisTool("metric", sharedClient);

sessions.write("name",'james', 10)
sessions.read("name").then(x => console.log(x))
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
await cache.close();
```

---

## CLI Usage

When installed globally or inside a project, you can use the CLI via `npx` or `bunx`:

### Usage

`npx bun-redis-tool [action] [namespace] [key] [value] [ttl_in_seconds]`

*(Notes: The `key` is optional for `list` and `clear`. The `value` is required for `write`. The `ttl_in_seconds` is optional for `write`.)*

**Write a persistent value:**

```bash
npx bun-redis-tool write myapp session_id "xyz_12345"
```

**Write a value that expires (e.g., 3600 seconds / 1 hour):**

```bash
npx bun-redis-tool write myapp temp_session "abc_987" 3600
```

**Read a value:**

```bash
npx bun-redis-tool read myapp session_id
```

**Delete a value:**

```bash
npx bun-redis-tool delete myapp session_id
```

**List all keys in a namespace:**

```bash
npx bun-redis-tool list myapp
```

**Delete all keys in a namespace (Clear):**

```bash
npx bun-redis-tool clear myapp
```

## Usage as a Subprocess

Because the CLI automatically detects when it is not running in a TTY terminal, it strips conversational formatting and trailing newlines from output operations. This makes it incredibly easy to consume the stdout stream from another script.

**Example: Reading a single value (Bun example)**

```typescript
async function readValue() {
  const readProc = Bun.spawn(["npx", "bun-redis-tool", "read", "myapp", "test"]);
  const output = await new Response(readProc.stdout).text();
  console.log("Read from subprocess:", output); 
}
```

## How it Works (Namespaces)

When you provide a namespace and a key, the tool automatically joins them with a colon (`:`).
For example, running `npx bun-redis-tool write cache user_1 "Alice"` will execute `SET cache:user_1 "Alice"` under the hood. If you provide a TTL of 60, it will follow up with an `EXPIRE cache:user_1 60` command. Similarly, `npx bun-redis-tool list cache` executes a `KEYS cache:*` pattern match to find all relevant records.
