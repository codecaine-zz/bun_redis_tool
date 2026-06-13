import { RedisClient } from "bun";

/**
 * A utility class for interacting with Redis using namespaces.
 * Designed to be imported and used in other Bun applications.
 */
export class RedisTool {
  private client: RedisClient;
  private namespace: string;

  /**
   * Initializes the RedisTool client.
   * @param namespace The namespace key prefix to use for all operations.
   * @param clientOrUrl Optional existing RedisClient instance or Redis URL string.
   */
  constructor(namespace: string, clientOrUrl?: RedisClient | string) {
    this.namespace = namespace;
    if (clientOrUrl instanceof RedisClient) {
      this.client = clientOrUrl;
    } else if (typeof clientOrUrl === "string") {
      this.client = new RedisClient(clientOrUrl);
    } else {
      this.client = new RedisClient();
    }
  }

  /**
   * Reads a value from the namespace.
   * @param key The key within the namespace.
   */
  async read(key: string): Promise<string | null> {
    const fullKey = `${this.namespace}:${key}`;
    return await this.client.get(fullKey);
  }

  /**
   * Writes a value to the namespace, optionally with a TTL (Time To Live).
   * @param key The key within the namespace.
   * @param value The value to write.
   * @param ttl Optional expiration time in seconds.
   */
  async write(key: string, value: string, ttl?: number): Promise<void> {
    const fullKey = `${this.namespace}:${key}`;
    await this.client.set(fullKey, value);
    if (ttl !== undefined && !isNaN(ttl)) {
      await this.client.expire(fullKey, ttl);
    }
  }

  /**
   * Deletes a key from the namespace.
   * @param key The key within the namespace.
   * @returns The number of keys deleted (usually 1 or 0).
   */
  async delete(key: string): Promise<number> {
    const fullKey = `${this.namespace}:${key}`;
    return await this.client.del(fullKey);
  }

  /**
   * Lists all keys in the namespace.
   * @returns An array of matching keys (including their namespace prefix).
   */
  async list(): Promise<string[]> {
    const pattern = `${this.namespace}:*`;
    const keys = await this.client.keys(pattern);
    return keys || [];
  }

  /**
   * Deletes all keys in the namespace.
   * @returns The number of keys deleted.
   */
  async clear(): Promise<number> {
    const keys = await this.list();
    if (keys.length === 0) return 0;
    return await this.client.del(...keys);
  }

  /**
   * Closes the connection to the Redis server.
   */
  close() {
    this.client.close();
  }
}

/**
 * CLI Entrypoint when executed directly via Bun.
 */
async function main() {
  const args = process.argv.slice(2);
  const action = args[0];
  const namespace = args[1];
  const key = args[2];
  const value = args[3];
  const ttl = args[4] ? parseInt(args[4], 10) : undefined;

  if (!action || !namespace || (action !== "list" && action !== "clear" && !key)) {
    console.error("Usage:");
    console.error("  Using Bun:");
    console.error("    Read:   bun run redis_tool.ts read <namespace> <key>");
    console.error("    Write:  bun run redis_tool.ts write <namespace> <key> <value> [ttl_in_seconds]");
    console.error("    Delete: bun run redis_tool.ts delete <namespace> <key>");
    console.error("    List:   bun run redis_tool.ts list <namespace>");
    console.error("    Clear:  bun run redis_tool.ts clear <namespace>");
    console.error("\n  Compiled Executable:");
    console.error("    Read:   ./redis-tool read <namespace> <key>");
    console.error("    Write:  ./redis-tool write <namespace> <key> <value> [ttl_in_seconds]");
    console.error("    Delete: ./redis-tool delete <namespace> <key>");
    console.error("    List:   ./redis-tool list <namespace>");
    console.error("    Clear:  ./redis-tool clear <namespace>");
    process.exit(1);
  }

  const tool = new RedisTool(namespace);

  try {
    if (action === "list") {
      const keys = await tool.list();
      if (keys.length === 0) {
        if (process.stdout.isTTY) console.log(`No keys found for namespace '${namespace}'.`);
      } else {
        if (process.stdout.isTTY) {
          console.log(`Found ${keys.length} key(s) in '${namespace}':`);
          keys.forEach((k: string) => console.log(`  - ${k}`));
        } else {
          process.stdout.write(keys.join("\n"));
        }
      }
    } else if (action === "clear") {
      const deletedCount = await tool.clear();
      if (process.stdout.isTTY) {
        console.log(`Success: Deleted ${deletedCount} key(s) from namespace '${namespace}'.`);
      } else {
        process.stdout.write(deletedCount.toString());
      }
    } else {
      if (action === "read") {
        const result = await tool.read(key!);
        if (result !== null) {
          if (process.stdout.isTTY) {
            console.log(result);
          } else {
            process.stdout.write(result);
          }
        }
      } else if (action === "write") {
        if (value === undefined) {
          console.error("Error: Value is required for the write operation.");
          process.exit(1);
        }
        await tool.write(key!, value, ttl);
        if (ttl !== undefined && !isNaN(ttl)) {
          console.log(`Success: Set ${namespace}:${key} (Expires in ${ttl} seconds)`);
        } else {
          console.log(`Success: Set ${namespace}:${key}`);
        }
      } else if (action === "delete") {
        const deletedCount = await tool.delete(key!);
        if (deletedCount > 0) {
          console.log(`Success: Deleted ${namespace}:${key}`);
        } else {
          console.log(`Notice: Key ${namespace}:${key} did not exist.`);
        }
      } else {
        console.error(`Error: Unknown action '${action}'. Use 'read', 'write', 'delete', 'list', or 'clear'.`);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error("Redis Error:", error);
    process.exit(1);
  } finally {
    tool.close();
    process.exit(0);
  }
}

if (import.meta.main) {
  main();
}

