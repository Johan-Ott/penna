/** The writer's picture, or the first letter of the name in a green circle. */
export function Avatar({ name, picture, size }: { name: string; picture: string; size: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  if (picture) return <img className="avatar" src={picture} alt="" style={style} />;
  return (
    <span className="avatar" style={style} aria-hidden="true">
      {(name.trim().charAt(0) || "·").toUpperCase()}
    </span>
  );
}
