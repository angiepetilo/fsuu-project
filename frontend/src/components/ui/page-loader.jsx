/**
 * PageLoader — Full-page "Please wait..." loading indicator.
 * Usage: if (loading) return <PageLoader />;
 */
export function PageLoader({ message = "Please wait..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 select-none">
      {/* Animated ring */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full bg-blue-600 animate-pulse" />
        </div>
      </div>

      {/* Label */}
      <div className="text-center space-y-1">
        <p className="text-sm font-extrabold text-slate-700 tracking-tight">{message}</p>
        <p className="text-[11px] text-slate-400 font-medium">Fetching data from server...</p>
      </div>

      {/* Animated dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
