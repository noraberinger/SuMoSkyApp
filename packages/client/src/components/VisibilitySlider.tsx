//Data provided by Open-Meteo, licensed under CC-BY 4.0
import React, { useState, useCallback, useEffect, useRef } from "react";
import { Slider, Snackbar, Typography } from "@mui/material";
import { fetchWeatherApi } from "openmeteo";
import { LatLngExpression } from "leaflet";
import { convertLatLngToCoords, handleSnackbarClose } from "./Utils/Calc";

interface VisibilitySliderProps {
  value: number;
  onChange: (value: number) => void;
  center: LatLngExpression | undefined;
  selectedDate: Date;
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

/**
 * @returns VisibilitySlider
 * Allowing user to range over different visibility settings (depth = +z-axis).
 * Makes use of @mui Slider component:
 * * https://mui.com/material-ui/react-slider/
 */
const VisibilitySlider: React.FC<VisibilitySliderProps> = ({
  value,
  onChange,
  center,
  selectedDate,
}) => {
  const [forecastVisibility, setForecastVisibility] =
    useState<Float32Array | null>(null);
  const url = "https://api.open-meteo.com/v1/forecast";
  const fetchAttempted = useRef(false);
  const [openSnackbarForecast, setOpenSnackbarForecast] = useState(false);
  const snackbarStates = { openSnackbarForecast };
  const setSnackbarStates = { openSnackbarForecast: setOpenSnackbarForecast };
  const initialRender = useRef(true);

  const fetchVisbilityData = useCallback(async (lat: number, lng: number) => {
    if (fetchAttempted.current) return;
    fetchAttempted.current = true;

    try {
      const params = {
        latitude: lat,
        longitude: lng,
        hourly: ["visibility"],
      };
      const responses = await fetchWeatherApi(url, params);
      const response = responses[0];
      const hourly = response.hourly();
      if (hourly) {
        const visibility = hourly.variables(0)!.valuesArray()!;
        if (visibility) setForecastVisibility(visibility);
      } else {
        console.warn("Weather data is not ready.");
      }
    } catch (error) {
      console.error("Error fetching visibility data:", error);
    }
  }, []);

  const triggerSnackbarClose = () => {
    handleSnackbarClose(snackbarStates, setSnackbarStates);
  };

  useEffect(() => {
    if (center && !fetchAttempted.current) {
      const { lat, lng } = convertLatLngToCoords(center);
      fetchVisbilityData(lat, lng);
    }
  }, [center, fetchVisbilityData]);

  /** Refetch data when calendar date is changed */
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    if (selectedDate) {
      const currentDate = new Date();
      //Difference between currentDate and selectedDate in ms
      const differenceDays = Math.floor(
        (selectedDate.getTime() - currentDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (differenceDays >= 0 && differenceDays <= 7 && center) {
        fetchAttempted.current = false;
        const { lat, lng } = convertLatLngToCoords(center);
        fetchVisbilityData(lat, lng);
        console.log("refetch of date");
      } else {
        setOpenSnackbarForecast(true);
      }
    }
  }, [selectedDate, center, fetchVisbilityData]);

  /** Refetch data every hour */
  useEffect(() => {
    const intervalId = setInterval(
      () => {
        if (center) {
          fetchAttempted.current = false;
          const { lat, lng } = convertLatLngToCoords(center);
          fetchVisbilityData(lat, lng);
        }
      },
      60 * 60 * 1000,
    );

    return () => clearInterval(intervalId);
  }, [center, fetchVisbilityData]);

  return (
    <div style={{ marginTop: "2em", padding: "0 1.75em", width: "75%" }}>
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
          "& .MuiSlider-root": {
            backgroundColor: theme.palette.primary.light,
          },
          "& .MuiSlider-markLabel": {
            color: "white",
          },
        })}
      />
      {forecastVisibility && forecastVisibility.length > 0 && (
        <div style={{ color: "white", marginTop: "1em" }}>
          Current Visibility: {forecastVisibility[0]} m
        </div>
      )}
      <Snackbar
        open={openSnackbarForecast}
        message={
          <Typography
            dangerouslySetInnerHTML={{
              __html:
                "Forecast available for 7 days only. For your selected date no forecast data available.",
            }}
          />
        }
        autoHideDuration={6000}
        onClose={triggerSnackbarClose}
      />
    </div>
  );
};

export default VisibilitySlider;
