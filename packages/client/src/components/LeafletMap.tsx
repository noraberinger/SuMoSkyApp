import React from 'react';
import { LayersControl, MapContainer, Marker, TileLayer} from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import LocationPin from './LocationPin';

const LeafletMap: React.FC = () => {
  const positionZurich : LatLngExpression = [47.37, 8.53]

  return (
    <MapContainer 
    id="map" 
    center={positionZurich} 
    zoom={18} 
    style={{position: 'absolute'}}
    scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.osm.ch/switzerland/{z}/{x}/{y}.png"
      />
      <LayersControl position='topright'>
        <LayersControl.Overlay name='Zurich'>
          <Marker position={positionZurich}>
          </Marker>
        </LayersControl.Overlay>
      </LayersControl>
      <LocationPin />
    </MapContainer>
  );
};

export default LeafletMap;



