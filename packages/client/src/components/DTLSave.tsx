import React, { useState } from "react";
import { Snackbar, Fab, ThemeProvider, Alert } from "@mui/material/";
import { handleSnackbarClose } from "./Utils/Calc";
import { Plan } from "./DTLLoadDelete";
import { BookmarkAdd } from "@mui/icons-material/";
import { positiveActions } from "./Utils/ColorThemes";

interface StorageHandlerProps {
  center: L.LatLngExpression | undefined;
  date: Date;
  time: number;
  setSavedPlans: React.Dispatch<React.SetStateAction<Plan[]>>;
}

const localStorageHandler = ({
  center,
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
  center,
  date,
  time,
  setSavedPlans,
}) => {
  const [openSnackbarDTL, setOpenSnackbarDTL] = useState(false);
  const snackbarStates = { openSnackbarDTL };
  const setSnackbarStates = { openSnackbarDTL: setOpenSnackbarDTL };

  const { handleSaveDTL } = localStorageHandler({
    center,
    date,
    time,
    setSavedPlans,
  });
  const triggerSnackbarClose = () =>
    handleSnackbarClose(snackbarStates, setSnackbarStates);

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
        >
          <BookmarkAdd />
        </Fab>
        <Snackbar open={openSnackbarDTL} onClose={triggerSnackbarClose}>
          <Alert
            onClose={triggerSnackbarClose}
            severity="success"
            variant="filled"
            sx={{ width: "100%" }}
          >
            Saved current Date, Time and Location.
          </Alert>
        </Snackbar>
      </ThemeProvider>
    </div>
  );
};

export default DTLSave;
