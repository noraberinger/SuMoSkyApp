import { LatLng, LatLngExpression } from 'leaflet';

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