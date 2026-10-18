// The published releases, read from GitHub so this page never needs updating by hand.
// Each release text is written as lines; lines starting with "* " or "- " become a list.
const list = document.getElementById("releases");
const language = document.documentElement.lang;

function release({ name, published_at, body }) {
  const section = document.createElement("section");
  section.className = "release";
  const title = document.createElement("h2");
  title.textContent = name;
  const date = document.createElement("time");
  date.textContent = new Date(published_at).toLocaleDateString(language, { dateStyle: "long" });
  const points = document.createElement("ul");
  for (const line of (body ?? "").split("\n")) {
    const point = line.trim().match(/^[*-]\s+(.*)/);
    if (!point) continue;
    const item = document.createElement("li");
    item.textContent = point[1];
    points.append(item);
  }
  section.append(title, date, points);
  return section;
}

fetch("https://api.github.com/repos/Johan-Ott/penna/releases")
  .then((response) => (response.ok ? response.json() : Promise.reject()))
  .then((releases) => {
    const published = releases.filter((one) => !one.draft);
    if (published.length === 0) list.textContent = list.dataset.empty;
    published.forEach((one) => list.append(release(one)));
  })
  .catch(() => (list.textContent = list.dataset.failed));
