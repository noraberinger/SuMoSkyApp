import React, { useCallback, useEffect, useRef, useState } from "react";

interface CompassProps {
  direction: number;
  setDirection: (newDirection: number) => void;
}

/*  Calculating angle of Compass */
const getAngleFromCenter = (
  element: HTMLElement,
  event: MouseEvent | TouchEvent,
) => {
  const rectangle = element.getBoundingClientRect();
  const centerX = rectangle.left + rectangle.width / 2;
  const centerY = rectangle.top + rectangle.height / 2;

  let clientX, clientY;
  if ("touches" in event) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
  }

  return (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI;
};

const Compass: React.FC<CompassProps> = ({ setDirection, direction }) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startAngle, setStartAngle] = useState<number>(0);
  const [startMouseAngle, setStartMouseAngle] = useState<number>(0);

  const compassRef = useRef<HTMLDivElement | null>(null);

  /* Using click and drag on top of the Compass surface one can move the compass */
  const startDrag = useCallback(
    (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      event.stopPropagation();

      setIsDragging(true);
      setStartAngle(direction);
      if (compassRef.current) {
        setStartMouseAngle(getAngleFromCenter(compassRef.current, event));
      } else {
        console.warn("Compass is null.");
      }
    },
    [direction],
  );

  const drag = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      event.preventDefault();
      event.stopPropagation();

      if (compassRef.current) {
        const currentMouseAngle = getAngleFromCenter(compassRef.current, event);
        const angleDelta = currentMouseAngle - startMouseAngle;
        const newDirection = (startAngle + angleDelta + 360) % 360;

        setDirection(newDirection);
      }
    },
    [isDragging, setDirection, startAngle, startMouseAngle],
  );

  const endDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  /* Inhibit MouseEvent and TouchEvent when not on Compass in order to inhibit interference with the StandardInputHandler of TerrenderCanvas */
  const stopDragOutsideCompass = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (compassRef.current?.contains(event.target as Node)) {
        endDrag();
      }
    },
    [endDrag],
  );

  /* Event Listeners for Compass */
  useEffect(() => {
    const compassEl = compassRef.current;
    if (compassEl) {
      compassEl.addEventListener("mousedown", startDrag);
      compassEl.addEventListener("touchstart", startDrag);
      compassEl.addEventListener("mouseleave", stopDragOutsideCompass);
      compassEl.addEventListener("touchcancel", stopDragOutsideCompass);
    }
    document.addEventListener("mousemove", drag);
    document.addEventListener("touchmove", drag);
    document.addEventListener("mouseup", endDrag);
    document.addEventListener("touchend", endDrag);

    return () => {
      if (compassEl) {
        compassEl.removeEventListener("mousedown", startDrag);
        compassEl.removeEventListener("touchstart", startDrag);
        compassEl.removeEventListener("mouseleave", stopDragOutsideCompass);
        compassEl.removeEventListener("touchcancel", stopDragOutsideCompass);
      }
      document.removeEventListener("mousemove", drag);
      document.removeEventListener("touchmove", drag);
      document.removeEventListener("mouseup", endDrag);
      document.removeEventListener("touchend", endDrag);
    };
  }, [startDrag, drag, endDrag, stopDragOutsideCompass]);

  return (
    <div ref={compassRef} id="compass">
      <div
        id="compass-arrow"
        style={{ transform: `translate(-50%, -50%) rotate(${direction}deg)` }}
      ></div>
      <div id="compass-label">{`${Math.round(direction)}°`}</div>
      <div className="compass-marker" style={{ top: "10px", left: "50%" }}>
        N
      </div>
      <div className="compass-marker" style={{ top: "50%", right: "10px" }}>
        E
      </div>
      <div className="compass-marker" style={{ bottom: "10px", left: "50%" }}>
        S
      </div>
      <div className="compass-marker" style={{ top: "50%", left: "10px" }}>
        W
      </div>
    </div>
  );
};

export default Compass;
