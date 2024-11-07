import React, { useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import { TextField, InputAdornment, Snackbar, Typography } from "@mui/material";
import "leaflet-control-geocoder";
import L from "leaflet";
import { Marker } from "./LeafletMap";
import { convertLatLngToCoords } from "./Utils/Calc";

interface GeocodeResultType {
  center: L.LatLng;
}

interface SearchFieldProps {
  map: L.Map | null;
  setCenter: React.Dispatch<
    React.SetStateAction<L.LatLngExpression | undefined>
  >;
  setMarkers: React.Dispatch<React.SetStateAction<Marker[]>>;
  maxMarkers: number;
}

/**
 *
 * @returns SearchField
 * Allows user to search for a location known to OpenStreetMap.
 * Makes use of Nominatim in order to Geocode a specified location:
 * * https://nominatim.org/
 * Makes use of @mui Text Field and SearchIcon:
 * * https://mui.com/material-ui/react-text-field/
 * * https://mui.com/material-ui/material-icons/?query=search+
 */
const SearchField: React.FC<SearchFieldProps> = ({
  map,
  setCenter,
  setMarkers,
  maxMarkers,
}) => {
  const [openSnackbarMaxArray, setOpenSnackbarMaxArray] = useState(false);

  const handleSnackbarClose = () => {
    setOpenSnackbarMaxArray(false);
  };

  const handleSearchInput = (input: string) => {
    if (!input || !map) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geocoder = (L.Control as any).Geocoder.nominatim();

    if (!geocoder) {
      console.error("Geocoder not available");
      return;
    }

    geocoder.geocode(input, function (results: GeocodeResultType[]) {
      console.log("handleSearchInput results", results);
      if (results && results.length > 0) {
        const latLng = results[0].center;
        /** Setting the map to the specified location. */
        setCenter(latLng);
        /** TypeCheck to safeguard LatLngExpression */
        const typeCheckLatLng = (
          marker: Marker,
        ): { lat: number; lng: number } => {
          const markerPos = marker.position;
          const { lat, lng } = convertLatLngToCoords(markerPos);
          return { lat, lng };
        };
        /** Generating the new Marker
         *  Additionally checking if the Marker is already contained in Marker[] => if true the marker is not added to the array.
         */
        setMarkers((prevMarkers) => {
          /** Informing user maximum amount of markers reached. */
          if (prevMarkers.length >= maxMarkers) {
            setOpenSnackbarMaxArray(true);
            return prevMarkers;
          }
          const newMarker = {
            id: self.crypto.randomUUID(),
            name: input,
            position: latLng,
          };
          const isDuplicate = prevMarkers.some((marker) => {
            const convertedLatLng = typeCheckLatLng(marker);
            const newMarkerLat = newMarker.position.lat;
            const newMarkerLng = newMarker.position.lng;
            /** Comparison of prevMarkers lat/lng and new Marker lat/lng*/
            return (
              convertedLatLng.lat === newMarkerLat &&
              convertedLatLng.lng === newMarkerLng
            );
          });
          /** If the previous check returns true the prevMarkers array is returned => no change. */
          if (isDuplicate) {
            console.warn("Location already in Markers[]");
            return prevMarkers;
          } else {
            /** Else add newMarker to prevMarkers. */
            return [...prevMarkers, newMarker];
          }
        });
      } else {
        console.error("No geocoding result found for the input.");
      }
    });
  };

  return (
    <div style={{ paddingLeft: "0.5em" }}>
      <TextField
        fullWidth
        sx={(theme) => ({
          "& .MuiInputBase-root": {
            backgroundColor: theme.palette.primary.light,
          },
        })}
        placeholder="Search Location"
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
          console.log(e.target instanceof HTMLInputElement && e.target.value);
          if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
            e.target.blur();
            handleSearchInput(e.target.value);
          }
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                {" "}
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />
      <Snackbar
        open={openSnackbarMaxArray}
        message={
          <Typography
            dangerouslySetInnerHTML={{
              __html:
                "Please delete an old marker before a new one can be added.",
            }}
          />
        }
        autoHideDuration={6000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={handleSnackbarClose}
      />
    </div>
  );
};

export default SearchField;
