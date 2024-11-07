import React, { useCallback, useMemo } from "react";
import { useRef, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import { LatLng, LatLngExpression, Marker as LeafletMarker } from "leaflet";

/**
 * @returns LocationPin.
 * User can click and drag the location pin on any location on the canvas.
 * Makes use of @react-leaflet Marker and Popup component:
 * * https://leafletjs.com/reference.html#marker
 * * https://leafletjs.com/reference.html#popup
 */
const LocationPin: React.FC = () => {
  const positionZurich: LatLngExpression = [47.37, 8.53];
  const [draggable, setDraggable] = useState(false);
  const [pinPosition, setPinPosition] = useState(positionZurich);
  const pinRef = useRef<LeafletMarker | null>(null);
  const eventHandlers = useMemo(
    () => ({
      drag() {
        const pin = pinRef.current;
        if (pin != null) {
          const latLng: LatLng = pin.getLatLng();
          setPinPosition([latLng.lat, latLng.lng]);
        }
      },
    }),
    [],
  );
  /** onClick onto the popup window this function is called making the pin draggable. */
  const toggleDraggable = useCallback(() => {
    setDraggable((d) => !d);
  }, []);

  /** Get the rounded pin Position.
   * The rounded result is used in form of a string to inform the user of latLng position of the current position.
   */
  const roundedPinPosition = Array.isArray(pinPosition)
    ? (pinPosition as number[]).map((coord) => Math.round(coord * 100) / 100)
    : pinPosition;

  return (
    <>
      {pinPosition && (
        <Marker
          draggable={draggable}
          eventHandlers={eventHandlers}
          position={pinPosition}
          ref={pinRef}
        >
          <Popup minWidth={90}>
            <span onClick={toggleDraggable}>
              {draggable
                ? "Now drag the pin"
                : "Click window to make draggable"}
              <br />
              Your Location is:{" "}
              {Array.isArray(pinPosition)
                ? `${roundedPinPosition[0]}, ${roundedPinPosition[1]}`
                : "Unknown"}
            </span>
          </Popup>
        </Marker>
      )}
    </>
  );
};

export default LocationPin;
