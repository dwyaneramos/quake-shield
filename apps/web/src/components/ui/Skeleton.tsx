export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-ink-100 rounded animate-pulse ${className}`} />;
}
