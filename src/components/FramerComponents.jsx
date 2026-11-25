import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

/**
 * Subtle, tactile 3D perspective card that tilts gently toward the cursor
 * and resets smoothly on leave. Honors prefers-reduced-motion.
 */
export const Tilt3DCard = ({
  children,
  className = '',
  maxTilt = 3.5,
  onClick,
  ...props
}) => {
  const cardRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { stiffness: 260, damping: 24, mass: 0.6 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [maxTilt, -maxTilt]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-maxTilt, maxTilt]), springConfig);

  const handleMouseMove = (e) => {
    if (shouldReduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div style={{ perspective: '900px' }} className="h-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        style={shouldReduceMotion ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
        whileHover={shouldReduceMotion ? undefined : { y: -2 }}
        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
        className={`h-full ${className}`}
        {...props}
      >
        {children}
      </motion.div>
    </div>
  );
};

export const MotionCard = ({ children, className = '', delay = 0, onClick, hover = true, ...props }) => {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={hover && !shouldReduceMotion ? { y: -2 } : undefined}
      onClick={onClick}
      className={`neu-card ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MotionButton = ({ children, className = '', variant = 'primary', onClick, disabled, ...props }) => {
  const baseClass = variant === 'primary' ? 'btn-primary' : 'btn-solid';
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.button
      whileHover={!disabled && !shouldReduceMotion ? { scale: 1.01 } : undefined}
      whileTap={!disabled && !shouldReduceMotion ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClass} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export const FadeInContainer = ({ children, className = '', stagger = 0.04 }) => {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={shouldReduceMotion ? false : 'hidden'}
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: stagger, delayChildren: 0.02 }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const FadeInItem = ({ children, className = '' }) => {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      variants={
        shouldReduceMotion
          ? undefined
          : {
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }
            }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
};
