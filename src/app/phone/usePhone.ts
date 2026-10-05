import { useEffect, useState } from "react";

// The desktop window is never this narrow (its smallest width is 720).
const PHONE = "(max-width: 600px)";

/** Phone screens follow the window's width; platform.isPhone tells the device. */
export function usePhone() {
  const [isPhone, setPhone] = useState(() => window.matchMedia(PHONE).matches);
  useEffect(() => {
    const query = window.matchMedia(PHONE);
    const onChange = () => setPhone(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return isPhone;
}
