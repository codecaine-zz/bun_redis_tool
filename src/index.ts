import { createClient } from "redis";

export class RedisTool {
  private client: any;
  private namespace: string;

  /**
   * Initializes the RedisTool client.
   * @param namespace The namespace key prefix to use for all operations.
   * @param clientOrUrl Optional existing Redis client instance or Redis URL string.
   */
  constructor(namespace: string, clientOrUrl?: any) {
    this.namespace = namespace;
    if (clientOrUrl && typeof clientOrUrl === "object" && typeof clientOrUrl.get === "function") {
      this.client = clientOrUrl;
    } else if (typeof clientOrUrl === "string") {
      this.client = createClient({ url: clientOrUrl });
    } else {
      const url = process.env.REDIS_URL;
      this.client = createClient(url ? { url } : undefined);
    }
  }

  /**
   * Helper to ensure the client is connected before running commands.
   */
  private async ensureConnected(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  /**
   * Reads a value from the namespace.
   * @param key The key within the namespace.
   */
  async read(key: string): Promise<string | null> {
    await this.ensureConnected();
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
    await this.ensureConnected();
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
    await this.ensureConnected();
    const fullKey = `${this.namespace}:${key}`;
    return await this.client.del(fullKey);
  }

  /**
   * Lists all keys in the namespace.
   * @returns An array of matching keys (including their namespace prefix).
   */
  async list(): Promise<string[]> {
    await this.ensureConnected();
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
    await this.ensureConnected();
    return await this.client.del(keys);
  }

  /**
   * Closes the connection to the Redis server.
   */
  async close(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }
}
