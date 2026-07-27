import React from 'react';

export default function SkeletonLoader({ className, count = 1 }) {
  const skeletons = Array(count).fill(0);
  
  return (
    <>
      {skeletons.map((_, index) => (
        <div 
          key={index} 
          className={`animate-pulse bg-neu-bg border-4 border-black shadow-none bg-white rounded-none ${className}`}
        ></div>
      ))}
    </>
  );
}
