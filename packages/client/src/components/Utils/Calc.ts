import { LatLngExpression } from 'leaflet';
import SunCalc from 'suncalc';

/** Helper function to convert value of DayTimeSlider to Date */
export const convertDateTime = (date: Date, time: number) : Date => {
    const hour = Math.floor(time / 6);
    const minute = (time % 6) * 10;
    const dateTime = date;
    dateTime.setHours(hour, minute, 0);
    return dateTime;
};

/** Helper function to extract lat, lng from LatLngExpression */
export  const convertLatLngToCoords = (latLng: LatLngExpression): { lat: number; lng: number } => {
    let lat: number;
    let lng: number;

    if (!latLng) { throw new TypeError('Input latLng is undefined or null.')};

    if(Array.isArray(latLng)) {
      lat = latLng[0], 
      lng = latLng[1];
    } else if ('lat' in latLng && 'lng' in latLng) {
      lat = latLng.lat, 
      lng = latLng.lng;
    } else { throw new TypeError('Invalid LatLngExpression'); }
    return { lat, lng };
};

/** Helper function to extract sunrise/sunset times */
export const calculateSunriseSunset = (lat: number, lng: number, date: Date) : { sunrise: Date, sunset: Date} => {
  const times = SunCalc.getTimes(date, lat, lng);
  return { sunrise: times.sunrise, sunset: times.sunset };
}