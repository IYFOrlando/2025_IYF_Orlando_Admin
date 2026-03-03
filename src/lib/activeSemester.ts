import { supabase } from "./supabase";

const ACTIVE_SEMESTER_NAME =
  import.meta.env.VITE_ACTIVE_SEMESTER_NAME || "Spring 2026";
const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedSemesterId: string | null = null;
let cachedAt = 0;

export async function getActiveSemesterIdCached(
  forceRefresh = false,
): Promise<string> {
  const now = Date.now();
  if (
    !forceRefresh &&
    cachedSemesterId &&
    now - cachedAt < CACHE_TTL_MS
  ) {
    return cachedSemesterId;
  }

  const { data, error } = await supabase
    .from("semesters")
    .select("id")
    .eq("name", ACTIVE_SEMESTER_NAME)
    .limit(1);

  if (error || !data?.[0]?.id) {
    throw new Error(`Active semester not found: ${ACTIVE_SEMESTER_NAME}`);
  }

  cachedSemesterId = data[0].id;
  cachedAt = now;
  return cachedSemesterId;
}

export function clearActiveSemesterCache() {
  cachedSemesterId = null;
  cachedAt = 0;
}
