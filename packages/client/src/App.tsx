import React from "react";
import { useEffect, useState, useRef } from "react";
import "./App.css";
import {
  Grid2 as Grid,
  Switch,
  Fab,
  ButtonGroup,
  Button,
  ThemeProvider,
  Tooltip,
  Typography,
} from "@mui/material";
import TerrenderCanvas from "./components/TerrenderCanvas";
import LeafletMap, { positionZurich, Marker } from "./components/LeafletMap";
import DayTimeSlider from "./components/DayTimeSlider";
import Calendar from "./components/Calendar";
import SearchField from "./components/SearchField";
import CelestialBodiesLeaflet from "./components/CelestialBodiesLeaflet";
import ElevationSlider from "./components/ElevationSlider";
import VisibilitySlider from "./components/VisibilitySlider";
import {
  WbSunny as SunIcon,
  Bedtime as MoonIcon,
  Tune as TuneIcon,
} from "@mui/icons-material";
import DTLSave from "./components/DTLSave";
import DTLLoadDelete, { Plan } from "./components/DTLLoadDelete";
import PhotoFeatures from "./components/PhotoFeatures";
import { sunTheme, moonTheme } from "./components/Utils/ColorThemes";
import { tooltipTheme } from "./components/Utils/TooltipTheme";

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
  const [markers, setMarkers] = useState<Marker[]>([
    {
      id: self.crypto.randomUUID(),
      name: "Zurich",
      position: positionZurich,
      searchLocation: positionZurich,
    },
  ]);
  const [landmark, setLandmark] = useState<L.LatLngExpression>();
  const MAX_MARKER = 10;

  /** By default Date on Calendar is set to current date.
   *  By default Time on TimeSlider is rounded in 10' decrements => 19:36 yields 19:40, 19
   */
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const initialSliderTime = currentHour * 6 + Math.round(currentMinute / 10);
  const [selectedDate, setSelectedDate] = useState<Date>(now);
  const [sliderTime, setSliderTime] = useState<number>(initialSliderTime);

  /** Information for buttons controlling if sun/moon content rendered on Leaflet map */
  const [showSun, setShowSun] = useState(true);
  const [showMoon, setShowMoon] = useState(true);

  /** Accordion information for sun and moon times */
  const initialSunTimes = {
    sunrise: "",
    sunset: "",
    goldenHourMorning: "",
    goldenHourEvening: "",
    blueHourMorning: "",
    blueHourEvening: "",
  };
  const [sunTimes, setSunTimes] = useState<{
    sunrise: string;
    sunset: string;
    goldenHourMorning: string;
    goldenHourEvening: string;
    blueHourMorning: string;
    blueHourEvening: string;
  }>(initialSunTimes);
  const initialMoonTimes = { rise: "", set: "" };
  const [moonTimes, setMoonTimes] = useState<{ rise: string; set: string }>(
    initialMoonTimes,
  );
  const initialMoonPhase = { phase: "" };
  const [isSupermoon, setIsSupermoon] = useState<boolean>(false);
  const [moonPhase, setMoonPhase] = useState<{ phase: string }>(
    initialMoonPhase,
  );

  /** Elevation slider */
  const [sliderElevation, setSliderElevation] = useState<number>(0);
  const [showElevationSlider, setShowElevationSlider] = useState(false);
  /** Get elevation data from Terrender */
  const [elevationCurrentCenter, setElevationCurrentCenter] =
    useState<number>(0);

  /** Visibility slider */
  const initialVisibilitySlider = 0;
  const [sliderVisibility, setSliderVisibility] = useState<number>(
    initialVisibilitySlider,
  );
  const [showVisibilitySlider, setShowVisibilitySlider] = useState(false);
  /** Tracking Top Down Mode Terrender. Visibility feature only available when not top down. */
  const [toggledTopDown, setToggledTopDown] = useState<boolean>(false);

  /** DTL Plans */
  const [savedPlans, setSavedPlans] = useState<Plan[]>([]);

  if (error) console.warn(error);

  /** Fetch ClientConfig from Server -> result of processClientConfig */
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/config");
        if (!response.ok) {
          throw new Error(`HTTP error, status: ${response.status}`);
        }
        const data: ClientConfig = await response.json();
        setClientConfig(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unknown config error");
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

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: "0.25em",
          right: "0.625em",
          zIndex: 600,
        }}
      >
        <ThemeProvider theme={tooltipTheme}>
          <Tooltip
            title={
              <>
                <Typography>
                  Toggle Search Location, <br /> Calendar and Time Slider.
                </Typography>
              </>
            }
            arrow
          >
            <Switch
              checked={isDTLVisible}
              onChange={handleToggle}
              size="medium"
            />
          </Tooltip>
        </ThemeProvider>
      </div>
      {/* UI DTL */}
      {isDTLVisible && (
        <Grid
          spacing={1}
          container
          sx={{
            maxHeight: "20vh",
            width: "100%",
            position: "absolute",
            top: "0em",
            left: "0em",
            zIndex: 500,
            backgroundColor: "rgba(60,60,60,0.9)",
            borderBottom: "2px solid rgba(30,30,30,0.9)",
          }}
        >
          <Grid
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
            size={{ xs: 12, md: 3 }}
          >
            <SearchField
              map={mapRef.current}
              setCenter={setLandmark}
              setMarkers={setMarkers}
              maxMarkers={MAX_MARKER}
            />
          </Grid>
          <Grid
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              zIndex: 500,
            }}
            size={{ xs: 12, md: 3 }}
          >
            <Calendar selectedDate={selectedDate} onChange={setSelectedDate} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <DayTimeSlider value={sliderTime} onChange={setSliderTime} />
          </Grid>
        </Grid>
      )}
      <Grid
        sx={{
          position: "absolute",
          top: "0.25em",
          right: "0.625em",
          zIndex: 2500,
          display: "flex",
          flexDirection: "column-reverse",
          justifyContent: "center",
        }}
      ></Grid>
      {/* Map container */}
      <Grid spacing={1} container height={"100%"}>
        <Grid
          container
          size={{ xs: 12, md: 6 }}
          sx={{ overflow: "hidden", position: "relative" }}
        >
          {/* Leaflet Map */}
          <LeafletMap
            mapRef={mapRef}
            landmark={landmark}
            markers={markers}
            setMarkers={setMarkers}
            setCenter={setLandmark}
          />
          {/* Sun/Moon Position on Leaflet Map */}
          <CelestialBodiesLeaflet
            mapRef={mapRef}
            landmark={landmark}
            date={selectedDate}
            time={sliderTime}
            showSun={showSun}
            showMoon={showMoon}
            setSunTimes={setSunTimes}
            setMoonTimes={setMoonTimes}
            setMoonPhase={setMoonPhase}
            setIsSupermoon={setIsSupermoon}
          />
          <div
            style={{
              width: "100%",
              height: "100%",
              zIndex: 400,
              position: "absolute",
              pointerEvents: "none",
            }}
          >
            <Grid container>
              {/* Spacer when DTL UI visible */}
              <Grid
                size={{ xs: 12 }}
                sx={{ height: isDTLVisible ? "6em" : "0.75em" }}
              />
              {/* Save/Load/Delete DTL Plan */}
              <Grid
                size={{ xs: 3 }}
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  paddingLeft: "1em",
                  gap: "0.5em",
                  pointerEvents: "all",
                }}
              >
                <DTLSave
                  landmark={landmark}
                  date={selectedDate}
                  time={sliderTime}
                  setSavedPlans={setSavedPlans}
                />
                <DTLLoadDelete
                  setCenter={setLandmark}
                  setSelectedDate={setSelectedDate}
                  setSliderTime={setSliderTime}
                  savedPlans={savedPlans}
                  setSavedPlans={setSavedPlans}
                />
              </Grid>
              <Grid size={{ xs: 6 }} />
              <Grid
                id="PhotoFeatures"
                sx={{
                  paddingRight: "1em",
                  display: "flex",
                  alignItems: "end",
                  flexDirection: "column",
                  pointerEvents: "all",
                }}
                size={{ xs: 3 }}
              >
                {/* Show/Hide Sun/Moon */}
                <ButtonGroup
                  orientation="vertical"
                  aria-label="SunAndMoonControls"
                  variant="contained"
                  size="small"
                  color="info"
                  sx={{ width: "50%" }}
                >
                  <ThemeProvider theme={sunTheme}>
                    <Button onClick={() => setShowSun(!showSun)}>
                      {showSun ? "Hide " : "Show "}&nbsp;&nbsp;
                      <SunIcon />
                    </Button>
                  </ThemeProvider>
                  <ThemeProvider theme={moonTheme}>
                    <Button onClick={() => setShowMoon(!showMoon)}>
                      {showMoon ? "Hide " : "Show "}&nbsp;&nbsp;
                      <MoonIcon />
                    </Button>
                  </ThemeProvider>
                </ButtonGroup>

                {/* PhotoFeatures */}
                <PhotoFeatures
                  sunTimes={sunTimes}
                  moonTimes={moonTimes}
                  isSupermoon={isSupermoon}
                  moonPhase={moonPhase}
                />
              </Grid>
            </Grid>
          </div>
        </Grid>
        {/* TerrenderCanvas */}
        <Grid
          container
          size={{ xs: 12, md: 6 }}
          sx={{ position: "relative", maxHeight: "100%", overflow: "hidden" }}
        >
          {clientConfig ? (
            <>
              <TerrenderCanvas
                config={clientConfig}
                landmark={landmark}
                time={sliderTime}
                date={selectedDate}
                sliderElevation={sliderElevation}
                sliderVisibility={sliderVisibility}
                toggledTopDown={toggledTopDown}
                setToggledTopDown={setToggledTopDown}
                setElevationCurrentCenter={setElevationCurrentCenter}
                elevationCurrentCenter={elevationCurrentCenter}
              />
              <ThemeProvider theme={tooltipTheme}>
                <Tooltip
                  title={
                    <>
                      <Typography>
                        Toggle Elevation and Visibility Sliders
                      </Typography>
                    </>
                  }
                  arrow
                  placement="left"
                >
                  <Fab
                    aria-label="Elevation/Visibility"
                    onClick={handleFabClick}
                    sx={{
                      color: "#fff",
                      backgroundColor: "#878787",
                      position: "absolute",
                      bottom: 60,
                      right: "1em",
                      zIndex: 1500,
                      border: "2px solid",
                      borderColor: "grey.700",
                      "&:hover": {
                        boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.7)",
                        transition: "all 0.2s ease-in-out",
                      },
                    }}
                  >
                    <TuneIcon />
                  </Fab>
                </Tooltip>
              </ThemeProvider>
            </>
          ) : (
            <div>Loading config</div>
          )}
          {error ? <div>Error: {error}</div> : null}
          <div
            style={{
              width: "100%",
              height: "100%",
              zIndex: 400,
              position: "absolute",
              pointerEvents: "none",
            }}
          >
            <Grid
              container
              spacing={1}
              sx={{ height: "100%", alignContent: "flex-start" }}
            >
              {/* Spacer when DTL UI visible */}
              <Grid
                size={{ xs: 12 }}
                sx={{ height: isDTLVisible ? "6em" : "1.5em" }}
              />
              {/* UI Elevation/Visibility Sliders */}
              <Grid
                size={{ xs: 2 }}
                sx={{
                  paddingLeft: "3.5em",
                  paddingTop: "0.8em",
                  height: "60%",
                  "& > *": { pointerEvents: "all" },
                }}
              >
                {showElevationSlider && !toggledTopDown && (
                  <ElevationSlider
                    value={sliderElevation}
                    onChange={setSliderElevation}
                    elevationCurrentCenter={elevationCurrentCenter}
                  />
                )}
              </Grid>
              <Grid
                size={{ xs: 10 }}
                sx={{
                  paddingRight: "3.5em",
                  paddingTop: "0.8em",
                  "& > *": { pointerEvents: "all" },
                }}
              >
                {showVisibilitySlider && !toggledTopDown && (
                  <VisibilitySlider
                    value={sliderVisibility}
                    onChange={setSliderVisibility}
                    landmark={landmark}
                    selectedDate={selectedDate}
                    sliderTime={sliderTime}
                  />
                )}
              </Grid>
            </Grid>
          </div>
        </Grid>
      </Grid>
    </>
  );
};

export default App;
