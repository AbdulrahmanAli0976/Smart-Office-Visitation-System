import { useEffect, useRef } from 'react';

export default function useScrollToError(trigger) {
  const ref = useRef(null);

  useEffect(() => {
    if (trigger && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [trigger]);

  return ref;
}
