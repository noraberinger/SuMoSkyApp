import React from "react";
import { Slider, Typography } from "@mui/material/";

interface ElevationSliderProps {
  value: number;
  onChange: (value: number) => void;
  elevationCurrentCenter: number;
}

/** Generating the marking of the slider which depict elevation above sea level in m up to 10000m */
const generateMarks = () => {
  const marks = [];
  for (let m = 0; m <= 10000; m += 2000) {
    marks.push({
      value: m,
      label: `${m} m`,
    });
  }
  return marks;
};

const marks = generateMarks();

/** Converts the values into a string such that screen readers can make use of the numeric value of the slider. */
function valueText(value: number) {
  return `${value}m`;
}

/**
 * @returns ElevationSlider
 * Allowing user to range over different elevation levels.
 * Makes use of @mui Slider component:
 * * https://mui.com/material-ui/react-slider/
 */
const ElevationSlider: React.FC<ElevationSliderProps> = ({
  value,
  onChange,
  elevationCurrentCenter,
}) => {
  return (
    <>
      <Slider
        orientation="vertical"
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
          borderTop: "12px solid rgb(30,30,30)",
          borderBottom: "12px solid rgb(30,30,30)",
          backgroundColor: "rgb(30,30,30)",
          "& .MuiSlider-root": {
            backgroundColor: theme.palette.primary.light,
          },
          "& .MuiSlider-markLabel": {
            color: "white",
          },
        })}
      />
      <div style={{ color: "white", marginTop: "1em" }}>
        <Typography>
          Current Location: {Math.round(elevationCurrentCenter)}m + {value}m
        </Typography>
      </div>
    </>
  );
};

export default ElevationSlider;
