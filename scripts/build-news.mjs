// `npm run news`: site/nytt.html and news.html from the issues, titled "Svenska | English". Open
// issues labelled nu, snart or senare are the roadmap; the newest milestone's closed ones are new.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const REPO = "Johan-Ott/penna";
const MAIL = "johan.lonelodge@gmail.com";
const LABELS = ["nu", "snart", "senare"];
const token = process.env.GITHUB_TOKEN ?? execSync("gh auth token").toString().trim();
const { version } = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));

async function github(path) {
  const response = await fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`GitHub ${path}: ${response.status}`);
  return response.json();
}

// In the order they were written, which is the order they show in.
const issues = async (query) =>
  (await github(`issues?per_page=100&${query}`))
    .filter((issue) => !issue.pull_request)
    .sort((first, second) => first.number - second.number)
    .map((issue) => issue.title);

const newestFirst = (first, second) =>
  second.title.localeCompare(first.title, undefined, { numeric: true, sensitivity: "base" });

// The newest milestone that has something done in it, or the one titled `wanted`.
async function latestNews(wanted) {
  const all = (await github("milestones?state=all&per_page=100")).sort(newestFirst);
  const milestones = wanted ? all.filter((milestone) => milestone.title === wanted) : all;
  for (const milestone of milestones) {
    const done = await issues(`milestone=${milestone.number}&state=closed`);
    if (done.length > 0) return { title: milestone.title, items: done };
  }
  return { title: version, items: [] };
}

// One column per label, empty or not, so the board always has the same shape.
const roadmap = () => Promise.all(LABELS.map((label) => issues(`state=open&labels=${label}`)));

const SWEDISH = {
  lang: "sv",
  file: "nytt.html",
  other: ["news.html", "en", "English"],
  home: "index.html",
  download: ["index.html#ladda-ner", "Ladda ner"],
  title: "Nytt i Penna",
  lead: "Var Penna är just nu, vad som är nytt och vad som kommer härnäst.",
  nowTitle: "Där vi är nu",
  now: (current) =>
    `Penna är i öppen beta, gratis för alla. Den senaste versionen är <strong>${current}</strong>, för Windows och Android. Vi bygger vidare hela tiden, med det ni skriver till oss som karta.`,
  boardTitle: "Tavlan",
  boardLead:
    "Vad vi bygger nu, vad som kommer och vad som är klart. Tryck på det du vill ha, så räknar vi rösterna.",
  columns: ["Pågår", "Snart", "Senare"],
  done: (current) => `Klart i ${current}`,
  empty: "Inget här just nu.",
  vote: "Röst",
  missing: "Saknas något?",
  idea: ["Föreslå en idé", "Idé till Penna"],
};

const ENGLISH = {
  lang: "en",
  file: "news.html",
  other: ["nytt.html", "sv", "Svenska"],
  home: "en.html",
  download: ["en.html#download", "Download"],
  title: "What is new in Penna",
  lead: "Where Penna is right now, what is new and what comes next.",
  nowTitle: "Where we are",
  now: (current) =>
    `Penna is in open beta, free for everyone. The latest version is <strong>${current}</strong>, for Windows and Android. We keep building all the time, with what you write to us as the map.`,
  boardTitle: "The board",
  boardLead:
    "What we are building now, what is coming and what is done. Tap what you want, and we count the votes.",
  columns: ["In progress", "Soon", "Later"],
  done: (current) => `Done in ${current}`,
  empty: "Nothing here right now.",
  vote: "Vote",
  missing: "Missing something?",
  idea: ["Suggest an idea", "Idea for Penna"],
};

const escape = (words) =>
  words.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

// "Svenska | English": the English half, or the Swedish one when there is none.
const inLanguage = (title, lang) => {
  const [swedish, english] = title.split("|").map((part) => part.trim());
  return escape(lang === "en" && english ? english : swedish);
};

const mail = (subject) => `mailto:${MAIL}?subject=${encodeURIComponent(subject)}`;

const vote = (title, text) => {
  const name = inLanguage(title, text.lang);
  return `<li><a href="${mail(`${text.vote}: ${name}`)}">${name}<span aria-hidden="true">+</span></a></li>`;
};

const done = (title, text) => `<li class="done">${inLanguage(title, text.lang)}</li>`;

function column(name, kind, cards, text) {
  const list =
    cards.length > 0 ? cards.join("\n            ") : `<li class="empty">${text.empty}</li>`;
  return `        <div class="column ${kind}">
          <h3>${name}<span>${cards.length}</span></h3>
          <ul>
            ${list}
          </ul>
        </div>`;
}

function board(columns, news, text) {
  const open = columns.map((titles, place) =>
    column(
      text.columns[place],
      LABELS[place],
      titles.map((title) => vote(title, text)),
      text,
    ),
  );
  const finished = news.items.map((title) => done(title, text));
  return [...open, column(text.done(news.title), "klart", finished, text)].join("\n");
}

const top = (text) => `<!doctype html>
<html lang="${text.lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${text.title}</title>
    <link rel="icon" href="penna-logo.png" />
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <header class="top">
      <nav class="wrap">
        <a class="brand" href="${text.home}"><img src="penna-logo.png" alt="" />Penna</a>
        <a class="language" href="${text.other[0]}" lang="${text.other[1]}">${text.other[2]}</a>
        <a class="button" href="${text.download[0]}">${text.download[1]}</a>
      </nav>
    </header>`;

const page = (text, news, columns) => `${top(text)}
    <main class="news">
      <h1>${text.title}</h1>
      <p class="lead">${text.lead}</p>

      <section class="now">
        <span class="pill"><b>Beta</b> · ${version}</span>
        <h2>${text.nowTitle}</h2>
        <p>${text.now(version)}</p>
      </section>

      <section>
        <h2>${text.boardTitle}</h2>
        <p>${text.boardLead}</p>
        <div class="board">
${board(columns, news, text)}
        </div>
      </section>

      <section class="missing">
        <h2>${text.missing}</h2>
        <a class="button" href="${mail(text.idea[1])}">${text.idea[0]}</a>
      </section>
    </main>
  </body>
</html>
`;

// `--notes [0.4.2]`: the release text instead, the lines the app shows before and after an update.
const notesAt = process.argv.indexOf("--notes");
if (notesAt !== -1) {
  const news = await latestNews(process.argv[notesAt + 1]);
  const list = (lang) => news.items.map((title) => `- ${inLanguage(title, lang)}`).join("\n");
  const download = "**Windows:** Penna-setup.exe · **Android:** Penna.apk";
  process.stdout.write(`### Nytt\n${list("sv")}\n\n### New\n${list("en")}\n\n${download}\n`);
} else {
  const [news, columns] = await Promise.all([latestNews(), roadmap()]);
  for (const text of [SWEDISH, ENGLISH])
    writeFileSync(`site/${text.file}`, page(text, news, columns));
  process.stdout.write(
    `Nytt i Penna: ${columns.flat().length} på tavlan, ${news.items.length} klara\n`,
  );
}
