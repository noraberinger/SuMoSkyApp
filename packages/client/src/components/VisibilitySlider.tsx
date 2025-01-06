//Data provided by Open-Meteo, licensed under CC-BY 4.0
import React, { useState, useEffect } from "react";
import { Slider, Snackbar, Alert, Typography } from "@mui/material";
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

/** Generating the marking of the slider which depict elevation above sea level in m up to 10000m */
const generateMarks = () => {
  const marks = [];
  for (let m = 0; m <= 10000; m += 1000) {
    marks.push({
      value: m,
      label: `${m}m`,
    });
  }
  return marks;
};

const marks = generateMarks();

/** Converts the values into a string such that screen readers can make use of the numeric value of the slider. */
function valueText(value: number) {
  return `${value} m`;
}

/** Fetching of Visibility Forecast */
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

      /** Refetch data every hour */
      const intervalId = setInterval(fetchData, 60 * 60 * 1000);
      return () => clearInterval(intervalId);
    }
  }, [coords?.lat, coords?.lng]);

  return visibilityData;
};

const getHourlyEpoch = (currentTime: Date) => {
  //TODO checkout linear interpolation
  const epochSeconds = Math.trunc(currentTime.valueOf() / 1000);

  const secondsPastHour = epochSeconds % (60 * 60);

  const roundedHourUp = epochSeconds + (60 * 60 - secondsPastHour);
  //const roundedHourDown = epochSeconds - secondsPastHour;
  //const ratio = secondsPastHour / (60 * 60);
  //const interpolated = roundedHourDown + ratio * (roundedHourUp - roundedHourDown);

  return roundedHourUp;
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
  const [openSnackbarForecast, setOpenSnackbarForecast] = useState(false);
  const snackbarStates = { openSnackbarForecast };
  const setSnackbarStates = { openSnackbarForecast: setOpenSnackbarForecast };

  /** Params for fetch */
  const currentTime = convertDateTime(selectedDate, sliderTime);
  const visibility = useVisibilityData(landmark);

  /** Snackbar Handling, trigger Snachbar when no forecast available */
  const triggerSnackbarClose = () => {
    handleSnackbarClose(snackbarStates, setSnackbarStates);
  };

  const noVisibilityValue =
    visibility && !visibility[getHourlyEpoch(currentTime)];
  useEffect(() => {
    if (noVisibilityValue) {
      setOpenSnackbarForecast(true);
    }
  }, [noVisibilityValue]);

  return (
    <>
      <Slider
        size="small"
        track={false}
        value={value}
        onChange={(e, newValue) => onChange(newValue as number)}
        marks={marks}
        min={0}
        max={10000}
        step={100}
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
      {!noVisibilityValue && (
        <div style={{ color: "white", marginTop: "1em" }}>
          <Typography>
            Current Visibility: {visibility?.[getHourlyEpoch(currentTime)]}m
          </Typography>
        </div>
      )}
      <Snackbar open={openSnackbarForecast} onClose={triggerSnackbarClose}>
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
    </>
  );
};

export default VisibilitySlider;
