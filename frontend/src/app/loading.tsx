import Skeleton from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-primary)", padding: 24 }}
    >
      <div className="max-w-6xl mx-auto">
        <Skeleton className="h-8 w-56 mb-3" />
        <Skeleton className="h-4 w-80 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      </div>
    </div>
  );
}
