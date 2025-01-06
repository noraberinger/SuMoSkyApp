import React, { useEffect, useState } from "react";
import {
  Typography,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Fab,
  Dialog,
  DialogTitle,
  IconButton,
  DialogContent,
  ThemeProvider,
} from "@mui/material/";
import { LatLngExpression } from "leaflet";
import {
  Delete as DeleteIcon,
  Bookmark,
  Close,
  Edit as EditIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { convertLatLngToCoords } from "./Utils/Calc";
import {
  infoTheme,
  negativeActions,
  positiveActions,
} from "./Utils/ColorThemes";

interface DTLLoadDeleteProps {
  setCenter: React.Dispatch<React.SetStateAction<LatLngExpression | undefined>>;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date>>;
  setSliderTime: React.Dispatch<React.SetStateAction<number>>;
  savedPlans: Plan[];
  setSavedPlans: React.Dispatch<React.SetStateAction<Plan[]>>;
}

export type Plan = {
  currentLocation: L.LatLngExpression;
  currentDate: Date;
  currentTime: number;
};

const getLatLngAsString = (location: L.LatLngExpression): string => {
  const { lat, lng } = convertLatLngToCoords(location);
  return `Lat: ${lat.toFixed(2)}, Lng: ${lng.toFixed(2)}`;
};

const getTimeAsString = (time: number): string => {
  const hour = Math.floor(time / 6);
  const minute = (time % 6) * 10;
  if (minute != 0) {
    return `${hour}:${minute}`;
  } else {
    return `${hour}:${minute}0`;
  }
};

/**
 * @returns Table showing saved DTL PLans
 * Gets DTL from local storage.
 * Functionality buttons to delete a plan and to move to a saved plan.
 */
const DTLLoadDelete: React.FC<DTLLoadDeleteProps> = ({
  setCenter,
  setSelectedDate,
  setSliderTime,
  savedPlans,
  setSavedPlans,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [tableIsOpen, setTableIsOpen] = useState<boolean>(false);
  const [names, setNames] = useState<string[]>(savedPlans.map(() => ""));
  const [editIndex, setEditIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadSavedPlans = () => {
      try {
        const savedData = localStorage.getItem("savedData");
        if (savedData) {
          const parsedPlans: Plan[] = JSON.parse(savedData);
          setSavedPlans(parsedPlans);
        }
      } catch (e) {
        setError(`Failed to retrieve data from local storage: ${e}`);
        console.error(error);
      }
    };
    loadSavedPlans();
  }, [error, setSavedPlans]);

  const handleDelete = (index: number) => {
    const updatedPlans = savedPlans.filter((_, i) => i !== index);
    setSavedPlans(updatedPlans);
    localStorage.setItem("savedData", JSON.stringify(updatedPlans));
  };

  const handleRowClick = (plan: Plan) => {
    setCenter(plan.currentLocation);
    setSliderTime(plan.currentTime);
    const date = new Date(plan.currentDate);
    setSelectedDate(date);
    toggleTable();
  };

  const toggleTable = () => setTableIsOpen(!tableIsOpen);

  const handleNameChange = (index: number, name: string) => {
    setNames((prevNames) => {
      const newNames = [...prevNames];
      newNames[index] = name;
      return newNames;
    });
  };

  const handleSave = (index: number) => {
    setNames((prevNames) => {
      const updatedNames = [...prevNames];
      updatedNames[index] = names[index];
      return updatedNames;
    });
    setEditIndex(null);
  };

  const handleEdit = (index: number) => {
    setEditIndex(index);
  };

  return (
    <div>
      <ThemeProvider theme={positiveActions}>
        <Fab
          color="secondary"
          aria-label="showPlans"
          onClick={toggleTable}
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
          <Bookmark />
        </Fab>
      </ThemeProvider>
      <Dialog open={tableIsOpen} onClose={toggleTable} fullWidth maxWidth="md">
        <DialogTitle>
          Saved Plans
          <IconButton
            aria-label="close"
            onClick={toggleTable}
            sx={{ position: "absolute", right: "2em", top: "0.25em" }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {savedPlans.length === 0 ? (
            <Typography> No plans saved </Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell align="center">Delete Plan</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {savedPlans.map((plan, index) => (
                    <TableRow
                      key={index}
                      onClick={() => handleRowClick(plan)}
                      style={{
                        cursor: "pointer",
                        transition: "background-color 0.3s, transform 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#6faff2")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div
                          style={{
                            position: "relative",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="text"
                            value={names[index]}
                            placeholder="Enter name"
                            onChange={(e) =>
                              handleNameChange(index, e.target.value)
                            }
                            disabled={editIndex !== index}
                            style={{
                              flex: 1,
                              paddingRight: "2px",
                              paddingTop: "2px",
                              paddingBottom: "2px",
                            }}
                          />
                          {editIndex === index ? (
                            <ThemeProvider theme={infoTheme}>
                              <Button
                                onClick={() => handleSave(index)}
                                style={{
                                  position: "absolute",
                                  right: "0px",
                                  zIndex: 10,
                                }}
                                color="info"
                              >
                                <SaveIcon />
                              </Button>
                            </ThemeProvider>
                          ) : (
                            <ThemeProvider theme={infoTheme}>
                              <Button
                                onClick={() => handleEdit(index)}
                                style={{
                                  position: "absolute",
                                  right: "0px",
                                  zIndex: 10,
                                }}
                                color="info"
                              >
                                <EditIcon />
                              </Button>
                            </ThemeProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getLatLngAsString(plan.currentLocation)}
                      </TableCell>
                      <TableCell>
                        {new Date(plan.currentDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getTimeAsString(plan.currentTime)}</TableCell>
                      <ThemeProvider theme={negativeActions}>
                        <TableCell
                          align="center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            onClick={() => handleDelete(index)}
                            color="secondary"
                          >
                            <DeleteIcon />
                          </Button>
                        </TableCell>
                      </ThemeProvider>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DTLLoadDelete;
