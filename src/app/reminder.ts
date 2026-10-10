import { useEffect, useRef } from "react";
import { t } from "../i18n/i18n.js";
import { dayKey } from "../project/stats.js";
import { platform } from "./platform.js";

const MINUTE = 60_000;

/** Null is off. */
export const REMINDER_HOURS = [null, 18, 20, 21] as const;

export function isReminderDue(parts: {
  hour: number | null;
  now: number;
  todayWords: number;
  lastReminded: string | null;
}) {
  const { hour, now, todayWords, lastReminded } = parts;
  if (hour === null || todayWords > 0 || lastReminded === dayKey(now)) return false;
  return new Date(now).getHours() >= hour;
}

/** Today at the hour, or tomorrow once she has written today or the hour has passed. */
export function nextReminder(hour: number | null, now: number, todayWords: number) {
  if (hour === null) return null;
  const when = new Date(now);
  when.setHours(hour, 0, 0, 0);
  if (todayWords > 0 || when.getTime() <= now) when.setDate(when.getDate() + 1);
  return when;
}

// On a phone Penna is mostly closed, so the phone itself keeps the next reminder.
function useScheduledReminder(hour: number | null, hasWritten: boolean) {
  useEffect(() => {
    const when = nextReminder(hour, Date.now(), hasWritten ? 1 : 0);
    const body = t("Du har inte skrivit något idag än.");
    void platform.scheduleReminder?.(when, t("Dags att skriva"), body);
  }, [hour, hasWritten]);
}

export function useReminder(hour: number | null, todayWords: number) {
  useScheduledReminder(hour, todayWords > 0);
  useOpenReminder(platform.scheduleReminder ? null : hour, todayWords);
}

/** On a computer: needs Penna to be open. */
function useOpenReminder(hour: number | null, todayWords: number) {
  const lastReminded = useRef<string | null>(null);
  const words = useRef(todayWords);
  words.current = todayWords;
  useEffect(() => {
    if (hour === null) return;
    const check = () => {
      const now = Date.now();
      const due = isReminderDue({
        hour,
        now,
        todayWords: words.current,
        lastReminded: lastReminded.current,
      });
      if (!due) return;
      lastReminded.current = dayKey(now);
      void platform.notify(t("Dags att skriva"), t("Du har inte skrivit något idag än."));
    };
    check();
    const timer = setInterval(check, MINUTE);
    return () => clearInterval(timer);
  }, [hour]);
}
