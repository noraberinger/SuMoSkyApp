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

/** Closing of any Snackbar */
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
