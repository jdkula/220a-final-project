import { FC, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function usePortal(): HTMLDivElement {
  const [container] = useState(document.createElement("div"));

  useEffect(() => {
    document.body.appendChild(container);
    return () => {
      document.body.removeChild(container);
    };
  }, [container]);

  return container;
}

const Portal: FC = ({ children }) => {
  const portal = usePortal();

  return createPortal(children, portal);
};

export default Portal;