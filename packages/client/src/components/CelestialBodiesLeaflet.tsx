import React, { useEffect, useMemo } from "react";
import SunCalc from "suncalc";
import L from "leaflet";
import {
  convertDateTime,
  convertLatLngToCoords,
  calculateSunTimes,
} from "./Utils/Calc";

interface CelestialBodiesProps {
  mapRef: React.MutableRefObject<L.Map | null>;
  center?: L.LatLngExpression;
  date: Date;
  time: number;
  showSun: boolean;
  showMoon: boolean;
  setSunTimes: React.Dispatch<
    React.SetStateAction<{
      sunrise: string;
      sunset: string;
      goldenHourMorning: string;
      goldenHourEvening: string;
      blueHourMorning: string;
      blueHourEvening: string;
    }>
  >;
  setMoonTimes: React.Dispatch<
    React.SetStateAction<{ rise: string; set: string }>
  >;
  setMoonPhase: React.Dispatch<React.SetStateAction<{ phase: string }>>;
  setIsSupermoon: React.Dispatch<React.SetStateAction<boolean>>;
}

/** Returns object with sun altitude above horizon and sun azimuth. Both in radians. */
const calculateSunPosition = (
  lat: number,
  lng: number,
  dateTime: Date,
): { azimuth: number; altitude: number } => {
  const position = SunCalc.getPosition(dateTime, lat, lng);
  return { azimuth: position.azimuth, altitude: position.altitude };
};

const calculateMoonPosition = (
  lat: number,
  lng: number,
  dateTime: Date,
): { azimuth: number; altitude: number; distance: number } => {
  const azimuth = 0;
  const altitude = 0;
  const distance = 0;
  try {
    const position = SunCalc.getMoonPosition(dateTime, lat, lng);
    return {
      azimuth: position.azimuth,
      altitude: position.altitude,
      distance: position.distance,
    };
  } catch (e) {
    console.warn("Error calculating moon position:", e);
  }

  return { azimuth, altitude, distance };
};

const calculateMoonTimes = (
  date: Date,
  lat: number,
  lng: number,
): { rise: Date; set: Date } => {
  const times = SunCalc.getMoonTimes(date, lat, lng, true);
  return { rise: times.rise, set: times.set };
};

const calculateMoonPhase = (date: Date): { phase: number } => {
  const illumination = SunCalc.getMoonIllumination(date);
  return { phase: illumination.phase };
};

//TODO supermoon can also be a new moon
const fullMoonTreshold = [0.48, 0.53];
//TODO Find better treshholds
const getMoonPhase = (phase: number): string => {
  if (phase === 0) return "New Moon";
  if (phase === 0.25) return "First Quarter";
  if ((phase >= fullMoonTreshold[0], phase <= fullMoonTreshold[1]))
    return "Full Moon";
  if (phase === 0.75) return "Last Quarter";
  if (phase > 0 && phase < 0.25) return "Waxing Crescent";
  if (phase > 0.25 && phase < 0.48) return "Waxing Gibbous";
  if (phase > 0.53 && phase < 0.75) return "Waning Gibbous";
  if (phase > 0.75 && phase < 1) return "Waning Crescent";

  console.warn("Moon phases not ready.");
  return "";
};

//TODO: find good numbers, check if correct for new moon phase as well
const calculateSupermoon = (distance: number, phase: number): boolean => {
  /** 
  SearchLunarApis(date now); => future or past date Apsis, kind.pericenter, distance km
  if pericenter => threshold > distance now/kind.pericenter.distance then supermoon percentage
  else apicenter aka moon moving away => find closest point in past, half of cyyle find SearchLunarApsis()
  actual distance if in 90% then supermoon
  */

  const perigge = 356907;
  const treshold = 12000;

  if (
    Math.abs(distance - perigge) <= treshold &&
    phase >= fullMoonTreshold[0] &&
    phase <= fullMoonTreshold[1]
  ) {
    return true;
  }
  return false;
};

const getAnchorPoint = (
  lat: number,
  lng: number,
  azimuth: number,
  distance: number,
): { lat: number; lng: number } => {
  /** For spherical calc. */
  const radiusEarth = 6371e3;
  const angularDistance = distance / radiusEarth;
  const adjustedAzimuth = (azimuth + Math.PI) % (2 * Math.PI);

  const latRadians = (lat * Math.PI) / 180;
  const lngRadians = (lng * Math.PI) / 180;

  /** Coordinates of 2nd point. */
  const lat2 = Math.asin(
    Math.sin(latRadians) * Math.cos(angularDistance) +
      Math.cos(latRadians) *
        Math.sin(angularDistance) *
        Math.cos(adjustedAzimuth),
  );
  const lng2 =
    lngRadians +
    Math.atan2(
      Math.sin(adjustedAzimuth) *
        Math.sin(angularDistance) *
        Math.cos(latRadians),
      Math.cos(angularDistance) - Math.sin(latRadians) * Math.sin(lat2),
    );

  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
};

/** Helper functions for drawing of Sun, Moon Map Objects */
const drawCircle = (
  lat: number,
  lng: number,
  radius: number,
  color: string,
  fillOpacity: number,
): L.Circle => {
  const circle = L.circle([lat, lng], {
    radius,
    color,
    fillOpacity,
    interactive: false,
  });
  return circle;
};

const drawPolyline = (
  center: L.LatLngExpression,
  latAnchor: number,
  lngAnchor: number,
  color: string,
  weight: number,
): L.Polyline => {
  const polyline = L.polyline([center, [latAnchor, lngAnchor]], {
    color,
    weight,
  });
  return polyline;
};

const drawCircleMarker = (
  latAnchor: number,
  lngAnchor: number,
  radius: number,
  color: string,
  fillColor: string,
  fillOpacity: number,
): L.CircleMarker => {
  const circleMarker = L.circleMarker([latAnchor, lngAnchor], {
    radius,
    color,
    fillColor,
    fillOpacity,
  });
  return circleMarker;
};

const drawArc = (
  lat: number,
  lng: number,
  riseAzimuth: number,
  setAzimuth: number,
  setAnchor: { lat: number; lng: number },
  radius: number,
  color: string,
) => {
  const points: [number, number][] = [];
  const step = 1;

  for (let p = riseAzimuth; p <= setAzimuth; p += step * (Math.PI / 180)) {
    const anchorPoint = getAnchorPoint(lat, lng, p, radius);
    points.push([anchorPoint.lat, anchorPoint.lng]);
  }

  points.unshift([lat, lng]);
  points.push([setAnchor.lat, setAnchor.lng]);
  const shadedArea = L.polygon(points, {
    color: color,
    fillColor: color,
    fillOpacity: 0.5,
  });
  return shadedArea;
};

export const CelestialBodiesLeaflet: React.FC<CelestialBodiesProps> = ({
  mapRef,
  center,
  date,
  time,
  showSun,
  showMoon,
  setSunTimes,
  setMoonTimes,
  setMoonPhase,
  setIsSupermoon,
}) => {
  const celestialBodies = useMemo(() => {
    if (center) {
      const { lat, lng } = convertLatLngToCoords(center);
      const sliderDateTime = convertDateTime(date, time);

      const positionSun = calculateSunPosition(lat, lng, sliderDateTime);
      const sunTimes = calculateSunTimes(lat, lng, date);

      const positionMoon = calculateMoonPosition(lat, lng, sliderDateTime);
      const moonTimes = calculateMoonTimes(date, lat, lng);
      const moonPhase = calculateMoonPhase(date);

      let sunbeamDistance;
      let moonbeamDistance;

      if (
        sliderDateTime.getTime() < sunTimes.sunrise.getTime() ||
        sliderDateTime.getTime() > sunTimes.sunset.getTime()
      ) {
        sunbeamDistance = 1300;
        moonbeamDistance = 1500;
      } else {
        sunbeamDistance = 1500;
        moonbeamDistance = 1300;
      }

      return {
        sunTimes,
        moonTimes,
        positionMoon,
        positionSun,
        moonPhase,
        sunbeamDistance,
        moonbeamDistance,
      };
    }
    return undefined;
  }, [center, date, time]);

  useEffect(() => {
    if (mapRef.current && center && celestialBodies) {
      setIsSupermoon(
        calculateSupermoon(
          celestialBodies.positionMoon.distance,
          celestialBodies.moonPhase.phase,
        ),
      );

      const { lat, lng } = convertLatLngToCoords(center);

      const map = mapRef.current as L.Map;
      map.eachLayer((layer) => {
        if (
          layer instanceof L.Polyline ||
          layer instanceof L.Circle ||
          layer instanceof L.CircleMarker
        ) {
          map.removeLayer(layer);
        }
      });

      const sunriseTime = celestialBodies.sunTimes.sunrise;
      const sunsetTime = celestialBodies.sunTimes.sunset;
      const riseTime = celestialBodies.moonTimes.rise;
      const setTime = celestialBodies.moonTimes.set;
      const moonPhase = celestialBodies.moonPhase.phase;
      setMoonPhase({ phase: getMoonPhase(moonPhase) });

      const sunLayer: L.Layer[] = [];
      const moonLayer: L.Layer[] = [];

      if (sunriseTime && sunsetTime && showSun) {
        const sunbeamAnchor = getAnchorPoint(
          lat,
          lng,
          celestialBodies.positionSun.azimuth,
          celestialBodies.sunbeamDistance,
        );
        const sunbeamLine = drawPolyline(
          center,
          sunbeamAnchor.lat,
          sunbeamAnchor.lng,
          "yellow",
          2,
        );
        sunbeamLine.bindTooltip("Sun position", {
          sticky: true,
          direction: "auto",
        });
        const sunCircle = drawCircle(
          lat,
          lng,
          celestialBodies.sunbeamDistance,
          "yellow",
          0.25,
        );
        const sunbeamBall = drawCircleMarker(
          sunbeamAnchor.lat,
          sunbeamAnchor.lng,
          10,
          "yellow",
          "yellow",
          1,
        );

        const sunrisePosition = calculateSunPosition(
          lat,
          lng,
          celestialBodies.sunTimes.sunrise,
        );
        const sunrisebeamAnchor = getAnchorPoint(
          lat,
          lng,
          sunrisePosition.azimuth,
          celestialBodies.sunbeamDistance,
        );
        const sunrisebeamLine = drawPolyline(
          center,
          sunrisebeamAnchor.lat,
          sunrisebeamAnchor.lng,
          "#ffaa30",
          2,
        );
        sunrisebeamLine.bindTooltip(
          `Sunrise at ${celestialBodies.sunTimes.sunrise.getHours()}:${celestialBodies.sunTimes.sunrise.getMinutes().toString().padStart(2, "0")}`,
          { sticky: true, direction: "auto" },
        );

        const sunsetPosition = calculateSunPosition(
          lat,
          lng,
          celestialBodies.sunTimes.sunset,
        );
        const sunsetbeamAnchor = getAnchorPoint(
          lat,
          lng,
          sunsetPosition.azimuth,
          celestialBodies.sunbeamDistance,
        );
        const sunsetbeamLine = drawPolyline(
          center,
          sunsetbeamAnchor.lat,
          sunsetbeamAnchor.lng,
          "#e36742",
          2,
        );
        sunsetbeamLine.bindTooltip(
          `Sunset at ${celestialBodies.sunTimes.sunset.getHours()}:${celestialBodies.sunTimes.sunset.getMinutes().toString().padStart(2, "0")}`,
          { sticky: true, direction: "auto" },
        );

        const shadedArea = drawArc(
          lat,
          lng,
          sunrisePosition.azimuth,
          sunsetPosition.azimuth,
          sunsetbeamAnchor,
          celestialBodies.sunbeamDistance,
          "yellow",
        );
        shadedArea.bindTooltip("Sunlit hours.");

        const sunrise = `${celestialBodies.sunTimes.sunrise.getHours()}:${celestialBodies.sunTimes.sunrise.getMinutes().toString().padStart(2, "0")}`;
        const sunset = `${celestialBodies.sunTimes.sunset.getHours()}:${celestialBodies.sunTimes.sunset.getMinutes().toString().padStart(2, "0")}`;
        const goldenHourMorning = `${celestialBodies.sunTimes.goldenHourMorning.getHours()}:${celestialBodies.sunTimes.goldenHourMorning.getMinutes().toString().padStart(2, "0")}`;
        const goldenHourEvening = `${celestialBodies.sunTimes.goldenHourEvening.getHours()}:${celestialBodies.sunTimes.goldenHourEvening.getMinutes().toString().padStart(2, "0")}`;
        const blueHourMorning = `${celestialBodies.sunTimes.blueHourMorning.getHours()}:${celestialBodies.sunTimes.blueHourMorning.getMinutes().toString().padStart(2, "0")}`;
        const blueHourEvening = `${celestialBodies.sunTimes.blueHourEvening.getHours()}:${celestialBodies.sunTimes.blueHourEvening.getMinutes().toString().padStart(2, "0")}`;
        setSunTimes({
          sunrise,
          sunset,
          goldenHourMorning,
          goldenHourEvening,
          blueHourMorning,
          blueHourEvening,
        });

        sunLayer.push(
          sunCircle,
          shadedArea,
          sunbeamLine,
          sunbeamBall,
          sunrisebeamLine,
          sunsetbeamLine,
        );
      } else {
        console.warn("Times for sun not ready.");
      }

      if (riseTime && setTime && showMoon) {
        const moonbeamAnchor = getAnchorPoint(
          lat,
          lng,
          celestialBodies.positionMoon.azimuth,
          celestialBodies.moonbeamDistance,
        );
        const moonbeamLine = drawPolyline(
          center,
          moonbeamAnchor.lat,
          moonbeamAnchor.lng,
          "blue",
          2,
        );
        moonbeamLine.bindTooltip("Moon position", {
          sticky: true,
          direction: "auto",
        });
        const moonCircle = drawCircle(
          lat,
          lng,
          celestialBodies.moonbeamDistance,
          "blue",
          0.15,
        );
        const moonbeamBall = drawCircleMarker(
          moonbeamAnchor.lat,
          moonbeamAnchor.lng,
          10,
          "blue",
          "blue",
          1,
        );

        const moonrisePosition = calculateMoonPosition(
          lat,
          lng,
          celestialBodies.moonTimes.rise,
        );
        const moonriseAnchor = getAnchorPoint(
          lat,
          lng,
          moonrisePosition.azimuth,
          celestialBodies.moonbeamDistance,
        );
        const moonriseLine = drawPolyline(
          center,
          moonriseAnchor.lat,
          moonriseAnchor.lng,
          "#52bdf7",
          2,
        );
        moonriseLine.bindTooltip(
          `Moon rises ${celestialBodies.moonTimes.rise.getHours()}:${celestialBodies.moonTimes.rise.getMinutes().toString().padStart(2, "0")}`,
          { sticky: true, direction: "auto" },
        );

        const moonsetPosition = calculateMoonPosition(
          lat,
          lng,
          celestialBodies.moonTimes.set,
        );
        const moonsetAnchor = getAnchorPoint(
          lat,
          lng,
          moonsetPosition.azimuth,
          celestialBodies.moonbeamDistance,
        );
        const moonsetLine = drawPolyline(
          center,
          moonsetAnchor.lat,
          moonsetAnchor.lng,
          "darkblue",
          2,
        );
        moonsetLine.bindTooltip(
          `Moon sets ${celestialBodies.moonTimes.set.getHours()}:${celestialBodies.moonTimes.set.getMinutes().toString().padStart(2, "0")}`,
          { sticky: true, direction: "auto" },
        );

        const shadedArea = drawArc(
          lat,
          lng,
          moonrisePosition.azimuth,
          moonsetPosition.azimuth,
          moonsetAnchor,
          celestialBodies.moonbeamDistance,
          "blue",
        );
        shadedArea.bindTooltip("Moonlit hours.");

        const rise = `${celestialBodies.moonTimes.rise.getHours()}:${celestialBodies.moonTimes.rise.getMinutes().toString().padStart(2, "0")}`;
        const set = `${celestialBodies.moonTimes.set.getHours()}:${celestialBodies.moonTimes.set.getMinutes().toString().padStart(2, "0")}`;
        setMoonTimes({ rise, set });

        moonLayer.push(
          moonCircle,
          shadedArea,
          moonbeamLine,
          moonbeamBall,
          moonriseLine,
          moonsetLine,
        );
      } else {
        console.warn("Times for moon not ready.");
      }

      if (celestialBodies.moonbeamDistance === 1500) {
        L.layerGroup([...sunLayer, ...moonLayer]).addTo(map);
      } else {
        L.layerGroup([...moonLayer, ...sunLayer]).addTo(map);
      }
    } else {
      console.warn("Map is not ready. Clearing of canvas is not yet possible.");
    }
  }, [
    center,
    celestialBodies,
    showSun,
    showMoon,
    mapRef,
    setMoonPhase,
    setSunTimes,
    setMoonTimes,
    setIsSupermoon,
  ]);

  return null;
};

export default CelestialBodiesLeaflet;
