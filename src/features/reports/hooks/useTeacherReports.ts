import * as React from "react";
import { supabase } from "../../../lib/supabase";
import { normalizeLevel } from "../../../lib/normalization";

export type AcademyOption = { id: string; name: string };
export type LevelOption = { id: string; name: string; academyId: string; schedule?: string | null };

export type AttendanceSessionRow = {
  id: string;
  date: string;
  academyName: string;
  levelName: string;
  present: number;
  late: number;
  absent: number;
  total: number;
};

export type FeedbackHistoryRow = {
  id: string;
  date: string;
  studentName: string;
  academyName: string;
  levelName: string;
  score: number | null;
  comment: string;
  attendancePct: number | null;
  certTypeOverride: string | null;
};

const ymd = (d: Date) => d.toISOString().slice(0, 10);

type UseTeacherReportsOptions = {
  isTeacher: boolean;
  teacherProfile: any;
};

export function useTeacherReports({ isTeacher, teacherProfile }: UseTeacherReportsOptions) {
  const [academies, setAcademies] = React.useState<AcademyOption[]>([]);
  const [selectedAcademy, setSelectedAcademy] = React.useState<AcademyOption | null>(null);
  const [levels, setLevels] = React.useState<LevelOption[]>([]);
  const [selectedLevel, setSelectedLevel] = React.useState("");
  const [startDate, setStartDate] = React.useState(ymd(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)));
  const [endDate, setEndDate] = React.useState(ymd(new Date()));

  const [attendanceRows, setAttendanceRows] = React.useState<AttendanceSessionRow[]>([]);
  const [feedbackRows, setFeedbackRows] = React.useState<FeedbackHistoryRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const teacherScope = React.useMemo(() => {
    const scope = new Map<string, Set<string>>();
    if (!teacherProfile?.academies) return scope;
    teacherProfile.academies.forEach((a: any) => {
      if (!scope.has(a.academyId)) scope.set(a.academyId, new Set<string>());
      if (a.level) scope.get(a.academyId)?.add(normalizeLevel(a.level));
    });
    return scope;
  }, [teacherProfile]);

  React.useEffect(() => {
    const loadAcademiesAndLevels = async () => {
      const [{ data: academyData }, { data: levelData }] = await Promise.all([
        supabase.from("academies").select("id, name").order("name"),
        supabase.from("levels").select("id, name, academy_id, schedule").order("display_order", { ascending: true }),
      ]);

      const acList = (academyData || []).map((a: any) => ({ id: a.id, name: a.name }));
      const lvlList = (levelData || []).map((l: any) => ({
        id: l.id,
        name: l.name,
        academyId: l.academy_id,
        schedule: l.schedule,
      }));

      if (isTeacher && teacherProfile?.academies) {
        const allowedAcademyIds = new Set(teacherProfile.academies.map((a: any) => a.academyId));
        const filteredAcademies = acList.filter((a) => allowedAcademyIds.has(a.id));
        setAcademies(filteredAcademies);
        if (filteredAcademies.length === 1) setSelectedAcademy(filteredAcademies[0]);
      } else {
        setAcademies(acList);
      }
      setLevels(lvlList);
    };
    loadAcademiesAndLevels();
  }, [isTeacher, teacherProfile]);

  const visibleLevels = React.useMemo(() => {
    if (!selectedAcademy) return [];
    let list = levels.filter((l) => l.academyId === selectedAcademy.id);
    if (isTeacher) {
      const allowed = teacherScope.get(selectedAcademy.id);
      if (allowed && allowed.size > 0) {
        list = list.filter((l) => allowed.has(normalizeLevel(l.name)));
      }
    }
    return list;
  }, [levels, selectedAcademy, isTeacher, teacherScope]);

  const reload = React.useCallback(async () => {
    if (!selectedAcademy || !startDate || !endDate) {
      setAttendanceRows([]);
      setFeedbackRows([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let sessionQ = supabase
        .from("attendance_sessions")
        .select("id, date, academy_id, level_id, academies(name), levels(name)")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false })
        .eq("academy_id", selectedAcademy.id);
      if (selectedLevel) sessionQ = sessionQ.eq("level_id", selectedLevel);

      const { data: sessions, error: sessionErr } = await sessionQ;
      if (sessionErr) throw sessionErr;

      const sessionIds = (sessions || []).map((s: any) => s.id);
      let sessionRecords: any[] = [];
      if (sessionIds.length > 0) {
        const { data: recs, error: recErr } = await supabase
          .from("attendance_records")
          .select("session_id, status")
          .in("session_id", sessionIds);
        if (recErr) throw recErr;
        sessionRecords = recs || [];
      }

      const countsBySession: Record<string, { present: number; late: number; absent: number; total: number }> = {};
      sessionRecords.forEach((r: any) => {
        if (!countsBySession[r.session_id]) {
          countsBySession[r.session_id] = { present: 0, late: 0, absent: 0, total: 0 };
        }
        countsBySession[r.session_id].total++;
        if (r.status === "present") countsBySession[r.session_id].present++;
        else if (r.status === "late") countsBySession[r.session_id].late++;
        else countsBySession[r.session_id].absent++;
      });

      setAttendanceRows(
        (sessions || []).map((s: any) => {
          const c = countsBySession[s.id] || { present: 0, late: 0, absent: 0, total: 0 };
          return {
            id: s.id,
            date: s.date,
            academyName: s.academies?.name || selectedAcademy.name,
            levelName: s.levels?.name || "All Levels",
            present: c.present,
            late: c.late,
            absent: c.absent,
            total: c.total,
          };
        }),
      );

      let feedbackQ = supabase
        .from("progress_reports")
        .select("id, date, score, comments, attendance_pct, cert_type_override, academy_id, level_id, student_id, students(first_name,last_name), academies(name), levels(name)")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false })
        .eq("academy_id", selectedAcademy.id);
      if (selectedLevel) feedbackQ = feedbackQ.eq("level_id", selectedLevel);

      const { data: feedback, error: feedbackErr } = await feedbackQ;
      if (feedbackErr) throw feedbackErr;

      setFeedbackRows(
        (feedback || []).map((r: any) => ({
          id: r.id,
          date: r.date,
          studentName: `${r.students?.first_name || ""} ${r.students?.last_name || ""}`.trim(),
          academyName: r.academies?.name || "",
          levelName: r.levels?.name || "All Levels",
          score: r.score ?? null,
          comment: r.comments || "",
          attendancePct: r.attendance_pct ?? null,
          certTypeOverride: r.cert_type_override ?? null,
        })),
      );
    } catch (e: any) {
      setError(e.message || "Failed loading reports");
    } finally {
      setLoading(false);
    }
  }, [selectedAcademy, selectedLevel, startDate, endDate]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  return {
    academies,
    selectedAcademy,
    setSelectedAcademy,
    visibleLevels,
    selectedLevel,
    setSelectedLevel,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    attendanceRows,
    feedbackRows,
    loading,
    error,
    reload,
  };
}
