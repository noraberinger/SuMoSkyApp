import React, {useEffect} from 'react';
import { LayersControl, MapContainer, Marker, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import LocationPin from './LocationPin';

export type Marker = {
  id: string;
  name:string;
  position:  L.LatLngExpression;
}

interface LeafletMapProps {
  mapRef: React.MutableRefObject<L.Map | null>;
  center: L.LatLngExpression;
  markers: Marker[];
}

const MapSetter = ({mapRef, center, markers}: LeafletMapProps) => {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map]);

  // sync center with map
  useEffect(() => {
    map.setView(center, 13);
  }, [center]);

  // sync markers with map
  useEffect(()=> {
    markers.forEach((marker) => {
      L.marker(marker.position).addTo(map);
    });

    // todo cleanup: remove old markers again
  }, [markers])

  return null;
}

export const positionZurich : L.LatLngExpression = [47.37, 8.53];


/**
 * @returns LeafletMap
 * Basic setup for dynamic map using leaflet library and openstreep map as TileLayer:
 * * https://leafletjs.com/reference.html
 * * https://www.openstreetmap.org
*/
const LeafletMap: React.FC<LeafletMapProps> = ({ mapRef, center, markers }) => {


  return (
    <MapContainer 
      style={{width: '100%', height: '100%'}}
      center={center} 
      zoom={18} 
      zoomControl={false}
      scrollWheelZoom={true}
      >
      <MapSetter mapRef={mapRef} center={center} markers={markers} />
      <TileLayer 
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.osm.ch/switzerland/{z}/{x}/{y}.png"
      />
      <LayersControl position='bottomright' >
        {markers.map(marker => (<LayersControl.Overlay key={marker.id} name={marker.name}>
          <Marker position={marker.position}>
          </Marker>
        </LayersControl.Overlay> ))}
      </LayersControl>
      <LocationPin />
      <ZoomControl position='bottomleft'/>
    </MapContainer>
  );
};

export default LeafletMap;



