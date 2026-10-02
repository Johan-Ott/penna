const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

// ULID: 10 characters of time, so ids sort by creation, then 16 random characters.
export function newSceneId(now = Date.now()): string {
  let time = "";
  let rest = now;
  for (let index = 0; index < 10; index++) {
    time = CROCKFORD.charAt(rest % 32) + time;
    rest = Math.floor(rest / 32);
  }
  const random = crypto.getRandomValues(new Uint8Array(16));
  return time + Array.from(random, (byte) => CROCKFORD.charAt(byte % 32)).join("");
}
