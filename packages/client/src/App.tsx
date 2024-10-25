import React, { ChangeEvent } from 'react';
import { useEffect, useState, useRef} from 'react';
import './App.css';
import { Grid2 as Grid, Switch, FormControlLabel } from '@mui/material';
import TerrenderCanvas from './components/TerrenderCanvas';
import LeafletMap, {positionZurich, Marker} from './components/LeafletMap';
import DayTimeSlider from './components/DayTimeSlider';
import Calendar from './components/Calendar';
import SearchField from './components/SearchField';
import SunMoonPositionCalc from './components/SunMoonPositionCalc';

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

/** Main access point for the appliation */ 
const App: React.FC = () => {
  /** For client config and possible error messages when loading. */
  const [clientConfig, setClientConfig] = useState<ClientConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Toggle on/off DTL Features */
  const [isDTLVisible, setIsDTLVisible] = useState(true);

  /** Map reference => LeafletMap */
  const mapRef = useRef<L.Map | null>(null);

  /** For Marker functionality when accessed over SearchField.
   *  By default set to the position of Zurich. */
  const [markers, setMarkers] = useState<Marker[]>([{id: self.crypto.randomUUID(), name: 'Zurich', position: positionZurich}]);
  const [center, setCenter] = useState<L.LatLngExpression>();
  const MAX_MARKER = 10;

  /** By default Date on Calendar is set to current date.
   *  By default Time on TimeSlider is rounded in 10' decrements => 19:36 yields 19:40, 19
   */
  const now = new Date()
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const initialSliderTime = currentHour * 6 + Math.round(currentMinute/10);
  const [selectedDate, setSelectedDate] = useState<Date>(now);
  const [sliderTime, setSliderTime] = useState<number>(initialSliderTime);

  /** References to positionSun and positionMoon for TerrenderCanvas rendering */
  const initalPositionSun = { azimuth: 0, altitude: 0 };
  const [positionSun, setPositionSun] = useState<{ azimuth: number, altitude: number; }>(initalPositionSun);
  const initalPositionMoon = { azimuth: 0, altitude: 0 };
  const [positionMoon, setPositionMoon] = useState<{ azimuth: number, altitude: number; }>(initalPositionMoon);

  if (error) console.log(error);

  /** Fetch ClientConfig from Server -> result of processClientConfig */
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

  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsDTLVisible(event.target.checked);
  };

  return (
    <>
    {/* UI */}
    {isDTLVisible && (
    <Grid spacing={1} container sx={{ maxHeight: '20vh', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1000, backgroundColor: 'rgba(60,60,60,0.6)'}}>
      <Grid sx={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}} size={{xs:12, md:3}}>
        <SearchField map={mapRef.current} setCenter={setCenter} setMarkers={setMarkers} maxMarkers={MAX_MARKER} />
      </Grid>
      <Grid sx={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}} size={{xs:12, md:3}}>
        <Calendar selectedDate={selectedDate} onChange={setSelectedDate} />
      </Grid>
      <Grid size={{xs:12, md:6}}>
        <DayTimeSlider value={sliderTime} onChange={setSliderTime}/>
      </Grid>
    </Grid>
    )}
    <Grid sx={{ position: 'absolute', top: 4, right: 10, zIndex: 1500, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Switch checked={isDTLVisible} onChange={handleToggle} size='medium'/>
    </Grid>
    { /* Map container */}
    <Grid spacing={1} container height={'100%'}> 
      <Grid  size={{xs:12, md:6}}>
        <LeafletMap mapRef={mapRef} center={center} markers={markers} setMarkers={setMarkers} setCenter={setCenter} />
        <div id="sunMoonPositionCalc" style={{position: 'absolute', zIndex: 1000}}>
          <SunMoonPositionCalc mapRef={mapRef} center={center} date={selectedDate} time={sliderTime} setPositionSun={setPositionSun} setPositionMoon={setPositionMoon} />
        </div>
      </Grid>  
      <Grid size={{xs:12, md:6}} sx={{ maxHeight: "100%", overflow: "hidden" }}>
            {clientConfig? <TerrenderCanvas config={clientConfig} center={center} time={sliderTime} date={selectedDate} positionSun={positionSun} positionMoon={positionMoon} />: <div>Loading config</div>}
            {error? <div>Error: {error}</div>:null}
      </Grid>
    </Grid>
    </>
  );
};

export default App;
