import React from 'react';
import Slider from '@mui/material/Slider';

interface TimeSliderProps {
    value: number;
    onChange: (value: number) => void;
}

/**
 * @returns DayTimeSlider
 * Allowing user to range over the hours of a full day (24 hours) using a slider tool.
 * Makes use of @mui Slider component:
 * * https://mui.com/material-ui/react-slider/
 */
const DayTimeSlider: React.FC<TimeSliderProps> = ({ value, onChange }) => {

    /**
     * Generating the marking of the slider which consists of a full day, respectively allows to range between 0:00 and 23:00.
    */ 
    const generateTimeMarks = () => {
        const marks = [];
        for (let hour = 0; hour <= 24; hour++) {
            marks.push({
                value: hour,
                label: hour % 2 ? '' : `${hour}:00`
            });
        }
        return marks;
    };

    const timeMarks = generateTimeMarks();

    /**
     * Converts the values into a string such that screen readers can make use of the numeric value of the slider.
    */
    function valueText(value: number) {
        const hour = value % 24;
        return `${hour}:00`;
    }

    return (
        <div style={{ marginTop: '2em', padding: '0 1.75em',}}>
        <Slider
            size='small'
            track={false}
            defaultValue={value}
            onChange={(e, newValue) => onChange(newValue as number)}
            marks={timeMarks}
            min={0}
            max={24}
            step={1}
            getAriaValueText={valueText}
            valueLabelDisplay={'on'}
            valueLabelFormat={valueText}
            sx={(theme) => ({
                '& .MuiSlider-root': {
                    backgroundColor: theme.palette.primary.light,
                },
                '& .MuiSlider-markLabel': {
                    color: 'white',
                },
            })}
        />
        </div>
    )
};

export default DayTimeSlider;




