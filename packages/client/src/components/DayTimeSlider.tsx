import React from "react";
import Slider from "@mui/material/Slider";

interface TimeSliderProps {
  value: number;
  onChange: (value: number) => void;
}

/** Generating the marking of the slider which consists of a full day, respectively allows to range between 0:00 and 23:00. */
const generateTimeMarks = () => {
  const marks = [];
  for (let i = 0; i <= 144; i++) {
    const hour = Math.floor(i / 6);
    marks.push({
      value: i,
      //label: hour % 2 ? '' : `${hour}:00`
      label: hour % 2 === 0 && i % 6 === 0 ? `${hour}:00` : "",
    });
  }
  return marks;
};

const timeMarks = generateTimeMarks();

/** Converts the values into a string such that screen readers can make use of the numeric value of the slider. */
function valueText(value: number) {
  //const hour = value % 24;
  const hour = Math.floor(value / 6);
  const minute = (value % 6) * 10;
  if (minute != 0) {
    return `${hour}:${minute}`;
  } else {
    return `${hour}:${minute}0`;
  }
}

/**
 * @returns DayTimeSlider
 * Allowing user to range over the hours of a full day (24 hours) using a slider tool.
 * Makes use of @mui Slider component:
 * * https://mui.com/material-ui/react-slider/
 */
const DayTimeSlider: React.FC<TimeSliderProps> = ({ value, onChange }) => {
  const handleSliderChange = (e: Event, newValue: number | number[]) => {
    const newTime = newValue as number;

    if (newTime === 144) {
      onChange(0);
    } else {
      onChange(newTime);
    }
  };

  return (
    <div style={{ marginTop: "2em", padding: "0 1.75em" }}>
      <Slider
        size="small"
        track={false}
        value={value}
        onChange={handleSliderChange}
        marks={timeMarks}
        min={0}
        max={144}
        step={1}
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
          "& .MuiSlider-valueLabel": {
            zIndex: 700,
            position: "relative",
          },
        })}
      />
    </div>
  );
};

export default DayTimeSlider;
