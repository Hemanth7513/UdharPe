import { useEffect, useState } from 'react';
import { animate } from 'framer-motion';

/**
 * Smoothly animates currency values from 0 (or previous value) to target amount.
 */
export default function AnimatedCurrency({ value = 0, prefix = '₹', className = '' }) {
  const numericTarget = Number(value) || 0;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(displayValue, numericTarget, {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericTarget]);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}{displayValue.toLocaleString('en-IN')}
    </span>
  );
}
