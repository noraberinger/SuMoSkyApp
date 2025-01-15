/* In this file most utility functions, which are or at one point were used over multiple components, can be found */
import { LatLngExpression } from "leaflet";
import SunCalc from "suncalc";

/* Helper function to convert value of DayTimeSlider to Date */
export const convertDateTime = (date: Date, time: number): Date => {
  const hour = Math.floor(time / 6);
  const minute = (time % 6) * 10;

  const dateTime = new Date(date);
  dateTime.setHours(hour, minute, 0);
  return dateTime;
};

/* Helper function to extract lat, lng from LatLngExpression */
export const convertLatLngToCoords = (
  latLng: LatLngExpression,
): { lat: number; lng: number } => {
  let lat: number;
  let lng: number;

  if (!latLng) {
    throw new TypeError("Input latLng is undefined or null.");
  }

  if (Array.isArray(latLng)) {
    lat = latLng[0];
    lng = latLng[1];
  } else if ("lat" in latLng && "lng" in latLng) {
    lat = latLng.lat;
    lng = latLng.lng;
  } else {
    throw new TypeError("Invalid LatLngExpression");
  }
  return { lat, lng };
};

/* Helper function to extract sun times */
export const calculateSunTimes = (
  lat: number,
  lng: number,
  date: Date,
): {
  sunrise: Date;
  sunset: Date;
  goldenHourMorning: Date;
  goldenHourEvening: Date;
  blueHourMorning: Date;
  blueHourEvening: Date;
} => {
  const times = SunCalc.getTimes(date, lat, lng);
  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    goldenHourMorning: times.goldenHourEnd,
    goldenHourEvening: times.goldenHour,
    blueHourMorning: times.nauticalDawn,
    blueHourEvening: times.dusk,
  };
};

export const toRad = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

export const toDeg = (radians: number): number => {
  return (radians * 180) / Math.PI;
};

export const translateCoords = (
  lng: number,
  lat: number,
  distanceKm: number,
  headingDegrees: number,
): [number, number] => {
  const earthRadius = 6371;
  const distance = distanceKm;

  /* Convert to radians */
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);
  const heading = toRad(headingDegrees);

  /* Calculate new latitude */
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distance / earthRadius) +
      Math.cos(lat1) * Math.sin(distance / earthRadius) * Math.cos(heading),
  );

  /* Calculate new longitude */
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(heading) * Math.sin(distance / earthRadius) * Math.cos(lat1),
      Math.cos(distance / earthRadius) - Math.sin(lat1) * Math.sin(lat2),
    );

  /* Convert back to degrees */
  return [toDeg(lng2), toDeg(lat2)];
};

export const normalizeDegrees = (angle: number): number =>
  ((angle % 360) + 360) % 360;

/* Rotate around up vector of camera */
export const getTopDownUpVec = (direction: number) => {
  /* Compass direction in radians */
  const normalizedDeg = normalizeDegrees(direction);
  const angleRadians = toRad(normalizedDeg);

  return [Math.sin(angleRadians), Math.cos(angleRadians), 0];
};

/* Rotate camera around target */
export const calculateCamTarget = (
  direction: number,
  distance: number,
  z: number,
  position: number[],
) => {
  /* Compass direction in radians */
  const normalizedDeg = normalizeDegrees(direction);
  const angleInRadians = toRad(normalizedDeg);

  /* Movement of Camera, reflecting 360° rotation, with some distance */
  const newTargetX = position[0] + distance * Math.sin(angleInRadians);
  const newTargetY = position[1] + distance * Math.cos(angleInRadians);

  return [newTargetX, newTargetY, z];
};

/* Calculates current distance between Camera and Target */
export const positionTargetDistance = (
  position: number[],
  target: number[],
) => {
  const radius = Math.sqrt(
    (position[0] - target[0]) ** 2 + (position[1] - target[1]) ** 2,
  );
  return radius;
};
