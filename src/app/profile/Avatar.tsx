interface AvatarProps {
  name: string;
  picture: string;
  size: number;
  /** An unlocked frame's id, drawn as rings around the picture; empty for none. */
  frame?: string;
}

/** The writer's picture, or the first letter of the name in a green circle. */
export function Avatar({ name, picture, size, frame = "" }: AvatarProps) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  const className = frame ? `avatar frame-${frame}` : "avatar";
  if (picture) return <img className={className} src={picture} alt="" style={style} />;
  return (
    <span className={className} style={style} aria-hidden="true">
      {(name.trim().charAt(0) || "?").toUpperCase()}
    </span>
  );
}
