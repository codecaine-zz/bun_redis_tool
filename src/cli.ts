#!/usr/bin/env node
import { RedisTool } from "./index";

async function main() {
  const args = process.argv.slice(2);
  const action = args[0];
  const namespace = args[1];
  const key = args[2];
  const value = args[3];
  const ttl = args[4] ? parseInt(args[4], 10) : undefined;

  if (!action || !namespace || (action !== "list" && action !== "clear" && !key)) {
    console.error("Usage:");
    console.error("  npx bun-redis-tool read <namespace> <key>");
    console.error("  npx bun-redis-tool write <namespace> <key> <value> [ttl_in_seconds]");
    console.error("  npx bun-redis-tool delete <namespace> <key>");
    console.error("  npx bun-redis-tool list <namespace>");
    console.error("  npx bun-redis-tool clear <namespace>");
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
    await tool.close();
    process.exit(0);
  }
}

main();
