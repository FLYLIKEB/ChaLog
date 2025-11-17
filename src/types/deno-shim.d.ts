declare module "npm:@supabase/supabase-js@2.49.8" {
  export * from "@jsr/supabase__supabase-js";
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

