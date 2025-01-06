import { LatLngExpression } from "leaflet";
import SunCalc from "suncalc";

/** Helper function to convert value of DayTimeSlider to Date */
export const convertDateTime = (date: Date, time: number): Date => {
  const hour = Math.floor(time / 6);
  const minute = (time % 6) * 10;

  const dateTime = new Date(date);
  dateTime.setHours(hour, minute, 0);
  return dateTime;
};

/** Helper function to extract lat, lng from LatLngExpression */
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

/** Helper function to extract sun times */
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

/** Helper function closing any Snackbar */
export const handleSnackbarClose = (
  snackbarStates: { [key: string]: boolean },
  setSnackbarStates: {
    [key: string]: React.Dispatch<React.SetStateAction<boolean>>;
  },
) => {
  Object.keys(snackbarStates).forEach((key) => {
    if (snackbarStates[key]) {
      setSnackbarStates[key](false);
    }
  });
};

const toRad = (degrees: number): number => {
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

  // Convert to radians
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);
  const heading = toRad(headingDegrees);

  // Calculate new latitude
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distance / earthRadius) +
      Math.cos(lat1) * Math.sin(distance / earthRadius) * Math.cos(heading),
  );

  // Calculate new longitude
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(heading) * Math.sin(distance / earthRadius) * Math.cos(lat1),
      Math.cos(distance / earthRadius) - Math.sin(lat1) * Math.sin(lat2),
    );

  // Convert back to degrees
  return [toDeg(lng2), toDeg(lat2)];
};

export const normalizeDegrees = (angle: number): number =>
  ((angle % 360) + 360) % 360;

/** Helper function Calculating the angle between two given angles */
export const getMiddleAngle = (angle1: number, angle2: number): number => {
  // Normalize angles to 0-360 range
  angle1 = normalizeDegrees(angle1);
  angle2 = normalizeDegrees(angle2);

  // Find shortest path
  const diff = (angle2 - angle1 + 360) % 360;

  // Calculate middle point
  const middle = (angle1 + diff / 2) % 360;

  return middle;
};

export const calculateTriangleLegs = (
  landmark: [number, number, number],
  angleAInRad: number,
  angleBInRad: number,
  distance: number,
): [[number, number, number], [number, number, number]] => {
  const p1: [number, number, number] = [
    landmark[0] + distance * Math.cos(angleAInRad - Math.PI),
    landmark[1] + distance * Math.sin(angleAInRad - Math.PI),
    landmark[2], // or use height @ new coords
  ];

  const p2: [number, number, number] = [
    landmark[0] + distance * Math.cos(angleBInRad - Math.PI),
    landmark[1] + distance * Math.sin(angleBInRad - Math.PI),
    landmark[2],
  ];

  return [p1, p2];
};
