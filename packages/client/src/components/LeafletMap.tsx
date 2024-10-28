import React, {useEffect, useState, useRef, Dispatch, SetStateAction } from 'react';
import { LayerGroup, LayersControl, MapContainer, Marker, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import L, { LatLngExpression, Tooltip } from 'leaflet';
import LocationPin from './LocationPin';
import { Button, Snackbar, Typography } from '@mui/material';

export type Marker = {
  id: string;
  name:string;
  position:  L.LatLngExpression
}

export interface LeafletMapSetterProps {
  mapRef: React.MutableRefObject<L.Map | null>;
  center?: L.LatLngExpression;
  setCenter: React.Dispatch<React.SetStateAction<LatLngExpression | undefined>>;
  markers: Marker[];
}

export interface LeafletMapProps extends LeafletMapSetterProps  {
  setMarkers: React.Dispatch<React.SetStateAction<Marker[]>>;
}


/** Setting the mapRef.current to the map object, making the map accessible from other components.  */
const MapSetter = ({mapRef, center, setCenter, markers}: LeafletMapSetterProps) => {
  const map = useMap();
  const markerLayerRef = useRef<L.Marker[]>([]);
  useEffect(() => {
    mapRef.current = map;
    setCenter(map.getCenter());
  }, [map]);

  /** Runs whenever center changes. Updates map view to the center -> e.g. moving to the location passed over the SearchField. */ 
  useEffect(() => {
    if (center) map.setView(center, 13);
  }, [center]);

  /** Runs whenever markers changes -> adding new marker of the specified position to the markers array.
   *  Keeps track of markers using markerLayerRef in order to enable deleting by clicking onto marker.
   *  For that on each useEffect all existing markers are removed (full layer removal), then the still existing markers are added to the map.
   */
  useEffect(()=> {
    markerLayerRef.current.forEach(marker => {
      marker.remove();
    });

    markerLayerRef.current = [];

    const newMarkers = markers.map((marker) => {
      const newMarker = L.marker(marker.position).addTo(map);
      return newMarker;
    });

    markerLayerRef.current = newMarkers;
  }, [markers])

  return null;
}

export const positionZurich : L.LatLngExpression = [47.3744489, 8.5410422];

/** Helper function when Marker is clicked where marker.position === center */
const zoom = (position: L.LatLngExpression, mapRef: React.MutableRefObject<L.Map | null>) => {
  if (mapRef.current) {
    mapRef.current.setView(position, 13);
  }
};

/**
 * @returns LeafletMap
 * Basic setup for dynamic map using leaflet library and openstreep map as TileLayer:
 * * https://leafletjs.com/reference.html
 * * https://www.openstreetmap.org
*/
const LeafletMap: React.FC<LeafletMapProps> = ({ mapRef, center, markers, setCenter, setMarkers}, ) => {
  /** Logic for deleting a preexisting marker. */
  const [inDeletionMode, setDeletionMode] = useState(false);
  const [openSnackbarDel, setOpenSnackbarDel] = useState(false);
  const [openSnackbarGoLocation, setOpenSnackbarGoLocation] = useState(false);
  const [saveDTL, setSaveDTL] = useState(false);
  const [openSnackbarDTL, setOpenSnackbarDTL] = useState(false);

  //TODO add method which saves DTL

  const deleteMarker = (markerId: string) => {
    setMarkers((prevMarkers) => prevMarkers.filter(marker => marker.id != markerId));
    setDeletionMode(false);
  };

  const handleMarkerClick = (markerId: string, markerPos: L.LatLngExpression) => {
    if (inDeletionMode) {
      deleteMarker(markerId);
    } else {
      setOpenSnackbarGoLocation(true);
      setCenter(markerPos);
      if (markerPos === center) {
        zoom(markerPos, mapRef);
    }
  }
  };

  /** Informing user on how to delete a marker. */
  const handleSnackbarClose = () => {
    if (openSnackbarDel)  {
      setOpenSnackbarDel(false);
    } else if (openSnackbarGoLocation) {
      setOpenSnackbarGoLocation(false);
    } else if (openSnackbarDTL) {
      setOpenSnackbarDTL(false);
    }
  };
  
  return (
    <MapContainer 
      style={{width: '100%', height: '100%'}}
      center={center||markers[0].position} 
      zoom={13} 
      zoomControl={false}
      scrollWheelZoom={true}
      >
      {/* Map Hooks */}
      <MapSetter mapRef={mapRef} center={center} setCenter={setCenter} markers={markers} />
      <LayersControl position='bottomright' >
        {/* Base Layers */}
        <LayersControl.BaseLayer checked name='World Imagery'>
          <TileLayer 
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer checked name='OpenStreetMap'>
          <TileLayer 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.osm.ch/switzerland/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        {/* Markers => Input from SearchField */}
        {markers.map(marker => (<LayersControl.Overlay key={marker.id} name={marker.name} checked>
          <Marker 
            position={marker.position}
            interactive={true}
            eventHandlers={
              {click: () => {
              handleMarkerClick(marker.id, marker.position);},}
            }
            >
          </Marker>
        </LayersControl.Overlay> ))}
      </LayersControl>
      {/* Draggable Marker */}
      <LocationPin />
      <ZoomControl position='bottomleft'/>
      {/* Deletion of Marker */}
      <Button variant='contained' color='info' onClick={() => {setDeletionMode(!inDeletionMode), setOpenSnackbarDel(true)}} size='small' style={{position: 'absolute', top: '110px', left: '1em', zIndex: '1000'}}>
            {inDeletionMode ? 'Cancel Delete' : 'Delete Marker'}
      </Button> 
      <Button variant='contained' color='info' onClick={() => {setSaveDTL(!saveDTL), setOpenSnackbarDTL(true)}} size='small' style={{position: 'absolute', top: '150px', left: '1em', zIndex: '1000'}}>
            {saveDTL ? 'Save DTL' : 'Save DTL'}
      </Button> 
      <Snackbar 
        open={openSnackbarDel}
        message={
          <Typography dangerouslySetInnerHTML={{ __html: 'To delete a marker click on the marker icon of the marker you want to remove.' }} />
        }
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      />
      <Snackbar 
        open={openSnackbarGoLocation}
        message={
          <Typography dangerouslySetInnerHTML={{ __html: 'Moving to location of clicked marker...<br /> If no movement occurs, please uncheck and recheck the checkbox of the Marker.' }} />
        }
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      />
      <Snackbar 
        open={openSnackbarDTL}
        message={
          <Typography dangerouslySetInnerHTML={{ __html: 'Saving current Date, Time and Location.' }} />
        }
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      />
    </MapContainer>
  );
};

export default LeafletMap;



