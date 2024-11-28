import { createTheme } from "@mui/material";

/** For inclusiveness reasons chose not to select green and red for positive and negative actions at the same time => color blindness
 * Used https://www.colorhexa.com to check colors.
 */
export const positiveActions = createTheme({
  palette: {
    secondary: {
      main: "#339933",
    },
  },
});

export const negativeActions = createTheme({
  palette: {
    secondary: {
      main: "#ffaf00",
    },
  },
});

export const infoTheme = createTheme({
  palette: {
    info: {
      main: "#3333ff",
    },
  },
});
