import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import SunCalc from 'suncalc';
import L, { LatLngExpression, LatLng, polyline, layerGroup, Circle, circleMarker } from 'leaflet';
import { convertDateTime, convertLatLngToCoords } from './Utils/Calc';

interface SunMoonPositionProps {
    mapRef: React.MutableRefObject<L.Map | null>;
    center?: L.LatLngExpression;
    date: Date;
    time: number
}

/** Returns object with sun altitude above horizon and sun azimuth. Both in radians. */
const calculateSunPosition = (lat: number, lng: number, dateTime: Date) : { azimuth: number, altitude: number} => {
    const position = SunCalc.getPosition(dateTime, lat, lng);
    return { azimuth: position.azimuth, altitude: position.altitude };
}

const calculateSunriseSunset = (lat: number, lng: number, date: Date) : { sunrise: Date, sunset: Date} => {
    const times = SunCalc.getTimes(date, lat, lng);
    return { sunrise: times.sunrise, sunset: times.sunset };
}

const calculateMoonPosition = (lat: number, lng: number, dateTime: Date) : { azimuth: number, altitude: number} => {
    const position = SunCalc.getMoonPosition(dateTime, lat, lng);
    return { azimuth: position.azimuth, altitude: position.altitude };
}

const calculateMoonTimes = (date: Date, lat: number, lng: number) : { rise: Date, set: Date} => {
    const times = SunCalc.getMoonTimes(date, lat, lng, true);
    return { rise: times.rise, set: times.set};
}

const getAnchorPoint = (lat: number, lng: number, azimuth: number, distance: number) : { lat: number, lng: number } => {
    console.log('azimuth', azimuth);
    /** For spherical calc. */
    const radiusEarth = 6371e3;
    const angularDistance = distance / radiusEarth;
    const adjustedAzimuth = (azimuth + Math.PI) % (2 * Math.PI);

    const latRadians = (lat * Math.PI) / 180;
    const lngRadians = (lng * Math.PI) / 180;

    /** Coordinates of 2nd point. */
    const lat2 = Math.asin(Math.sin(latRadians) * Math.cos(angularDistance) + Math.cos(latRadians) * Math.sin(angularDistance) * Math.cos(adjustedAzimuth));
    const lng2 = lngRadians + Math.atan2(Math.sin(adjustedAzimuth) * Math.sin(angularDistance) * Math.cos(latRadians), Math.cos(angularDistance) - Math.sin(latRadians) * Math.sin(lat2));

    return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI};
};

/** Helper functions for drawing of Sun, Moon Map Objects */
const drawCircle = (lat: number, lng: number, radius: number, color: string, fillOpacity: number, mapRef: React.MutableRefObject<L.Map | null>) : L.Circle => {
    const circle = L.circle([lat, lng], {radius, color, fillOpacity, interactive: false});
    return circle;
}

const drawPolyline = (center: L.LatLngExpression, latAnchor: number, lngAnchor: number, color: string, weight: number) : L.Polyline => {
    const polyline = L.polyline([center, [latAnchor, lngAnchor]], {color, weight});
    return polyline;
}

const drawCircleMarker = (latAnchor: number, lngAnchor: number, radius: number, color: string, fillColor: string, fillOpacity: number) : L.CircleMarker => {
    const circleMarker = L.circleMarker([latAnchor, lngAnchor], {radius, color, fillColor, fillOpacity});
    return circleMarker;
}

const SunMoonPositionCalc:React.FC<SunMoonPositionProps> = ({ mapRef, center, date, time }) => {
   const celestialBodies = useMemo(() => {
        if (center) {
            const { lat, lng } = convertLatLngToCoords(center);
            const sliderDateTime = convertDateTime(date, time);
    
            const positionSun = calculateSunPosition(lat, lng, sliderDateTime);
            const sunTimes = calculateSunriseSunset(lat, lng, date);
    
            const positionMoon = calculateMoonPosition(lat, lng, sliderDateTime)
            const  moonTimes = calculateMoonTimes(date, lat, lng);

            return { sunTimes, moonTimes, positionMoon, positionSun };
        }
        return undefined;
     
    }, [center, date, time]);
    
    useEffect(() => {
        console.log("useLayouEffect", mapRef.current, center, celestialBodies);
        if (mapRef.current && center && celestialBodies)  {
            const { lat, lng } = convertLatLngToCoords(center);

            const sunbeamDistance = 1000;
            const moonbeamDistance = 1500;

            const map = mapRef.current as L.Map;
            map.eachLayer(layer => {
                if (layer instanceof L.Polyline || layer instanceof L.Circle || layer instanceof L.CircleMarker) {
                    map.removeLayer(layer);
                }
            });

            const sunbeamAnchor = getAnchorPoint(lat, lng, celestialBodies.positionSun.azimuth, sunbeamDistance);
            const sunbeamLine = drawPolyline(center, sunbeamAnchor.lat, sunbeamAnchor.lng, 'yellow', 2);
            sunbeamLine.bindTooltip('Sun position', {sticky: true, direction:'auto'});
            const sunCircle = drawCircle(lat, lng, sunbeamDistance, 'yellow', 0.25, mapRef);
            const sunbeamBall = drawCircleMarker(sunbeamAnchor.lat, sunbeamAnchor.lng, 10, 'yellow', 'yellow', 1);

            const sunrisePosition = calculateSunPosition(lat, lng, celestialBodies.sunTimes.sunrise);
            const sunrisebeamAnchor = getAnchorPoint(lat, lng, sunrisePosition.azimuth, sunbeamDistance);
            const sunrisebeamLine = drawPolyline(center, sunrisebeamAnchor.lat, sunrisebeamAnchor.lng, 'orange', 2);
            sunrisebeamLine.bindTooltip(`Sunrise at ${celestialBodies.sunTimes.sunrise.getHours()}:${celestialBodies.sunTimes.sunrise.getMinutes().toString().padStart(2, '0')}`, {sticky: true, direction:'auto'});

            const sunsetPosition = calculateSunPosition(lat, lng, celestialBodies.sunTimes.sunset);
            const sunsetbeamAnchor = getAnchorPoint(lat, lng, sunsetPosition.azimuth, sunbeamDistance);
            const sunsetbeamLine = drawPolyline(center, sunsetbeamAnchor.lat, sunsetbeamAnchor.lng, 'red', 2);
            sunsetbeamLine.bindTooltip(`Sunset at ${celestialBodies.sunTimes.sunset.getHours()}:${celestialBodies.sunTimes.sunset.getMinutes().toString().padStart(2, '0')}`, {sticky: true, direction:'auto'});

            const moonbeamAnchor = getAnchorPoint(lat, lng, celestialBodies.positionMoon.azimuth, moonbeamDistance);
            const moonbeamLine = drawPolyline(center, moonbeamAnchor.lat, moonbeamAnchor.lng, 'blue', 2);
            moonbeamLine.bindTooltip('Moon position', {sticky: true, direction:'auto'});
            const moonCircle = drawCircle(lat, lng, moonbeamDistance, 'blue', 0.15, mapRef);
            const moonbeamBall = drawCircleMarker(moonbeamAnchor.lat, moonbeamAnchor.lng, 10, 'blue', 'blue', 1);
            
            const moonrisePosition = calculateMoonPosition(lat, lng, celestialBodies.moonTimes.rise);
            const moonriseAnchor = getAnchorPoint(lat, lng, moonrisePosition.azimuth, moonbeamDistance);
            const moonriseLine = drawPolyline(center, moonriseAnchor.lat, moonriseAnchor.lng, 'lightblue', 2);
            moonriseLine.bindTooltip(`Moon rises ${celestialBodies.moonTimes.rise.getHours()}:${celestialBodies.moonTimes.rise.getMinutes().toString().padStart(2, '0')}`, {sticky: true, direction:'auto'});

            const moonsetPosition = calculateMoonPosition(lat,lng, celestialBodies.moonTimes.set);
            const moonsetAnchor = getAnchorPoint(lat, lng, moonsetPosition.azimuth, moonbeamDistance);
            const moonsetLine = drawPolyline(center, moonsetAnchor.lat, moonsetAnchor.lng, 'darkblue', 2);
            moonsetLine.bindTooltip(`Moon sets ${celestialBodies.moonTimes.set.getHours()}:${celestialBodies.moonTimes.set.getMinutes().toString().padStart(2, '0')}`, {sticky: true, direction:'auto'});

            L.layerGroup([sunCircle, sunbeamLine, sunbeamBall, sunrisebeamLine, sunsetbeamLine , moonCircle, moonbeamLine, moonbeamBall, moonriseLine, moonsetLine]).addTo(map);
    
        } else { console.warn('Map is not ready yet. Clearing of canvas is not yet possible.'); }

    }, [center, celestialBodies]);

    return null;
};

export default SunMoonPositionCalc;