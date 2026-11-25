export default function SkeletonLoader({ className = '', count = 1 }) {
  const skeletons = Array(count).fill(0);

  return (
    <>
      {skeletons.map((_, index) => (
        <div
          key={index}
          className={`animate-pulse bg-zinc-200/80 border border-zinc-300/60 rounded-lg ${className}`}
        />
      ))}
    </>
  );
}
