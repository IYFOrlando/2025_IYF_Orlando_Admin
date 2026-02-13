import * as React from "react";
import { supabase } from "../../../lib/supabase";
import type { PricingDoc } from "../../payments/types";

const SETTINGS_KEY = "pricing";

export function usePricingSettings() {
  const [data, setData] = React.useState<PricingDoc>({
    academyPrices: {},
    items: [],
    lunch: { semester: 40, single: 4 },
  });
  const [loading, setLoading] = React.useState(true);
  const [_error, _setError] = React.useState<string | null>(null);

  const fetchPricing = React.useCallback(async () => {
    try {
      const { data: settings, error: fetchError } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", SETTINGS_KEY)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          // No pricing found, use defaults
          setData({
            academyPrices: {},
            items: [],
            lunch: { semester: 40, single: 4 },
          });
        } else {
          throw fetchError;
        }
      } else if (settings?.value) {
        const raw = settings.value as any;

        // Convert academy prices (Dollars -> Cents)
        const acPrices: Record<string, number> = {};
        if (raw.academyPrices) {
          Object.entries(raw.academyPrices).forEach(([k, v]) => {
            acPrices[k] = Number(v) * 100;
          });
        }

        // Convert lunch (Dollars -> Cents)
        const lunch = {
          semester: (raw.lunch?.semester || 0) * 100,
          single: (raw.lunch?.single || 0) * 100,
        };

        setData({
          academyPrices: acPrices,
          items: raw.items || [],
          lunch,
          updatedAt: raw.updatedAt,
        });
      }
    } catch (err) {
      console.error("Error fetching pricing:", err);
      // fallback to defaults silently on error to prevent blocking UI
      // but maybe log it
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  async function savePricing(next: PricingDoc) {
    // Convert academy prices (Cents -> Dollars)
    const acPricesDollars: Record<string, number> = {};
    if (next.academyPrices) {
      Object.entries(next.academyPrices).forEach(([k, v]) => {
        acPricesDollars[k] = Number(v) / 100;
      });
    }

    // Convert lunch (Cents -> Dollars)
    const lunchDollars = {
      semester: (next.lunch?.semester || 0) / 100,
      single: (next.lunch?.single || 0) / 100,
    };

    // Upsert into app_settings
    const { error: saveError } = await supabase.from("app_settings").upsert({
      key: SETTINGS_KEY,
      value: {
        academyPrices: acPricesDollars,
        items: next.items || [],
        lunch: lunchDollars,
        updatedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    });

    if (saveError) {
      console.error("Error saving pricing:", saveError);
      throw saveError;
    }

    // Refresh local state
    await fetchPricing();
  }

  const refreshPricing = fetchPricing;

  return { data, loading, error: _error, savePricing, refreshPricing };
}
