// Penna's own tooltip in place of the system's, which neither looks like Penna nor follows its
// theme. Any element with a title gets it: the title moves to data-tip, so the system's stays away.

const DELAY = 450;
const GAP = 6;
const EDGE = 8;

function place(tip: HTMLElement, target: HTMLElement) {
  const box = target.getBoundingClientRect();
  const width = tip.offsetWidth;
  const left = Math.min(
    Math.max(EDGE, box.left + box.width / 2 - width / 2),
    window.innerWidth - width - EDGE,
  );
  const isRoomAbove = box.top - tip.offsetHeight - GAP > EDGE;
  tip.style.left = `${left}px`;
  tip.style.top = `${isRoomAbove ? box.top - tip.offsetHeight - GAP : box.bottom + GAP}px`;
}

function tipElement() {
  const tip = document.createElement("div");
  tip.className = "tooltip";
  tip.setAttribute("role", "tooltip");
  document.body.append(tip);
  return tip;
}

/** Only for a mouse: a touch has no hover to show it on. */
export function styledTooltips() {
  const tip = tipElement();
  let shownFor: HTMLElement | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const hide = () => {
    clearTimeout(timer);
    shownFor = null;
    tip.classList.remove("shown");
  };
  window.addEventListener("pointerover", (event) => {
    if (event.pointerType !== "mouse") return;
    const target = (event.target as HTMLElement).closest<HTMLElement>("[title], [data-tip]");
    if (!target || target === shownFor) return;
    if (target.title) target.dataset["tip"] = target.title;
    target.removeAttribute("title");
    hide();
    shownFor = target;
    timer = setTimeout(() => {
      tip.textContent = target.dataset["tip"] ?? "";
      tip.classList.add("shown");
      place(tip, target);
    }, DELAY);
  });
  window.addEventListener("pointerout", (event) => {
    if (shownFor && !shownFor.contains(event.relatedTarget as Node | null)) hide();
  });
  for (const name of ["pointerdown", "keydown", "blur"]) window.addEventListener(name, hide);
  window.addEventListener("scroll", hide, true);
}
