import React, { useEffect, useMemo } from "react";
import SunCalc from "suncalc";
import * as Astronomy from "astronomy-engine";
import L from "leaflet";
import {
  convertDateTime,
  convertLatLngToCoords,
  calculateSunTimes,
} from "./Utils/Calc";

/* Boundaries for moon phases */
const MOON_PHASES = {
  NEW_MOON: { min: 0.97, max: 0.03 },
  WAXING_CRESCENT: { min: 0.03, max: 0.22 },
  FIRST_QUARTER: { min: 0.22, max: 0.28 },
  WAXING_GIBBOUS: { min: 0.28, max: 0.47 },
  FULL_MOON: { min: 0.47, max: 0.53 },
  WANING_GIBBOUS: { min: 0.53, max: 0.72 },
  LAST_QUARTER: { min: 0.72, max: 0.78 },
  WANING_CRESCENT: { min: 0.78, max: 0.97 },
} as const;

interface CelestialBodiesProps {
  mapRef: React.MutableRefObject<L.Map | null>;
  landmark: L.LatLngExpression | undefined;
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

/* Returns Sun and Moon object with altitude angle and azimuth angle. Both in radians. */
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

/** Issue when calculating times using suncalc =>
 *  if moon sets on the previous or next calendar day suncalc.getMoonTimes returns undefined: https://github.com/mourner/suncalc/issues/163
 *  Astronomy engine is used to calculate moon rise and set times, as a workaround. */
const calculateMoonTimes = (
  body: Astronomy.Body,
  date: Date,
  lat: number,
  lng: number,
): { rise: Date | null; set: Date | null } => {
  const observer = new Astronomy.Observer(lat, lng, 0);
  const astroDate = new Astronomy.AstroTime(date);
  const rise = Astronomy.SearchRiseSet(body, observer, +1, astroDate, -1, 0);
  const set = Astronomy.SearchRiseSet(body, observer, -1, astroDate, -1, 0);
  const riseTime = rise ? rise.date : null;
  const setTime = set ? set.date : null;
  return { rise: riseTime, set: setTime };
};

const calculateMoonPhase = (date: Date): { phase: number } => {
  const illumination = SunCalc.getMoonIllumination(date);
  return { phase: illumination.phase };
};

const getMoonPhase = (phase: number): string => {
  const normalizedPhase = phase % 1;

  if (
    normalizedPhase >= MOON_PHASES.NEW_MOON.min ||
    normalizedPhase <= MOON_PHASES.NEW_MOON.max
  ) {
    return "New Moon";
  }

  if (
    normalizedPhase >= MOON_PHASES.WAXING_CRESCENT.min &&
    normalizedPhase <= MOON_PHASES.WAXING_CRESCENT.max
  ) {
    return "Waxing Crescent";
  }

  if (
    normalizedPhase >= MOON_PHASES.FIRST_QUARTER.min &&
    normalizedPhase <= MOON_PHASES.FIRST_QUARTER.max
  ) {
    return "First Quarter";
  }

  if (
    normalizedPhase >= MOON_PHASES.WAXING_GIBBOUS.min &&
    normalizedPhase <= MOON_PHASES.WAXING_GIBBOUS.max
  ) {
    return "Waxing Gibbous";
  }

  if (
    normalizedPhase >= MOON_PHASES.FULL_MOON.min &&
    normalizedPhase <= MOON_PHASES.FULL_MOON.max
  ) {
    return "Full Moon";
  }

  if (
    normalizedPhase >= MOON_PHASES.WANING_GIBBOUS.min &&
    normalizedPhase <= MOON_PHASES.WANING_GIBBOUS.max
  ) {
    return "Waning Gibbous";
  }

  if (
    normalizedPhase >= MOON_PHASES.LAST_QUARTER.min &&
    normalizedPhase <= MOON_PHASES.LAST_QUARTER.max
  ) {
    return "Last Quarter";
  }

  if (
    normalizedPhase >= MOON_PHASES.WANING_CRESCENT.min &&
    normalizedPhase <= MOON_PHASES.WANING_CRESCENT.max
  ) {
    return "Waning Crescent";
  }

  console.warn("Moon phases not ready.");
  return "";
};

const calculateSupermoon = (date: Date, phase: number): boolean => {
  const perigee = 356907;
  const threshold = 0.9;
  const dayMs = 24 * 60 * 60 * 1000;

  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  /* Find perigee or apogee after current date => search for nearest apsis one day before selected date */
  const searchDate = new Date(date.toISOString().split("T")[0]);
  const searchDateMin1Day = new Date(searchDate.getTime() - dayMs);

  const nearestApsis = Astronomy.SearchLunarApsis(searchDateMin1Day);
  const nearestApsisDate = new Date(nearestApsis.time.date);

  const currentPhase = getMoonPhase(phase);

  /* If the distance in km matches within 90% of the perigee distance, it is a supermoon */
  if (
    (nearestApsis.kind === Astronomy.ApsisKind.Pericenter &&
      formatDate(nearestApsisDate) === formatDate(searchDate) &&
      currentPhase === "Full Moon") ||
    (nearestApsis.kind === Astronomy.ApsisKind.Pericenter &&
      formatDate(nearestApsisDate) === formatDate(searchDate) &&
      currentPhase === "New Moon")
  ) {
    const distanceRatio = nearestApsis.dist_km / perigee;

    return distanceRatio >= threshold;
  }
  return false;
};

const getAnchorPoint = (
  lat: number,
  lng: number,
  azimuth: number,
  distance: number,
): { lat: number; lng: number } => {
  /* For spherical calc. */
  const radiusEarth = 6371e3;
  const angularDistance = distance / radiusEarth;
  const adjustedAzimuth = (azimuth + Math.PI) % (2 * Math.PI);

  const latRadians = (lat * Math.PI) / 180;
  const lngRadians = (lng * Math.PI) / 180;

  /* Coordinates of 2nd point. */
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

/* Helper functions for drawing of Sun, Moon Map Objects */
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
  landmark: center,
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
      const currentDate = date;

      const positionSun = calculateSunPosition(lat, lng, sliderDateTime);
      const sunTimes = calculateSunTimes(lat, lng, date);

      const positionMoon = calculateMoonPosition(lat, lng, sliderDateTime);
      const moonRiseSet = calculateMoonTimes(
        Astronomy.Body.Moon,
        date,
        lat,
        lng,
      );
      const moonPhase = calculateMoonPhase(date);

      let sunbeamDistance;
      let moonbeamDistance;

      if (
        (sunTimes.sunrise &&
          sliderDateTime.getTime() < sunTimes.sunrise.getTime()) ||
        (sunTimes.sunset &&
          sliderDateTime.getTime() > sunTimes.sunset.getTime())
      ) {
        sunbeamDistance = 1300;
        moonbeamDistance = 1500;
      } else {
        sunbeamDistance = 1500;
        moonbeamDistance = 1300;
      }

      return {
        sunTimes,
        moonRiseSet,
        positionMoon,
        positionSun,
        moonPhase,
        sunbeamDistance,
        moonbeamDistance,
        currentDate,
      };
    }
    return undefined;
  }, [center, date, time]);

  useEffect(() => {
    if (mapRef.current && center && celestialBodies) {
      setIsSupermoon(
        calculateSupermoon(
          celestialBodies.currentDate,
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

      const moonPhase = celestialBodies.moonPhase.phase;
      setMoonPhase({ phase: getMoonPhase(moonPhase) });

      const sunLayer: L.Layer[] = [];
      const moonLayer: L.Layer[] = [];

      if (showSun) {
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
          sunrisebeamLine,
          sunsetbeamLine,
          sunbeamLine,
          sunbeamBall,
        );
      }

      if (showMoon) {
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

        if (
          !celestialBodies.moonRiseSet.rise ||
          !celestialBodies.moonRiseSet.set
        ) {
          console.warn("Moon rise or set time is not available");
          return;
        }
        const moonrisePosition = calculateMoonPosition(
          lat,
          lng,
          celestialBodies.moonRiseSet.rise,
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
          `Moon rises ${celestialBodies.moonRiseSet.rise.getHours()}:${celestialBodies.moonRiseSet.rise.getMinutes().toString().padStart(2, "0")}`,
          { sticky: true, direction: "auto" },
        );

        const moonsetPosition = calculateMoonPosition(
          lat,
          lng,
          celestialBodies.moonRiseSet.set,
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
          `Moon sets ${celestialBodies.moonRiseSet.set.getHours()}:${celestialBodies.moonRiseSet.set.getMinutes().toString().padStart(2, "0")}`,
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

        const rise = `${celestialBodies.moonRiseSet.rise.getHours()}:${celestialBodies.moonRiseSet.rise.getMinutes().toString().padStart(2, "0")}`;
        const set = `${celestialBodies.moonRiseSet.set.getHours()}:${celestialBodies.moonRiseSet.set.getMinutes().toString().padStart(2, "0")}`;
        setMoonTimes({ rise, set });

        moonLayer.push(
          moonCircle,
          shadedArea,
          moonriseLine,
          moonsetLine,
          moonbeamLine,
          moonbeamBall,
        );
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
