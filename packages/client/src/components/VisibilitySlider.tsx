import React from 'react';
import Slider from '@mui/material/Slider';

interface VisibilitySliderProps {
    value: number;
    onChange: (value: number) => void;
}

/** Generating the marking of the slider which depict elevation above sea level in m up to 10000m */ 
const generateMarks = () => {
    const marks = [];
    for (let m = 0; m <= 400; m += 50) {
        marks.push({
            value: m,
            label: `${m}km`
        });
    }
    return marks;
};

const marks = generateMarks();

/** Converts the values into a string such that screen readers can make use of the numeric value of the slider. */
function valueText(value: number) {
    return `${value} km`;
}

/**
 * @returns VisibilitySlider
 * Allowing user to range over different visibility settings (depth = +z-axis).
 * Makes use of @mui Slider component:
 * * https://mui.com/material-ui/react-slider/
 */
const VisibilitySlider: React.FC<VisibilitySliderProps> = ({ value, onChange }) => {

    return (
        <div style={{ marginTop: '2em', padding: '0 1.75em',}}>
        <Slider
            size='small'
            track={false}
            defaultValue={value}
            onChange={(e, newValue) => onChange(newValue as number)}
            marks={marks}
            min={0}
            max={400}
            step={50}
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

export default VisibilitySlider;