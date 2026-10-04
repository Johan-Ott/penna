import { useEffect, useRef } from "react";
import { t } from "../i18n/i18n.js";
import { dayKey } from "../project/stats.js";
import { platform } from "./platform.js";

const MINUTE = 60_000;

/** The hours the reminder can come at; null is off. */
export const REMINDER_HOURS = [null, 18, 20, 21] as const;

/** Whether to remind now: after the chosen hour, nothing written today, not yet reminded today. */
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

/** A local notice when the day's writing has not begun; it needs Penna to be open. */
export function useReminder(hour: number | null, todayWords: number) {
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
