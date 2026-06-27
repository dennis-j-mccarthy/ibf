export default function Loading() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
        <div className="h-8 w-72 bg-[#e5e5e5] rounded" />
        <div className="h-36 bg-[#e5e5e5] rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-[#e5e5e5] rounded-xl" />
          <div className="h-72 bg-[#e5e5e5] rounded-xl" />
        </div>
        <div className="h-56 bg-[#e5e5e5] rounded-xl" />
      </div>
    </div>
  );
}
