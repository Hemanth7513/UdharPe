import { motion } from 'framer-motion';

export const MotionCard = ({ children, className = '', delay = 0, onClick, hover = true, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ 
        duration: 0.35, 
        delay, 
        ease: [0.25, 0.1, 0.25, 1.0] 
      }}
      whileHover={hover ? { y: -3, transition: { duration: 0.2 } } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
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
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.01 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClass} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export const FadeInContainer = ({ children, className = '', stagger = 0.08 }) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: stagger,
            delayChildren: 0.05
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const FadeInItem = ({ children, className = '' }) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: { duration: 0.3, ease: 'easeOut' }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
