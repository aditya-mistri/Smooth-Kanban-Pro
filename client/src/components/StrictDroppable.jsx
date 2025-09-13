import { useEffect, useState } from "react";
import { Droppable } from "react-beautiful-dnd";

// This is a workaround for a known issue with react-beautiful-dnd in React 18 strict mode.
// It prevents the component from rendering on the initial server-side pass.
export const StrictDroppable = ({ children, ...props }) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));

    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return <Droppable {...props}>{children}</Droppable>;
};
