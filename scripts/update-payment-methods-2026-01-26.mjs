import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const TARGET_NAMES = new Set([
  "ronithvishnu sivaraman",
  "mycal hurley",
  "judy jett",
  "shanvith sivaraman",
  "amanda lopez",
  "judy julien",
  "jack say",
  "chaw khaing",
  "josie renzi",
]);

const START = "2026-01-26T00:00:00Z";
const END = "2026-01-27T00:00:00Z";

const DRY_RUN = process.env.DRY_RUN !== "false";

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY");
  }

  const supabase = createClient(url, serviceKey);
  console.log("Fetching candidate payments...");

  const { data, error } = await supabase
    .from("payments")
    .select("id, amount, method, transaction_date, student:students(first_name,last_name)")
    .gte("transaction_date", START)
    .lt("transaction_date", END)
    .eq("method", "cash")
    .order("transaction_date", { ascending: true });

  if (error) throw error;

  const candidates = (data || []).map((row) => ({
    id: row.id,
    name: [row.student?.first_name, row.student?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim(),
    amount: row.amount,
    method: row.method,
    transaction_date: row.transaction_date,
  }));

  const matches = candidates.filter((row) =>
    TARGET_NAMES.has(row.name.toLowerCase()),
  );

  console.log(`Candidates found: ${candidates.length}`);
  console.log(`Target matches: ${matches.length}`);
  console.log(JSON.stringify(matches, null, 2));

  if (DRY_RUN) {
    console.log("Dry run only. Set DRY_RUN=false to apply updates.");
    return;
  }

  if (matches.length === 0) {
    console.log("No rows matched. Nothing to update.");
    return;
  }

  const ids = matches.map((row) => row.id);
  const { error: updateError } = await supabase
    .from("payments")
    .update({ method: "card" })
    .in("id", ids);

  if (updateError) throw updateError;

  console.log(`Updated ${ids.length} payments to method=card.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
