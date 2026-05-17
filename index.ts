import { RedisClient } from "bun";

async function main() {
  const args = process.argv.slice(2);
  const action = args[0];
  const namespace = args[1];
  const key = args[2];
  const value = args[3];
  // Parse the optional TTL argument
  const ttl = args[4] ? parseInt(args[4], 10) : undefined;

  // Validation
  if (!action || !namespace || (action !== "list" && !key)) {
    console.error("Usage:");
    console.error("  Using Bun:");
    console.error("    Read:   bun run index.ts read <namespace> <key>");
    console.error("    Write:  bun run index.ts write <namespace> <key> <value> [ttl_in_seconds]");
    console.error("    Delete: bun run index.ts delete <namespace> <key>");
    console.error("    List:   bun run index.ts list <namespace>");
    console.error("\n  Compiled Executable:");
    console.error("    Read:   ./redis-tool read <namespace> <key>");
    console.error("    Write:  ./redis-tool write <namespace> <key> <value> [ttl_in_seconds]");
    console.error("    Delete: ./redis-tool delete <namespace> <key>");
    console.error("    List:   ./redis-tool list <namespace>");
    process.exit(1);
  }

  // Create a new client instance
  const client = new RedisClient();

  try {
    // ---------------------------------------------------------
    // LIST ACTION (Namespace only)
    // ---------------------------------------------------------
    if (action === "list") {
      const pattern = `${namespace}:*`;
      const keys = await client.keys(pattern);

      if (!keys || keys.length === 0) {
        if (process.stdout.isTTY) console.log(`No keys found for namespace '${namespace}'.`);
      } else {
        if (process.stdout.isTTY) {
          console.log(`Found ${keys.length} key(s) in '${namespace}':`);
          keys.forEach((k: string) => console.log(`  - ${k}`));
        } else {
          process.stdout.write(keys.join("\n"));
        }
      }
    } 
    // ---------------------------------------------------------
    // READ / WRITE / DELETE ACTIONS (Namespace + Key required)
    // ---------------------------------------------------------
    else {
      const fullKey = `${namespace}:${key}`;

      if (action === "read") {
        const result = await client.get(fullKey);
        
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
        
        // Set the value
        await client.set(fullKey, value);
        
        // Apply TTL if provided and valid
        if (ttl !== undefined && !isNaN(ttl)) {
          await client.expire(fullKey, ttl);
          console.log(`Success: Set ${fullKey} (Expires in ${ttl} seconds)`);
        } else {
          console.log(`Success: Set ${fullKey}`);
        }
        
      } else if (action === "delete") {
        const deletedCount = await client.del(fullKey);
        if (deletedCount > 0) {
          console.log(`Success: Deleted ${fullKey}`);
        } else {
          console.log(`Notice: Key ${fullKey} did not exist.`);
        }

      } else {
        console.error(`Error: Unknown action '${action}'. Use 'read', 'write', 'delete', or 'list'.`);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error("Redis Error:", error);
    process.exit(1);
  } finally {
    client.close();
    process.exit(0);
  }
}

main();