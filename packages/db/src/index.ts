import "dotenv/config";

export interface DatabaseConfig {
  connectionString: string;
}

export interface TimestampedRecord {
  createdAt: Date;
  updatedAt: Date;
}

export const createDatabaseConfig = (
  connectionString: string
): DatabaseConfig => ({
  connectionString,
});

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!(supabaseUrl && supabaseKey)) {
  throw new Error("Missing DB config env vars");
}

export const db = createClient(supabaseUrl, supabaseKey);
