import React, { useState } from "react";
import { Snackbar, Fab, ThemeProvider, Alert, Portal } from "@mui/material/";
import { Plan } from "./DTLLoadDelete";
import { BookmarkAdd } from "@mui/icons-material/";
import { positiveActions } from "./Utils/ColorThemes";

interface StorageHandlerProps {
  landmark: L.LatLngExpression | undefined;
  date: Date;
  time: number;
  setSavedPlans: React.Dispatch<React.SetStateAction<Plan[]>>;
}

const localStorageHandler = ({
  landmark: center,
  date,
  time,
  setSavedPlans,
}: StorageHandlerProps) => {
  const getCurrentData = (): {
    currentLocation: L.LatLngExpression;
    currentDate: Date;
    currentTime: number;
  } | null => {
    if (center) {
      const currentLocation = center;
      const currentDate = date;
      const currentTime = time;
      return { currentLocation, currentDate, currentTime };
    } else {
      console.warn("Center is undefined.");
    }
    return null;
  };

  const handleSaveDTL = () => {
    const data = getCurrentData();

    if (data) {
      try {
        const existingPlans = localStorage.getItem("savedData");
        let plans: Plan[] = [];

        if (existingPlans) {
          try {
            const parsedPlans = JSON.parse(existingPlans);
            if (Array.isArray(parsedPlans)) {
              plans = parsedPlans;
            } else {
              plans = [parsedPlans];
            }
          } catch (parseError) {
            console.error("Failed to parse existing plans: ", parseError);
          }
        }
        plans.push(data);
        localStorage.setItem("savedData", JSON.stringify(plans));
        setSavedPlans(plans);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return { handleSaveDTL };
};

/**
 * @returns Button to save specific DTL
 * Current DTL data will be stored in localstorage.
 */
const DTLSave: React.FC<StorageHandlerProps> = ({
  landmark: center,
  date,
  time,
  setSavedPlans,
}) => {
  const [openSnackbarDTL, setOpenSnackbarDTL] = useState(false);

  const closeSnackbarDTL = () => setOpenSnackbarDTL(false);

  const { handleSaveDTL } = localStorageHandler({
    landmark: center,
    date,
    time,
    setSavedPlans,
  });

  return (
    <div>
      <ThemeProvider theme={positiveActions}>
        <Fab
          color="secondary"
          aria-label="showPlans"
          onClick={() => {
            setOpenSnackbarDTL(true);
            handleSaveDTL();
          }}
          size="small"
          sx={{
            border: "2px solid",
            borderColor: "grey.600",
            boxShadow: 4,
            "&:hover": {
              boxShadow: 8,
              transform: "scale(1.1)",
              transition: "all 0.2s ease-in-out",
            },
          }}
        >
          <BookmarkAdd />
        </Fab>
      </ThemeProvider>
      <Portal>
        <Snackbar
          open={openSnackbarDTL}
          onClose={closeSnackbarDTL}
          autoHideDuration={6000}
          anchorOrigin={{ vertical: "top", horizontal: "left" }}
        >
          <Alert
            onClose={closeSnackbarDTL}
            severity="success"
            variant="filled"
            sx={{ width: "100%" }}
          >
            Saved current Date, Time and Location.
          </Alert>
        </Snackbar>
      </Portal>
    </div>
  );
};

export default DTLSave;
