import React from "react";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";

interface CalendarProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
}

/**
 * @returns Calendar
 * Allowing user to pick a date on a popup calendar.
 * Entering a date over user keyboard input (writing the date into fieldset) is not supported.
 * Makes use of @mui LocalizationProvider API and DatePicker component:
 * * https://mui.com/x/react-date-pickers/date-picker/
 * * https://mui.com/x/api/date-pickers/localization-provider/
 */
const Calendar: React.FC<CalendarProps> = ({ selectedDate, onChange }) => {
  const startDate = dayjs("2024-01-01");

  const handleDateChange = (date: Dayjs | null) => {
    if (date) {
      onChange(date.toDate());
    }
  };

  return (
    <div style={{ paddingRight: "0.5em", zIndex: 1600 }}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          minDate={startDate}
          value={dayjs(selectedDate)}
          onChange={handleDateChange}
          slotProps={{ popper: { sx: { zIndex: 1600 } } }}
          sx={(theme) => ({
            width: "100%",
            "& .MuiInputBase-root": {
              backgroundColor: theme.palette.primary.light,
            },
          })}
        />
      </LocalizationProvider>
    </div>
  );
};

export default Calendar;
