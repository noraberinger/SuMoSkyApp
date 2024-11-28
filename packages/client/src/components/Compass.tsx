import React, { useCallback, useEffect, useState } from "react";
import Camera from "terrender-core/src/Utils/Camera";

interface CompassProps {
  camera: Camera | undefined;
  currentDirection: number;
  setCurrentDirection: React.Dispatch<React.SetStateAction<number>>;
  topDown: boolean;
}

const Compass: React.FC<CompassProps> = ({
  camera,
  setCurrentDirection,
  currentDirection,
  topDown,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startAngle, setStartAngle] = useState<number>(0);
  const [startMouseAngle, setStartMouseAngle] = useState<number>(0);

  const updateCompass = (direction: number) => {
    const arrow = document.getElementById("compass-arrow");
    const label = document.getElementById("compass-label");
    if (arrow && label) {
      arrow.style.transform = `translate(-50%, -50%) rotate(${direction}deg)`;
      label.textContent = `${Math.round(direction)}°`;
    } else {
      console.warn("compass-arrow or compass-label is null.");
    }
  };

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

  const calculateCamTarget = useCallback(
    (direction: number, position: number[], target: number[]) => {
      //distance between camera and target
      const radius = Math.sqrt(
        (position[0] - target[0]) ** 2 + (position[1] - target[1]) ** 2,
      );

      // Compass direction in radians
      const angleInRadians = (direction * Math.PI) / 180;

      // Target position reflecting 360° movement of camera
      const newTargetX = position[1] + radius * Math.sin(angleInRadians);
      const newTargetY = position[0] + radius * Math.cos(angleInRadians);
      // Maintain the same elevation for the target
      const newTargetZ = position[2];

      return [newTargetX, newTargetY, newTargetZ];
    },
    [],
  );

  //TODO fix rotation
  const calculateTopDownCamTarget = useCallback(
    (direction: number, position: number[], target: number[]) => {
      const radius = position[2];
      // Compass direction in radians
      const angleInRadians = (direction * Math.PI) / 180;

      // Move around fixed center
      const newTargetX = radius * Math.cos(angleInRadians);
      const newTargetZ = target[2];
      const newTargetY = radius * Math.sin(angleInRadians);

      return [newTargetY, newTargetX, newTargetZ];
    },
    [],
  );

  const startDrag = useCallback(
    (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      event.stopPropagation();

      setIsDragging(true);
      setStartAngle(currentDirection);
      const compassElement = document.getElementById("compass");
      if (compassElement) {
        setStartMouseAngle(getAngleFromCenter(compassElement, event));
      } else {
        console.warn("Compass is null.");
      }
    },
    [currentDirection],
  );

  const drag = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      event.preventDefault();
      event.stopPropagation();

      const compassElement = document.getElementById("compass");
      if (compassElement) {
        const currentMouseAngle = getAngleFromCenter(compassElement, event);
        const angleDelta = currentMouseAngle - startMouseAngle;
        const newDirection = (startAngle + angleDelta + 360) % 360;
        setCurrentDirection(newDirection);
        updateCompass(newDirection);

        if (camera && !topDown) {
          const newTarget = calculateCamTarget(
            newDirection,
            camera.position,
            camera.target,
          );
          camera.changeCamPosition(camera.position, newTarget);
        } else if (camera && topDown) {
          const newTarget = calculateTopDownCamTarget(
            newDirection,
            camera.position,
            camera.target,
          );
          camera.changeCamPosition(camera.position, newTarget);
        }
      }
    },
    [
      calculateCamTarget,
      calculateTopDownCamTarget,
      camera,
      isDragging,
      setCurrentDirection,
      startAngle,
      startMouseAngle,
      topDown,
    ],
  );

  const endDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  const stopDragOutsideCompass = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const compassElement = document.getElementById("compass");
      if (compassElement && !compassElement.contains(event.target as Node)) {
        endDrag();
      }
    },
    [endDrag],
  );

  useEffect(() => {
    updateCompass(currentDirection);
  }, [currentDirection]);

  useEffect(() => {
    if (camera && camera.hasChanged()) {
      const yaw = Math.atan2(camera.viewDirection[0], camera.viewDirection[2]);
      const direction = (yaw * 180) / Math.PI;
      const compassHeading = (direction + 360) % 360;
      setCurrentDirection(compassHeading);
      updateCompass(compassHeading);
    }
  }, [camera, setCurrentDirection]);

  useEffect(() => {
    const compassElement = document.getElementById("compass");
    if (compassElement) {
      compassElement.addEventListener("mousedown", startDrag);
      compassElement.addEventListener("touchstart", startDrag);
      compassElement.addEventListener("mouseleave", stopDragOutsideCompass);
      compassElement.addEventListener("touchcancel", stopDragOutsideCompass);
    }
    document.addEventListener("mousemove", drag);
    document.addEventListener("touchmove", drag);
    document.addEventListener("mouseup", endDrag);
    document.addEventListener("touchend", endDrag);

    return () => {
      if (compassElement) {
        compassElement.removeEventListener("mousedown", startDrag);
        compassElement.removeEventListener("touchstart", startDrag);
        compassElement.removeEventListener(
          "mouseleave",
          stopDragOutsideCompass,
        );
        compassElement.removeEventListener(
          "touchcancel",
          stopDragOutsideCompass,
        );
      }
      document.removeEventListener("mousemove", drag);
      document.removeEventListener("touchmove", drag);
      document.removeEventListener("mouseup", endDrag);
      document.removeEventListener("touchend", endDrag);
    };
  }, [startDrag, drag, endDrag, stopDragOutsideCompass]);

  return (
    <div id="compass">
      <div id="compass-arrow"></div>
      <div id="compass-label">0°</div>
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
