interface AvatarProps {
  name: string;
  picture: string;
  size: number;
  /** An unlocked frame's id, drawn as rings around the picture; empty for none. */
  frame?: string;
}

// Before there is a name: the outline of a person, which a letter or a mark would only puzzle.
const Someone = ({ size }: { size: number }) => (
  <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
  </svg>
);

/** The writer's picture, or the first letter of the name in a green circle. */
export function Avatar({ name, picture, size, frame = "" }: AvatarProps) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  const className = frame ? `avatar frame-${frame}` : "avatar";
  if (picture) return <img className={className} src={picture} alt="" style={style} />;
  const letter = name.trim().charAt(0).toUpperCase();
  return (
    <span className={className} style={style} aria-hidden="true">
      {letter || <Someone size={size} />}
    </span>
  );
}
