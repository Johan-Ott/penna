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

/** True while the phone's keyboard is up: the page is then much shorter than its tallest. */
export function useKeyboardUp() {
  const [isUp, setUp] = useState(false);
  useEffect(() => {
    let tallest = window.innerHeight;
    const onResize = () => {
      tallest = Math.max(tallest, window.innerHeight);
      setUp(window.innerHeight < tallest * 0.8);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isUp;
}
