//Data provided by Open-Meteo, licensed under CC-BY 4.0
import React, { useState, useCallback, useEffect } from "react";
import Slider from "@mui/material/Slider";
import { fetchWeatherApi } from "openmeteo";
import { LatLngExpression } from "leaflet";
import { convertLatLngToCoords } from "./Utils/Calc";

interface VisibilitySliderProps {
  value: number;
  onChange: (value: number) => void;
  center: LatLngExpression | undefined;
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
}) => {
  const [forecastVisibility, setForecastVisibility] =
    useState<Float32Array | null>(null);
  const url = "https://api.open-meteo.com/v1/forecast";
  const [params, setParams] = useState<{
    latitude: number;
    longitude: number;
    hourly: string[];
  }>({
    latitude: 0,
    longitude: 0,
    hourly: ["visibility"],
  });

  /** Limitations in order to adhere to https://open-meteo.com/en/terms
   * TODO: they already block to many requests.
   */
  const [dayCount, setDayCount] = useState<number>(0);
  const [hourCount, setHourCount] = useState<number>(0);
  const [minuteCount, setMinuteCount] = useState<number>(0);
  const [prevDayReset, setPrevDayReset] = useState(Date.now());
  const [prevHourReset, setPrevHourReset] = useState(Date.now());
  const [prevMinuteReset, setPrevMinuteReset] = useState(Date.now());
  const MAX_CALLS_PER_HOUR = 5000;
  const MAX_CALLS_PER_MINUTE = 600;
  const MAX_CALLS_PER_DAY = 10000;

  const fetchVisbilityData = useCallback(async () => {
    if (
      dayCount >= MAX_CALLS_PER_DAY ||
      hourCount >= MAX_CALLS_PER_HOUR ||
      minuteCount >= MAX_CALLS_PER_MINUTE
    ) {
      console.warn("API call limit is reached.");
      return;
    }

    try {
      const responses = await fetchWeatherApi(url, params);
      const response = responses[0];
      const hourly = response.hourly();
      if (hourly) {
        const visibility = hourly.variables(0)!.valuesArray()!;
        setForecastVisibility(visibility);
        setDayCount((prev) => prev + 1);
        setHourCount((prev) => prev + 1);
        setMinuteCount((prev) => prev + 1);
      } else {
        console.warn("Weather data is not ready.");
      }
    } catch (error) {
      console.error("Error fetching visibility data:", error);
    }
  }, [params, dayCount, hourCount, minuteCount]);

  const updateParams = (lat: number, lng: number) => {
    setParams((prevParams) => ({
      ...prevParams,
      latitude: lat,
      longitude: lng,
    }));
  };

  useEffect(() => {
    if (center) {
      const { lat, lng } = convertLatLngToCoords(center);
      updateParams(lat, lng);
      fetchVisbilityData();
    }
  }, [center, fetchVisbilityData]);

  useEffect(() => {
    const resetCounts = () => {
      const now = Date.now();
      if (now - prevMinuteReset >= 60000) {
        setMinuteCount(0);
        setPrevMinuteReset(now);
      }
      if (now - prevHourReset >= 3600000) {
        setHourCount(0);
        setPrevHourReset(now);
      }
      if (now - prevDayReset >= 86400000) {
        setDayCount(0);
        setPrevDayReset(now);
      }
    };

    const timeInterval = setInterval(resetCounts, 30000);
    return () => clearInterval(timeInterval);
  }, [prevDayReset, prevHourReset, prevMinuteReset]);

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
    </div>
  );
};

export default VisibilitySlider;
