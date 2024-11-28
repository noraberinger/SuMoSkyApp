import React, { useState, useEffect } from "react";
import L from "leaflet";
import { convertLatLngToCoords } from "./Utils/Calc";
import { Marker } from "./LeafletMap";

interface SamplerProps {
  elevation: number;
  center: L.LatLngExpression | undefined;
  setMarkers: React.Dispatch<React.SetStateAction<Marker[]>>;
}

//TODO: trace ray over terrain => e.g. moon position in sky has ray stretching over terrain, find first intersection point with terrain, depending on angle this intersection point is earlier (steep angle) or later
const Sampler: React.FC<SamplerProps> = ({ elevation, center, setMarkers }) => {
  const [sampledValidPositions, setSampledValidPositions] = useState<
    L.LatLng[]
  >([]);

  const samplePositions = (
    center: L.LatLngExpression | undefined,
    gridSize: number,
    distance: number,
  ): L.LatLng[] => {
    const positions: L.LatLng[] = [];
    const latArea = distance / gridSize;
    const lngArea = distance / gridSize;
    if (center) {
      const { lat, lng } = convertLatLngToCoords(center);

      for (let i = -gridSize / 2; i <= gridSize / 2; i++) {
        for (let j = -gridSize / 2; j <= gridSize / 2; j++) {
          const sampledLat = lat + i * latArea;
          const sampledLng = lng + j * lngArea;
          positions.push(new L.LatLng(sampledLat, sampledLng));
        }
      }
    }
    return positions;
  };

  useEffect(() => {
    const gridSize = 5;
    const distance = 0.01;
    const positions = samplePositions(center, gridSize, distance);

    //TODO if want different sampling
    const validPositions = positions;

    setSampledValidPositions(validPositions);
    const markers = sampledValidPositions.map((position) => ({
      lat: position.lat,
      lng: position.lng,
    }));

    //setMarkers(markers);
  }, [center, elevation, sampledValidPositions, setMarkers]);

  return null;
};

export default Sampler;
