import { createTheme } from "@mui/material";

/** For inclusiveness reasons chose not to select green and red for positive and negative actions at the same time => color blindness
 * Used https://www.colorhexa.com to check colors to ensure web safe and inclusiveness.
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

export const functionalities = createTheme({
  palette: {
    secondary: {
      main: "#878787",
    },
  },
});

export const infoTheme = createTheme({
  palette: {
    secondary: {
      main: "#3333ff",
    },
  },
});

export const sunTheme = createTheme({
  palette: {
    info: {
      main: "#ffff00",
    },
  },
});

export const moonTheme = createTheme({
  palette: {
    info: {
      main: "#0000ff",
    },
  },
});
