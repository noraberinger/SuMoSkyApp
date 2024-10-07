import React, { useCallback, useMemo } from 'react';
import {useRef, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { LatLng, LatLngExpression, Marker as LeafletMarker } from 'leaflet';

/**
 * @returns LocationPin.
 * User can click and drag the location pin on any location on the canvas.
 * Makes use of @react-leaflet Marker and Popup component:
 * * https://leafletjs.com/reference.html#marker
 * * https://leafletjs.com/reference.html#popup
 */
const LocationPin: React.FC = () => {
    const positionZurich : LatLngExpression = [47.37, 8.53];
    const [draggable, setDraggable] = useState(false);
    const [pinPosition, setPinPosition] = useState(positionZurich);
    const pinRef = useRef<LeafletMarker | null>(null);
    const eventHandlers = useMemo(
        () => ({
            drag() {
                const pin = pinRef.current
                if (pin != null) {
                    const latLng: LatLng = pin.getLatLng();
                    setPinPosition([latLng.lat, latLng.lng]);
                }
            },
        }),
        [],
    )
    const toggleDraggable = useCallback(() => {
        setDraggable((d) => !d)
    }, [])

    const roundedPinPosition = Array.isArray(pinPosition) ? (pinPosition as number[]).map(coord => Math.round(coord * 100) / 100) : pinPosition;

    return (
        <>
        {pinPosition && (
            <Marker
                draggable={draggable}
                eventHandlers={eventHandlers}
                position={pinPosition}
                ref={pinRef}>
                <Popup minWidth={90}>
                    <span onClick={toggleDraggable}>
                        {draggable ? 'Now drag the pin' : 'Click window to make draggable'}
                        <br />
                        Your Location is: {Array.isArray(pinPosition) ? `${roundedPinPosition[0]}, ${roundedPinPosition[1]}` : 'Unknown'}
                    </span>
                </Popup>    
            </Marker>
        )}
        </>
    );
};

 export default LocationPin;


