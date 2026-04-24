const createClientMock = vi.fn((url: string, key: string) => ({ url, key }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

describe("supabase client split", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("creates the public client with the anon key", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    const { supabasePublic } = await import("@/lib/supabase");

    expect(supabasePublic()).toEqual({
      url: "https://example.supabase.co",
      key: "anon-key",
    });
  });

  it("creates the public client with the publishable key", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-key";

    const { supabasePublic } = await import("@/lib/supabase");

    expect(supabasePublic()).toEqual({
      url: "https://example.supabase.co",
      key: "publishable-key",
    });
  });

  it("prefers the publishable key over legacy anon keys", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-key";
    process.env.SUPABASE_ANON_KEY = "legacy-anon-key";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy-public-anon-key";

    const { supabasePublic } = await import("@/lib/supabase");

    expect(supabasePublic()).toEqual({
      url: "https://example.supabase.co",
      key: "publishable-key",
    });
  });

  it("creates the admin client with the secret key", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "secret-key";

    const { supabaseAdmin } = await import("@/lib/supabase");

    expect(supabaseAdmin()).toEqual({
      url: "https://example.supabase.co",
      key: "secret-key",
    });
  });

  it("reports separate config errors for public and admin clients", async () => {
    const {
      getSupabaseAdminConfigError,
      getSupabasePublicConfigError,
    } = await import("@/lib/supabase");

    expect(getSupabasePublicConfigError()).toContain("SUPABASE_ANON_KEY");
    expect(getSupabasePublicConfigError()).toContain("SUPABASE_PUBLISHABLE_KEY");
    expect(getSupabaseAdminConfigError()).toContain("SUPABASE_SECRET_KEY");
    expect(getSupabaseAdminConfigError()).toContain("SUPABASE_SERVICE_KEY");
  });
});
