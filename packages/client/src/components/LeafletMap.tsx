import React, { useEffect, useState, useRef } from "react";
import {
  LayersControl,
  MapContainer,
  Marker,
  TileLayer,
  ZoomControl,
  useMap,
  AttributionControl,
} from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import { Button, Snackbar, ThemeProvider, Alert, Portal } from "@mui/material";
import { handleSnackbarClose } from "./Utils/Calc";
import { functionalities } from "./Utils/ColorThemes";
import { Room as MarkerIcon } from "@mui/icons-material";

export type Marker = {
  id: string;
  name: string;
  position: L.LatLngExpression;
  searchLocation: L.LatLngExpression;
};

interface LeafletMapSetterProps {
  mapRef: React.MutableRefObject<L.Map | null>;
  landmark?: L.LatLngExpression;
  setCenter: React.Dispatch<React.SetStateAction<LatLngExpression | undefined>>;
  markers: Marker[];
}

interface LeafletMapProps extends LeafletMapSetterProps {
  setMarkers: React.Dispatch<React.SetStateAction<Marker[]>>;
}

/* Setting the mapRef.current to the map object, making the map accessible from other components.  */
const MapSetter = ({
  mapRef,
  landmark: center,
  setCenter,
  markers,
}: LeafletMapSetterProps) => {
  const map = useMap();
  const markerLayerRef = useRef<L.Marker[]>([]);
  useEffect(() => {
    mapRef.current = map;
    setCenter(map.getCenter());
  }, [map, mapRef, setCenter]);

  /* Runs whenever center changes. Updates map view to the current center respectively the selected landmark. */
  useEffect(() => {
    if (center) map.setView(center, 13);
  }, [center, map]);

  /** Runs whenever markers changes -> adding new marker of the specified position to the markers array.
   *  Keeps track of markers using markerLayerRef in order to enable deleting by clicking onto marker.
   *  For that on each useEffect all existing markers are removed (full layer removal), then the still existing markers are added to the map.
   */
  useEffect(() => {
    markerLayerRef.current.forEach((marker) => {
      marker.remove();
    });

    markerLayerRef.current = [];

    const newMarkers = markers.map((marker) => {
      const newMarker = L.marker(marker.position).addTo(map);
      return newMarker;
    });

    markerLayerRef.current = newMarkers;
  }, [markers, map]);

  return null;
};

export const positionZurich: L.LatLngExpression = [47.3744489, 8.5410422];

/** Helper function when Marker is clicked where marker.position === center */
const zoom = (
  position: L.LatLngExpression,
  mapRef: React.MutableRefObject<L.Map | null>,
) => {
  if (mapRef.current) {
    mapRef.current.setView(position, 13);
  }
};

/**
 * @returns LeafletMap
 * Basic setup for dynamic map using leaflet library and openstreet map as TileLayer:
 * * https://leafletjs.com/reference.html
 * * https://www.openstreetmap.org
 */
const LeafletMap: React.FC<LeafletMapProps> = ({
  mapRef,
  landmark: center,
  markers,
  setCenter,
  setMarkers,
}) => {
  const [inDeletionMode, setDeletionMode] = useState(false);
  const [openSnackbarDel, setOpenSnackbarDel] = useState(false);
  const [openSnackbarGoLocation, setOpenSnackbarGoLocation] = useState(false);
  const snackbarStates = { openSnackbarDel, openSnackbarGoLocation };
  const setSnackbarStates = {
    openSnackbarDel: setOpenSnackbarDel,
    openSnackbarGoLocation: setOpenSnackbarGoLocation,
  };

  const deleteMarker = (markerId: string) => {
    setMarkers((prevMarkers) =>
      prevMarkers.filter((marker) => marker.id != markerId),
    );
    setDeletionMode(false);
  };

  const handleMarkerClick = (
    markerId: string,
    markerPos: L.LatLngExpression,
    searchLocation: L.LatLngExpression,
  ) => {
    if (inDeletionMode) {
      deleteMarker(markerId);
    } else {
      setMarkers((prevMarkers) =>
        prevMarkers.map((m) =>
          m.id === markerId ? { ...m, position: m.searchLocation } : m,
        ),
      );

      setOpenSnackbarGoLocation(true);
      setCenter(searchLocation);

      if (searchLocation === center) {
        zoom(searchLocation, mapRef);
      }
    }
  };

  const triggerSnackbarClose = () =>
    handleSnackbarClose(snackbarStates, setSnackbarStates);

  return (
    <MapContainer
      style={{ width: "100%", height: "100%" }}
      center={center || markers[0].position}
      zoom={13}
      zoomControl={false}
      scrollWheelZoom={true}
      attributionControl={false}
    >
      {/* Map Hooks */}
      <MapSetter
        mapRef={mapRef}
        landmark={center}
        setCenter={setCenter}
        markers={markers}
      />
      {/* Attribution */}
      <AttributionControl position="bottomleft" prefix={false} />
      <div
        style={{
          position: "absolute",
          bottom: "0.5em",
          right: "0.9em",
          display: "flex",
          flexDirection: "column",
          gap: "0.25em",
          zIndex: 1000,
        }}
      >
        <LayersControl position="bottomright">
          {/* Base Layers */}
          <LayersControl.BaseLayer checked name="World Imagery">
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.osm.ch/switzerland/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          {/* Markers => Input from SearchField, as well as from DragEndEvent */}
          {markers.map((marker) => (
            <LayersControl.Overlay
              key={marker.id}
              name={marker.name}
              checked={true}
            >
              <Marker
                key={`${marker.id}-${JSON.stringify(marker.position)}`}
                position={marker.position}
                interactive={true}
                draggable={true}
                eventHandlers={{
                  click: () => {
                    handleMarkerClick(
                      marker.id,
                      marker.position,
                      marker.searchLocation,
                    );
                  },
                  dragend: (e) => {
                    const newPos = e.target.getLatLng();
                    setMarkers((prevMarkers) =>
                      prevMarkers.map((m) =>
                        m.id === marker.id
                          ? { ...m, position: [newPos.lat, newPos.lng] }
                          : m,
                      ),
                    );
                    setCenter([newPos.lat, newPos.lng]);
                  },
                }}
              ></Marker>
            </LayersControl.Overlay>
          ))}
        </LayersControl>
        <ZoomControl position="bottomleft" />
        {/* Deletion of Marker */}
        <ThemeProvider theme={functionalities}>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              setDeletionMode(!inDeletionMode);
              if (!inDeletionMode) setOpenSnackbarDel(true);
            }}
            size="small"
          >
            {inDeletionMode ? "Cancel Delete" : "Delete "}
            <MarkerIcon />
          </Button>
        </ThemeProvider>
      </div>
      <Snackbar
        open={openSnackbarDel}
        onClose={triggerSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={triggerSnackbarClose}
          severity="info"
          variant="filled"
          sx={{ width: "100%" }}
        >
          To delete a marker click on the marker icon of the marker you want to
          remove.
        </Alert>
      </Snackbar>
      <Portal>
        <Snackbar
          open={openSnackbarGoLocation}
          onClose={triggerSnackbarClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={triggerSnackbarClose}
            severity="info"
            variant="filled"
            sx={{ width: "100%" }}
          >
            Moving to location of clicked marker...
          </Alert>
        </Snackbar>
      </Portal>
    </MapContainer>
  );
};

export default LeafletMap;
