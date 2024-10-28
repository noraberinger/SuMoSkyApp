import React, { ChangeEvent, useMemo } from 'react';
import { useEffect, useState, useRef} from 'react';
import './App.css';
import { Grid2 as Grid, Switch, Fab, ButtonGroup, Button, Accordion, AccordionDetails, AccordionSummary, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import TerrenderCanvas from './components/TerrenderCanvas';
import LeafletMap, {positionZurich, Marker} from './components/LeafletMap';
import DayTimeSlider from './components/DayTimeSlider';
import Calendar from './components/Calendar';
import SearchField from './components/SearchField';
import SunMoonPositionCalc from './components/SunMoonPositionCalc';
import ElevationSlider from './components/ElevationSlider';
import VisibilitySlider from './components/VisibilitySlider';
import { ExpandMore as ExpandMoreIcon, WbSunny as SunIcon, Bedtime as MoonIcon } from '@mui/icons-material';
import Sun from './components/Utils/Sun';

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
  
  /** Information for buttons controlling if sun/moon content rendered on Leaflet map */
  const [showSun, setShowSun] = useState(true);
  const [showMoon, setShowMoon] = useState(true);

  /** Accordion information for sun and moon times */
  const initialSunTimes = { sunrise: '', sunset: '', goldenHourMorning: '', goldenHourEvening: '', blueHourMorning: '', blueHourEvening: ''};
  const [sunTimes, setSunTimes] = useState<{ sunrise: string, sunset: string; goldenHourMorning: string; goldenHourEvening: string; blueHourMorning: string; blueHourEvening: string}>(initialSunTimes);
  const initialMoonTimes = { rise: '', set: ''};
  const [moonTimes, setMoonTimes] = useState<{ rise: string, set: string; }>(initialMoonTimes);
  const initialMoonPhase = { phase: '' };
  const [isSupermoon, setIsSupermoon] = useState<boolean>(false);
  const [moonPhase, setMoonPhase] = useState<{ phase: string }>(initialMoonPhase);
  const [expandedSunAccordion, setExpandedSunAccordion] = useState(false);
  const [expandedMoonAccordion, setExpandedMoonAccordion] = useState(false);

  /** Elevation slider */
  //TODO connect with actual height of TerrenderCanvas => take that as initial elevation
  const initialElevationSlider = 0;
  const [sliderElevation, setSliderElevation] = useState<number>(initialElevationSlider);
  const [showElevationSlider, setShowElevationSlider] = useState(false);

  /** Visibility slider */
  const initialVisibilitySlider = 0;
  const [sliderVisibility, setSliderVisibility] = useState<number>(initialVisibilitySlider);
  const [showVisibilitySlider, setShowVisibilitySlider] = useState(false);

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

  const handleFabClick = () => {
    setShowElevationSlider(!showElevationSlider);
    setShowVisibilitySlider(!showVisibilitySlider);
  };

  const handleAccordionToggle = (type: string) => {
    if (type === 'sun') {
      setExpandedSunAccordion(!expandedSunAccordion);
    } else if (type === 'moon') {
      setExpandedMoonAccordion(!expandedMoonAccordion);
    }
  };

  const getAmPm = (timeString: string) => {
    const [hours] = timeString.split(':');
    const hour = parseInt(hours, 10);
    return hour < 12 ? 'AM' : 'PM';
  }

  return (
    <>
    {/* UI */}
    {isDTLVisible && (
    <Grid spacing={1} container sx={{ maxHeight: '20vh', width: '100%', position: 'absolute', top: '0em', left: '0em', zIndex: 1600, backgroundColor: 'rgba(60,60,60,0.6)'}}>
      <Grid sx={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}} size={{xs:12, md:3}}>
        <SearchField map={mapRef.current} setCenter={setCenter} setMarkers={setMarkers} maxMarkers={MAX_MARKER} />
      </Grid>
      <Grid sx={{display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 1600}} size={{xs:12, md:3}}>
        <Calendar selectedDate={selectedDate} onChange={setSelectedDate} />
      </Grid>
      <Grid size={{xs:12, md:6}}>
        <DayTimeSlider value={sliderTime} onChange={setSliderTime}/>
      </Grid>
    </Grid>
    )}
    <Grid sx={{ position: 'absolute', top: '0.25em', right: '0.625em', zIndex: 2500, display: 'flex', flexDirection: 'column-reverse', justifyContent: 'center' }}>
        <Switch checked={isDTLVisible} onChange={handleToggle} size='medium'/>
    </Grid>
    { /* Map container */}
    <Grid spacing={1} container height={'100%'}> 
      <Grid  size={{xs:12, md:6}}>
        <LeafletMap mapRef={mapRef} center={center} markers={markers} setMarkers={setMarkers} setCenter={setCenter} isDTLVisible={isDTLVisible}/>
        <Grid id="sunMoonPositionCalc" style={{position: 'absolute', zIndex: 1500}}>
          <SunMoonPositionCalc mapRef={mapRef} center={center} date={selectedDate} time={sliderTime} setPositionSun={setPositionSun} setPositionMoon={setPositionMoon} showSun={showSun} showMoon={showMoon} setSunTimes={setSunTimes} setMoonTimes={setMoonTimes} setMoonPhase={setMoonPhase} setIsSupermoon={setIsSupermoon}/>
        </Grid>
        <Grid sx={{ position: 'absolute', display: 'flex', zIndex: 1500, top: isDTLVisible ? '5.65em' : '0.3em', left: '52em' }}>
            <ButtonGroup orientation='vertical' aria-label='SunAndMoonControls' variant='contained' color='info' size='small'>
                <Button onClick={() => setShowSun(!showSun)}>{showSun ? 'Hide ' : 'Show '}<SunIcon/></Button>
                <Button onClick={() => setShowMoon(!showMoon)}>{showMoon ? 'Hide ' : 'Show '}<MoonIcon/></Button>
            </ButtonGroup>
        </Grid>
        <Grid sx={{ position: 'absolute', display: 'flex', zIndex: 1600, top: isDTLVisible ? '10.025em' : '4.675em', left: '44.2em' }}>
          <Accordion expanded={expandedSunAccordion} onChange={() => handleAccordionToggle('sun')} sx={{ boxShadow: 'none', width: '13em', height: '1.875em', '& .MuiAccordionSummary-root': { backgroundColor: 'info.main', paddingLeft: '0.5em',}, '& .MuiAccordionDetails-root': { padding: '0em'}, '& .MuiTypography-root': { color: 'white', background: 'rgb(2, 136, 209)', fontSize: '0.85rem', fontWeight: 'bold', lineHeight: 'normal'},}}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="SunTimes" id="SunTimes">
              <Typography>SUN TIMES</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Start Blue Hour AM: {sunTimes.blueHourMorning} {getAmPm(sunTimes.blueHourMorning)}<br />
                Sunrise: {sunTimes.sunrise} {getAmPm(sunTimes.sunrise)}<br />
                End Golden Hour AM: {sunTimes.goldenHourMorning} {getAmPm(sunTimes.goldenHourMorning)}<br />
                Start Golden Hour PM: {sunTimes.goldenHourEvening} {getAmPm(sunTimes.goldenHourEvening)}<br />
                Sunset: {sunTimes.sunset} {getAmPm(sunTimes.sunset)}<br />
                Start Blue Hour PM: {sunTimes.blueHourEvening} {getAmPm(sunTimes.blueHourEvening)}
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Grid>
        <Grid sx={{ position: 'absolute', display: 'flex', zIndex: 1500, top: isDTLVisible ? '13.175em' : '7.825em', left: '44.2em' }}>
          <Accordion expanded={expandedMoonAccordion} onChange={() => handleAccordionToggle('moon')} sx={{ boxShadow: 'none', width: '13em', height: '1.875em', '& .MuiAccordionSummary-root': { backgroundColor: 'info.main', paddingLeft: '0.5em',}, '& .MuiAccordionDetails-root': { padding: '0em'}, '& .MuiTypography-root': { color: 'white', background: 'rgb(2, 136, 209)', fontSize: '0.85rem', fontWeight: 'bold', lineHeight: 'normal'},}}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="MoonTimes" id="MoonTimes">
              <Typography>MOON TIMES</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Rise: {moonTimes.rise} {getAmPm(moonTimes.rise)}<br />
                Set: {moonTimes.set} {getAmPm(moonTimes.set)}<br />
                Moon Phase: {moonPhase.phase}<br />
                {isSupermoon ? 'Supermoon' : ''}
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid> 
      <Grid size={{ xs: 12, md: 6 }} sx={{ position: 'relative', maxHeight: "100%", overflow: "hidden"}}>
        {clientConfig ? (
          <>
            <TerrenderCanvas config={clientConfig} center={center} time={sliderTime} date={selectedDate} positionSun={positionSun} positionMoon={positionMoon} />
            <Fab color='info' aria-label='Elevation/Visibility' onClick={handleFabClick} sx={{ position: 'absolute', bottom: 60, right: '1em', zIndex: 1500 }}>
                <TuneIcon />
            </Fab>
          </>
        ) : (
          <div>Loading config</div>
        )}
        {error ? <div>Error: {error}</div> : null}
        
      </Grid>
      <Grid sx={{ position: 'absolute', bottom: '3em', left: '58em', top: isDTLVisible ? '5.25em' : '0em', height: isDTLVisible ? '90.9%' : '100%', zIndex: 2000, display: 'flex', alignItems: 'center', backgroundColor: 'rgba(60,60,60,0.6)', overflow: "visible"}}>
              {showElevationSlider && (
                <ElevationSlider value={sliderElevation} onChange={setSliderElevation}/>
              )}
            </Grid>
            <Grid sx={{ position: 'absolute', top: isDTLVisible ? '5.25em' : '0em', left: '66em', width: '50%', zIndex: 2000, display: 'flex', alignItems: 'center', backgroundColor: 'rgba(60,60,60,0.6)', overflow: 'hidden'}}>
              {showVisibilitySlider && (
                <VisibilitySlider value={sliderVisibility} onChange={setSliderVisibility}/>
              )}
            </Grid>
    </Grid>
    </>
  );
};

export default App;
