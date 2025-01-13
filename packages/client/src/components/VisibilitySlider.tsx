/* Data provided by Open-Meteo, licensed under CC-BY 4.0 */
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Slider, Snackbar, Alert, Typography, Portal } from "@mui/material";
import { LatLngExpression } from "leaflet";
import {
  convertDateTime,
  convertLatLngToCoords,
  handleSnackbarClose,
} from "./Utils/Calc";

interface VisibilitySliderProps {
  value: number;
  onChange: (value: number) => void;
  landmark: LatLngExpression | undefined;
  selectedDate: Date;
  sliderTime: number;
}

/** Logarithmic marks, distance will increase exponentially
 *  - Low values = small steps
 *  - High values = large steps
 */
const marks = [
  { value: 0, label: "0m" },
  { value: 0.5, label: "3m" },
  { value: 1, label: "10m" },
  { value: 1.3, label: "20m" },
  { value: 1.5, label: "30m" },
  { value: 1.7, label: "50m" },
  { value: 2, label: "100m" },
  { value: 2.3, label: "200m" },
  { value: 2.5, label: "300m" },
  { value: 2.7, label: "500m" },
  { value: 3, label: "1000m" },
  { value: 3.3, label: "2000m" },
  { value: 3.5, label: "3000m" },
  { value: 3.7, label: "5000m" },
  { value: 4, label: "10000m" },
].map((mark) => ({
  ...mark,
  label:
    mark.value % 1 === 0 || mark.value % 0.5 === 0
      ? mark.label
      : "" /* Only show labels for major marks */,
}));

function logToLinear(logValue: number) {
  if (logValue <= 0) {
    return 0;
  }
  return Math.log10(logValue / 10000) + 4;
}

function linearToLog(linearValue: number) {
  if (linearValue <= 0) {
    return 0;
  }
  return Math.pow(10, linearValue - 4) * 10000;
}

/* Converts the values into a string such that screen readers can make use of the numeric value of the slider. */
function valueText(value: number) {
  return `${Math.round(linearToLog(value))} m`;
}

/* Fetching of Visibility Forecast */
type VisibilityByHour = { [time: number]: number };

const openMeteoBaseURL = "https://api.open-meteo.com/v1/forecast";

const useVisibilityData = (
  latLng: LatLngExpression | undefined,
): VisibilityByHour | undefined => {
  const [visibilityData, setVisibilityData] = useState<VisibilityByHour>();
  const coords = latLng ? convertLatLngToCoords(latLng) : undefined;

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(
        `${openMeteoBaseURL}?latitude=${coords?.lat}&longitude=${coords?.lng}&hourly=visibility&forecast_days=16&format=json&timeformat=unixtime`,
      );
      const json = (await response.json()) as {
        hourly: { time: number[]; visibility: number[] };
      };

      setVisibilityData(
        Object.fromEntries(
          json.hourly.time.map((t, i) => [t, json.hourly.visibility[i]]),
        ),
      );
    };
    if (coords?.lat && coords?.lng) {
      fetchData();

      /* Refetch data every hour */
      const intervalId = setInterval(fetchData, 60 * 60 * 1000);
      return () => clearInterval(intervalId);
    }
  }, [coords?.lat, coords?.lng]);

  return visibilityData;
};

/* Visibility data interpolated */
const getVisibility = (
  visibility: VisibilityByHour | undefined,
  dateTime: Date,
): number | undefined => {
  /* Get epoch seconds for current time */
  const epochSeconds = Math.trunc(dateTime.valueOf() / 1000);

  /* Get the start of the current hour and next hour */
  const secondsPastHour = epochSeconds % (60 * 60);
  const currentHourEpoch = epochSeconds - secondsPastHour;
  const nextHourEpoch = currentHourEpoch + 60 * 60;

  /* Get visibility values for both hours */
  const currentHourVisibility = visibility?.[currentHourEpoch];
  const nextHourVisibility = visibility?.[nextHourEpoch];

  /* Handle cases where one or both values are missing */
  if (currentHourVisibility === undefined && nextHourVisibility === undefined) {
    return undefined;
  }
  if (currentHourVisibility === undefined) {
    return nextHourVisibility;
  }
  if (nextHourVisibility === undefined) {
    return currentHourVisibility;
  }

  /* Calculate interpolation factor from 0 (start of hour) to 1 (end of hour) */
  const interpolationFactor = secondsPastHour / (60 * 60);

  /* Perform linear interpolation */
  return (
    currentHourVisibility +
    (nextHourVisibility - currentHourVisibility) * interpolationFactor
  );
};

/**
 * @returns VisibilitySlider
 * Allowing user to range over different visibility settings (depth = +z-axis).
 * Makes use of @mui Slider component:
 * * https://mui.com/material-ui/react-slider/
 */
const VisibilitySlider: React.FC<VisibilitySliderProps> = ({
  value,
  onChange,
  landmark,
  selectedDate,
  sliderTime,
}) => {
  const [openSnackbarNoForecast, setOpenSnackbarNoForecast] = useState(false);
  const snackbarStates = { openSnackbarForecast: openSnackbarNoForecast };
  const setSnackbarStates = { openSnackbarForecast: setOpenSnackbarNoForecast };
  const isMounted = useRef(false);

  const handleChange = (_: Event, newValue: number | number[]) => {
    onChange(linearToLog(newValue as number));
  };

  /* Params for fetch */
  const currentTime = convertDateTime(selectedDate, sliderTime);
  const visibility = useVisibilityData(landmark);

  /* Snackbar Handling, trigger Snackbar when no forecast available */
  const triggerSnackbarClose = () => {
    handleSnackbarClose(snackbarStates, setSnackbarStates);
  };

  const visibilityValue = useMemo(
    () => getVisibility(visibility, currentTime),
    [visibility, currentTime],
  );

  useEffect(() => {
    if (isMounted.current) {
      if (!visibilityValue) {
        setOpenSnackbarNoForecast(true);
      }
    } else {
      isMounted.current = true;
    }
  }, [visibilityValue]);

  return (
    <>
      <Slider
        size="small"
        track={false}
        value={logToLinear(value)}
        onChange={handleChange}
        marks={marks}
        min={0}
        max={4}
        step={0.01}
        getAriaValueText={valueText}
        valueLabelDisplay={"on"}
        valueLabelFormat={valueText}
        sx={(theme) => ({
          borderLeft: "12px solid rgb(30,30,30)",
          borderRight: "12px solid rgb(30,30,30)",
          backgroundColor: "rgb(30,30,30)",
          "& .MuiSlider-root": {
            backgroundColor: theme.palette.primary.light,
          },
          "& .MuiSlider-markLabel": {
            color: "white",
          },
        })}
      />
      {visibilityValue && (
        <div style={{ color: "white", marginTop: "1em" }}>
          <Typography>
            Current Visibility Distance: {Math.round(visibilityValue)}m
          </Typography>
        </div>
      )}
      <Portal>
        <Snackbar
          open={openSnackbarNoForecast}
          onClose={triggerSnackbarClose}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={triggerSnackbarClose}
            severity="warning"
            variant="filled"
            sx={{ width: "100%" }}
          >
            Forecast available for 16 days. For your selected date no forecast
            data available.
          </Alert>
        </Snackbar>
      </Portal>
    </>
  );
};

export default VisibilitySlider;
