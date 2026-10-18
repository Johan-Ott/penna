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

// The newest milestone that has something done in it.
async function latestNews() {
  const milestones = (await github("milestones?state=all&per_page=100")).sort(newestFirst);
  for (const milestone of milestones) {
    const done = await issues(`milestone=${milestone.number}&state=closed`);
    if (done.length > 0) return { title: milestone.title, items: done };
  }
  return { title: version, items: [] };
}

async function roadmap() {
  const columns = [];
  for (const [place, label] of LABELS.entries()) {
    const open = await issues(`state=open&labels=${label}`);
    if (open.length > 0) columns.push({ place, items: open });
  }
  return columns;
}

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
  newTitle: (current) => `Nytt i ${current}`,
  nextTitle: "Det som kommer",
  nextLead: "Tryck på det du vill ha, så räknar vi rösterna. Det som flest vill ha kommer först.",
  columns: ["Nu", "Snart", "Senare"],
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
  newTitle: (current) => `New in ${current}`,
  nextTitle: "What is coming",
  nextLead: "Tap what you want, and we count the votes. What most of you want comes first.",
  columns: ["Now", "Soon", "Later"],
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

function roadColumn(column, text) {
  const items = column.items.map((title) => {
    const name = inLanguage(title, text.lang);
    return `            <li><a href="${mail(`${text.vote}: ${name}`)}">${name}<span aria-hidden="true">+</span></a></li>`;
  });
  return `        <div>\n          <h4>${text.columns[column.place]}</h4>\n          <ul>\n${items.join("\n")}\n          </ul>\n        </div>`;
}

function newsSection(news, text) {
  if (news.items.length === 0) return "";
  const items = news.items.map((title) => `          <li>${inLanguage(title, text.lang)}</li>`);
  return `
      <section>
        <h2>${text.newTitle(news.title)}</h2>
        <ul class="news-list">
${items.join("\n")}
        </ul>
      </section>
`;
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
    <main class="narrow news">
      <h1>${text.title}</h1>
      <p class="lead">${text.lead}</p>

      <section class="now">
        <span class="pill"><b>Beta</b> · ${version}</span>
        <h2>${text.nowTitle}</h2>
        <p>${text.now(version)}</p>
      </section>
${newsSection(news, text)}
      <section>
        <h2>${text.nextTitle}</h2>
        <p>${text.nextLead}</p>
        <div class="road">
${columns.map((column) => roadColumn(column, text)).join("\n")}
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

const [news, columns] = await Promise.all([latestNews(), roadmap()]);
for (const text of [SWEDISH, ENGLISH])
  writeFileSync(`site/${text.file}`, page(text, news, columns));
process.stdout.write(`Nytt i Penna: ${news.items.length} nyheter, ${columns.length} kolumner\n`);
