import { useCallback, useEffect, useState } from "react";
import { BOOK_LANGUAGES } from "../../project/bookLanguage.js";
import { Row } from "@llkit/controls.js";
import { recordFailure } from "@llkit/errorLog.js";
import { platform } from "../platform.js";
import { t } from "../../i18n/i18n.js";

// What the app has fetched for writing, and a way to fetch what is missing, as after a first
// start without the web. Only the apps fetch; the browser has it all along.

type Parts = { dictionaries: string[]; hasTypst: boolean };

const nameOf = (tag: string) => BOOK_LANGUAGES.find(([each]) => each === tag)?.[1] ?? tag;

function summary(parts: Parts) {
  const dictionaries = parts.dictionaries.length
    ? parts.dictionaries.map(nameOf).join(", ")
    : t("inga än");
  const typst = parts.hasTypst ? t("hämtad") : t("inte hämtad");
  return t("Ordlistor: {dictionaries} · Tryckfärdig PDF: {typst}", { dictionaries, typst });
}

/** `languages` are the ones the writer's books need now. */
export function FetchedRow({ languages }: { languages: string[] }) {
  const [parts, setParts] = useState<Parts | null>(null);
  const [isFetching, setFetching] = useState(false);
  const look = useCallback(() => void platform.fetchedParts?.().then(setParts), []);
  useEffect(look, [look]);
  if (!platform.fetchedParts || !parts) return null;
  const isMissing =
    !parts.hasTypst || languages.some((language) => !parts.dictionaries.includes(language));
  const fetch = () => {
    setFetching(true);
    const all = [...languages.map((language) => platform.spelling?.prepare(language))];
    void Promise.all([...all, platform.prepareTypst?.()])
      .catch(recordFailure("Hämtningen"))
      .finally(() => (setFetching(false), look()));
  };
  return (
    <Row label={t("Hämtat för skrivandet")} hint={summary(parts)}>
      {isMissing && (
        <button className="button secondary small" disabled={isFetching} onClick={fetch}>
          {isFetching ? t("Hämtar…") : t("Hämta det som saknas")}
        </button>
      )}
    </Row>
  );
}
