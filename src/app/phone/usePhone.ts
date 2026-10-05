import { useEffect, useState } from "react";

// A phone's width: the desktop window never gets this narrow (its smallest width is 720).
const PHONE = "(max-width: 600px)";

/** Whether Penna shows its phone screens, which follow the mobile design instead of the desktop. */
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
