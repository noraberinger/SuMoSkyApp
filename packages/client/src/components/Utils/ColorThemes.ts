import { createTheme } from "@mui/material";

export const positiveActions = createTheme({
  palette: {
    secondary: {
      main: "#29873e",
    },
  },
});

export const negativeActions = createTheme({
  palette: {
    secondary: {
      main: "#c23b47",
    },
  },
});

export const infoTheme = createTheme({
  palette: {
    info: {
      main: "#3a4bef",
    },
  },
});
