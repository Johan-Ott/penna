import { createStore } from "@llkit/store.js";
import { useMenuButton } from "@llkit/Menu.js";
import { START_ORDER, type ShelfOrder, type ShelfSort } from "../../project/shelfOrder.js";
import { t } from "../../i18n/i18n.js";

// Kept in localStorage, per device, as where the writer left off is.
const KEY = "skrivro.shelfOrder";

const SORTS: [ShelfSort, string][] = [
  ["senast", t("Senast skrivet")],
  ["titel", t("Titel")],
  ["ord", t("Längst")],
];

function stored(): ShelfOrder {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<ShelfOrder> | null;
    const sort = SORTS.find(([choice]) => choice === value?.sort)?.[0] ?? START_ORDER.sort;
    const favorites = Array.isArray(value?.favorites) ? value.favorites.map(String) : [];
    return { sort, favorites };
  } catch {
    return START_ORDER;
  }
}

const order = createStore<ShelfOrder>(stored());

function save(next: ShelfOrder) {
  order.set(next);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Without storage the choice holds until Skrivro closes.
  }
}

export const useShelfOrder = order.use;

export function toggleFavorite(dir: string) {
  const { favorites } = order.get();
  const next = favorites.includes(dir)
    ? favorites.filter((other) => other !== dir)
    : [...favorites, dir];
  save({ ...order.get(), favorites: next });
}

/** Sortera in the shelf's head, naming the order chosen. */
export function SortMenu() {
  const { sort } = useShelfOrder();
  const menu = useMenuButton(
    t("Sortera"),
    SORTS.map(([choice, label]) => ({
      label,
      isChecked: choice === sort,
      onSelect: () => save({ ...order.get(), sort: choice }),
    })),
  );
  const chosen = SORTS.find(([choice]) => choice === sort)?.[1] ?? "";
  return (
    <>
      <button className="link-button quiet" onClick={menu.open}>
        {t("Sortera: {order}", { order: chosen })}
      </button>
      {menu.menu}
    </>
  );
}

/** The star in the cover's corner: always seen on a favourite, on the others when pointed at. */
export function FavoriteStar({ dir }: { dir: string }) {
  const isFavorite = useShelfOrder().favorites.includes(dir);
  const label = isFavorite ? t("Ta bort från favoriter") : t("Lägg till i favoriter");
  return (
    <button
      className="book-favorite"
      aria-label={label}
      title={label}
      aria-pressed={isFavorite}
      onClick={() => toggleFavorite(dir)}
    >
      {isFavorite ? "★" : "☆"}
    </button>
  );
}
