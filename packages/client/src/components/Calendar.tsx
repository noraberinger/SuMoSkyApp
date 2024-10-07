import React from 'react';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import dayjs from 'dayjs';

/**
 * @returns Calendar
 * Allowing user to pick a date on a popup calendar.
 * Entering a date over user keyboard input (writing the date into fieldset) is not supported.
 * Makes use of @mui LocalizationProvider API and DatePicker component:
 * * https://mui.com/x/react-date-pickers/date-picker/
 * * https://mui.com/x/api/date-pickers/localization-provider/
 */
const Calendar: React.FC = () => {
    const startDate = dayjs('2024-01-01');

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
            minDate={startDate}
            sx={(theme)=> ({ width: "100%", "& .MuiInputBase-root": { backgroundColor: theme.palette.primary.light }})}
            />
        </LocalizationProvider>
    )
};

export default Calendar;