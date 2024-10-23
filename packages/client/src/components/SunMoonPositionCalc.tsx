import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import SunCalc from 'suncalc';
import L, { LatLngExpression, LatLng } from 'leaflet';
import { convertDateTime, convertLatLngToCoords } from './Utils/Calc';

interface SunMoonPositionProps {
    mapRef: React.MutableRefObject<L.Map | null>;
    center?: L.LatLngExpression;
    date: Date;
    time: number
}


/** TODO: this is not precise -> functionality of moving slider yes but exact no
const convertDateTime = (date: Date, time: number) : Date => {
    const hour = Math.floor(time / 6);
    const minute = (time % 6) * 10;
    const dateTime = date;
    dateTime.setHours(hour, minute, 0);
    return dateTime;
} */

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

const getAnchorPoint = (lat: number, lng: number, azimuth: number, distance: number) => {
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

const drawCircle = (lat: number, lng: number, radius: number, color: string, fillOpacity: number, mapRef: React.MutableRefObject<L.Map | null>) => {
    const sunCircle = L.circle([lat, lng], {radius, color, fillOpacity});
    sunCircle.addTo(mapRef.current as L.Map);
}

const SunMoonPositionCalc:React.FC<SunMoonPositionProps> = ({ mapRef, center, date, time }) => {
   const celestialBodies = useMemo(() => {
        if (center) {
            const { lat, lng } = convertLatLngToCoords(center);
            const sliderDateTime = convertDateTime(date, time);
            //console.log('sliderDateTime', sliderDateTime);
    
            const positionSun = calculateSunPosition(lat, lng, sliderDateTime);
            //setSunPosition(positionSun);
            const sunTimes = calculateSunriseSunset(lat, lng, date);
            //console.log('sunsetTime', sunset);
            //console.log('sunriseTime', sunrise);
    
            const positionMoon = calculateMoonPosition(lat, lng, sliderDateTime);
            //setMoonPosition(positionMoon);
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
                if (layer instanceof L.Polyline || layer instanceof L.Circle) {
                    map.removeLayer(layer);
                }
            });

            const sunbeamAnchor = getAnchorPoint(lat, lng, celestialBodies.positionSun.azimuth, sunbeamDistance);
            const sunbeamLine = L.polyline([center, [sunbeamAnchor.lat, sunbeamAnchor.lng]], { color: 'yellow', weight: 2 });
            sunbeamLine.addTo(map);
            drawCircle(lat, lng, sunbeamDistance, 'yellow', 0.25, mapRef);

            const sunrisePosition = calculateSunPosition(lat, lng, celestialBodies.sunTimes.sunrise);
            const sunrisebeamAnchor = getAnchorPoint(lat, lng, sunrisePosition.azimuth, sunbeamDistance);
            const sunrisebeamLine = L.polyline([center, [sunrisebeamAnchor.lat, sunrisebeamAnchor.lng]], { color: 'orange', weight: 2});
            sunrisebeamLine.addTo(map);

            const sunsetPosition = calculateSunPosition(lat, lng, celestialBodies.sunTimes.sunset);
            const sunsetbeamAnchor = getAnchorPoint(lat, lng, sunsetPosition.azimuth, sunbeamDistance);
            const sunsetbeamLine = L.polyline([center, [sunsetbeamAnchor.lat, sunsetbeamAnchor.lng]], { color: 'red', weight: 2});
            sunsetbeamLine.addTo(map);

            //TODO moon rise and set
            const moonbeamAnchor = getAnchorPoint(lat, lng, celestialBodies.positionMoon.azimuth, moonbeamDistance);
            const moonbeamLine = L.polyline([center, [moonbeamAnchor.lat, moonbeamAnchor.lng]], { color: 'darkblue', weight: 2 });
            moonbeamLine.addTo(map);
            drawCircle(lat, lng, moonbeamDistance, 'darkblue', 0.15, mapRef);

            const moonrisePosition = calculateMoonPosition(lat, lng, celestialBodies.moonTimes.rise);
            const moonriseAnchor = getAnchorPoint(lat, lng, moonrisePosition.azimuth, moonbeamDistance);
            const moonriseLine = L.polyline([center, [moonriseAnchor.lat, moonriseAnchor.lng]], { color: 'blue', weight: 2});
            moonriseLine.addTo(map);

            const moonsetPosition = calculateMoonPosition(lat,lng, celestialBodies.moonTimes.set);
            const moonsetAnchor = getAnchorPoint(lat, lng, moonsetPosition.azimuth, moonbeamDistance);
            const moonsetLine = L.polyline([center, [moonsetAnchor.lat, moonsetAnchor.lng]], { color: 'lightblue', weight: 2});
            moonsetLine.addTo(map);
    
        } else {
        
                console.warn('Map is not ready yet. Clearing of canvas is not yet possible.')
        }
    }, [center, celestialBodies]);

    return null;
};

export default SunMoonPositionCalc;