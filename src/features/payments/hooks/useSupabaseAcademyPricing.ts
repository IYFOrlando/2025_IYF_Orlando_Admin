import { useSupabaseAcademies } from "../../academies/hooks/useSupabaseAcademies";
import { normalizeAcademy } from "../../../lib/normalization";
import { useMemo } from "react";

export function useSupabaseAcademyPricing() {
  const { academies, loading, error } = useSupabaseAcademies();

  const academyPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    academies.forEach((ac) => {
      // Main Academy Price
      if (ac.price !== undefined) {
        prices[normalizeAcademy(ac.name)] = ac.price; // Stored as cents in Supabase?
        // Wait, checks `useSupabaseAcademies`: "price: Number(ac.price)".
        // In DB it is probably numeric (dollars or cents?).
        // Let's assume dollars based on `useAcademyPricing` logic which multiplied by 100.
        // But `useSupabaseAcademies` maps it directly.
        // Let's check schema. `price numeric default 0`.
        // If it's dollars in DB, we need to multiply by 100 for "cents" logic in PaymentsPage.
        // In `migrate-firebase-to-supabase.js`: `price: academy.price || 0`. Firebase had dollars.
        // So Supabase has dollars.
        // We receive Cents from useSupabaseAcademies now.
        prices[normalizeAcademy(ac.name)] = ac.price;
      }
      // Levels might have their own prices? Schema doesn't have price on levels.
      // So detailed level pricing isn't supported yet in generic schema, relies on Academy price.
    });
    return prices;
  }, [academies]);

  return { academyPrices, loading, error };
}
