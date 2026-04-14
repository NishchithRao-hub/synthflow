import clsx from "clsx";

export default function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={clsx("skeleton rounded-lg", className)}
      style={style}
      aria-hidden="true"
    />
  );
}
