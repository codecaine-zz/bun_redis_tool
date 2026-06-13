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

You can import `RedisTool` from the bundled single-file build in any other Bun runtime file:

```typescript
import { RedisTool } from "./dist/redis_tool.js";

// Instantiate RedisTool with a specific namespace ("cache")
const cache = new RedisTool("cache"); // connects to REDIS_URL or localhost:6379

// Write a value with 60 seconds TTL
await cache.write("session_id", "xyz_12345", 60);

// Read the value
const value = await cache.read("session_id");
console.log("Session:", value); // "xyz_12345"

// List all keys in the namespace
const keys = await cache.list();
console.log("Keys:", keys); // ["cache:session_id"]

// Delete all keys in the namespace (Clear)
const deletedCount = await cache.clear();
console.log(`Deleted ${deletedCount} key(s)`);

// Delete a single key
await cache.delete("session_id");

// Close the connection
cache.close();
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
