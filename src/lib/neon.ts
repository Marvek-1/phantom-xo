/**
 * MoStar Phantom XO — Neon Client
 * moscript://codex/v1
 * sass: "The database speaks. The map listens."
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = import.meta.env.VITE_NEON_DATABASE_URL as string | undefined;

if (!DATABASE_URL) {
  console.warn("[neon] VITE_NEON_DATABASE_URL not set");
}

export const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

export async function queryNeon<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  if (!sql) {
    console.warn("[neon] No database connection");
    return [];
  }
  try {
    const result = await sql(query, params);
    return result as T[];
  } catch (err) {
    console.error("[neon] Query error:", err);
    return [];
  }
}
