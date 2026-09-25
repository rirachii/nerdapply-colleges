// Adapted from Aceternity UI's Stateful Button interaction.
// Driven by the real export lifecycle, with no fake loading delay or shared layout ID.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowDownToLine, Check, LoaderCircle } from 'lucide-react';
import { Button } from './button';
export function StatefulButton({
  busy,
  success,
  disabled,
  onClick,
  compact = false,
}: {
  busy: boolean;
  success: boolean;
  disabled: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const reduced = useReducedMotion();
  const state = busy ? 'loading' : success ? 'success' : 'idle';
  return (
    <Button
      variant="primary"
      className="export-button"
      disabled={disabled || busy}
      onClick={onClick}
      aria-busy={busy}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          className="button-state"
          key={state}
          initial={{ opacity: 0, y: reduced ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : -4 }}
          transition={{ duration: reduced ? 0 : 0.15 }}
        >
          {busy ? (
            <LoaderCircle className="spin" size={16} />
          ) : success ? (
            <Check size={16} />
          ) : (
            <ArrowDownToLine size={16} />
          )}
          {busy
            ? 'Preparing PDF…'
            : success
              ? 'PDF downloaded'
              : compact
                ? 'Download PDF'
                : 'Download student PDF'}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
