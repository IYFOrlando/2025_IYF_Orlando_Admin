export type SaturdayRangePreset = "lastSaturday" | "last4Saturdays" | "thisMonth";
export type SaturdayOption = { value: string; label: string };

const toLocalYmd = (d: Date): string => {
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromYmd = (ymd: string): Date => new Date(`${ymd}T12:00:00`);

export const getTodayYmd = (): string => toLocalYmd(new Date());

export const getLastSaturdayYmd = (baseDate: Date = new Date()): string => {
  const d = new Date(baseDate);
  const day = d.getDay(); // 0=Sun ... 6=Sat
  const diff = day === 6 ? 0 : day + 1;
  d.setDate(d.getDate() - diff);
  return toLocalYmd(d);
};

export const getThisSaturdayYmd = (baseDate: Date = new Date()): string => {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = 6 - day;
  d.setDate(d.getDate() + diff);
  return toLocalYmd(d);
};

export const shiftSaturdayYmd = (currentYmd: string, weeks: number): string => {
  const d = fromYmd(currentYmd);
  d.setDate(d.getDate() + weeks * 7);
  return toLocalYmd(d);
};

export const formatClassDateLabel = (ymd: string): string =>
  fromYmd(ymd).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const isSaturdayYmd = (ymd: string): boolean => fromYmd(ymd).getDay() === 6;

export const getNearestSaturdayYmd = (ymd: string): string => {
  const d = fromYmd(ymd);
  const day = d.getDay();
  if (day === 6) return ymd;
  // Prefer previous Saturday for Sunday-Friday teacher backfill workflow.
  const prevDiff = (day + 1) % 7;
  d.setDate(d.getDate() - prevDiff);
  return toLocalYmd(d);
};

export const getSaturdayOptions = (
  baseYmd: string = getLastSaturdayYmd(),
  pastCount = 10,
  futureCount = 3,
): SaturdayOption[] => {
  const baseSaturday = getNearestSaturdayYmd(baseYmd);
  const items: SaturdayOption[] = [];

  for (let i = 0; i <= futureCount; i++) {
    const v = shiftSaturdayYmd(baseSaturday, i);
    items.push({ value: v, label: formatClassDateLabel(v) });
  }
  for (let i = 1; i <= pastCount; i++) {
    const v = shiftSaturdayYmd(baseSaturday, -i);
    items.push({ value: v, label: formatClassDateLabel(v) });
  }

  return items;
};

export const getSaturdayRangePreset = (
  preset: SaturdayRangePreset,
  baseDate: Date = new Date(),
): { startDate: string; endDate: string; label: string } => {
  if (preset === "lastSaturday") {
    const s = getLastSaturdayYmd(baseDate);
    return { startDate: s, endDate: s, label: "Last Saturday" };
  }

  if (preset === "last4Saturdays") {
    const end = fromYmd(getLastSaturdayYmd(baseDate));
    const start = new Date(end);
    start.setDate(end.getDate() - 21);
    return {
      startDate: toLocalYmd(start),
      endDate: toLocalYmd(end),
      label: "Last 4 Saturdays",
    };
  }

  const now = new Date(baseDate);
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: toLocalYmd(start),
    endDate: toLocalYmd(end),
    label: "This Month",
  };
};
