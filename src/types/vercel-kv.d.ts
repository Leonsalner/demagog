declare module "@vercel/kv" {
  interface KvOptions {
    url: string;
    token: string;
  }

  interface KvClient {
    get<T = unknown>(key: string): Promise<T | null>;
    set(key: string, value: unknown, options?: { ex?: number }): Promise<void>;
    del(key: string): Promise<void>;
  }

  export function createClient(options: KvOptions): KvClient;
}
