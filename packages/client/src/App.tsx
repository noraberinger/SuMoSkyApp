import React from 'react';
import { useEffect, useState, useRef} from 'react';
import './App.css';
import { Grid2 as Grid } from '@mui/material';
import TerrenderCanvas from './components/TerrenderCanvas';
import LeafletMap, {positionZurich, Marker} from './components/LeafletMap';
import DayTimeSlider from './components/DayTimeSlider';
import Calendar from './components/Calendar';
import SearchField from './components/SearchField';

interface ClientConfig {
  tileSideLength?: number;
  boundaries?: number[];
  estMaxHeight?: number;
  xStart?: number;
  yStart?: number;
  maxLod?: number;
  kPatchBase?: number;
  currentLod?: number;
  errorThreshold?: number;
  useCullingMetric?: boolean;
  useDistanceMetric?: boolean;
  useMinMaxForErrors?: boolean;
  maxGpuCache?: number;
  maxRamCache?: number;
  colorIsTiff?: boolean;
  colorIsJpeg?: boolean;
  heightIsTiff?: boolean;
  noColorTextures?: boolean;
  dynamicBinTreeUpdate?: boolean;
  dynamicBinTreeUpdateTreeLengthRatio?: number;
  dynamicBinTreeUpdateNotReadyRatio?: number;
  useGeomMetric?: boolean;
  initialCamera?: object;
  dollyCam?: object[];
}



/**
 * Fetch ClientConfig from Server -> result of processClientConfig
*/ 
const App: React.FC = () => {
  const [clientConfig, setClientConfig] = useState<ClientConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const [markers, setMarkers] = useState<Marker[]>([{id: self.crypto.randomUUID(), name: 'Zurich', position: positionZurich}]);
  const [center, setCenter] = useState(positionZurich);

  console.log('markers', markers, 'center', center);
  if (error) console.log(error);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/config');
        if (!response.ok){
          throw new Error(`HTTP error, status: ${response.status}`);
        }
        const data: ClientConfig = await response.json();
        setClientConfig(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        }
        else {
          setError('Unknown config error');
        }
      }
    };

    fetchConfig();
  }, []);

  return (
    <>
    <Grid spacing={1} container sx={{ maxHeight: '20vh', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1000, backgroundColor: 'rgba(60,60,60,0.6)'}}>
    {/* UI */}
    <Grid sx={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}} size={{xs:12, md:3}}>
      <SearchField map={mapRef.current} setMarkers={setMarkers} setCenter={setCenter} />
    </Grid>
    <Grid sx={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}} size={{xs:12, md:3}}>
      <Calendar/>
    </Grid>
    <Grid size={{xs:12, md:6}}>
      <DayTimeSlider/>
    </Grid>
  </Grid>
    {/* height set to 120%. 
      * There seems to be some Overflow from the LeafletMap. 
      * When the height < 120% a gap in the tiling can be seen when scrolling down to observe the bottom of the map container. */}
    <Grid spacing={1} container height={'120%'}>
      {/* Maps */}
      <Grid  size={{xs:12, md:6}}>
        <LeafletMap mapRef={mapRef} center={center} markers={markers} />
      </Grid>
      <Grid size={{xs:12, md:6}}>
          {clientConfig? <TerrenderCanvas config={clientConfig} />: <div>Loading config</div>}
          {error? <div>Error: {error}</div>:null}
      </Grid>
    </Grid>
    </>
  );
};

export default App;
