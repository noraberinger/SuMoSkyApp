import { createTheme } from "@mui/material";

export const tooltipTheme = createTheme({
  components: {
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#42a5f5",
          fontSize: "1rem",
          font: "Roboto",
        },
        arrow: {
          color: "#42a5f5",
        },
      },
    },
  },
});
