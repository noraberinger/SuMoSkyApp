import React, { useState, useMemo, useEffect } from "react";
import SearchIcon from "@mui/icons-material/Search";
import {
  Autocomplete,
  TextField,
  InputAdornment,
  Snackbar,
  Alert,
} from "@mui/material";
import L from "leaflet";
import { Marker } from "./LeafletMap";
import { OpenStreetMapProvider } from "leaflet-geosearch";

interface SearchOption {
  label: string;
  value: {
    x: number;
    y: number;
  };
  id: string;
}

interface SearchFieldProps {
  map: L.Map | null;
  setCenter: React.Dispatch<
    React.SetStateAction<L.LatLngExpression | undefined>
  >;
  setMarkers: React.Dispatch<React.SetStateAction<Marker[]>>;
  maxMarkers: number;
}

const useDebounce = <T = unknown,>(value: T, delayMs: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [value, delayMs]);

  return debouncedValue;
};

const SearchField: React.FC<SearchFieldProps> = ({
  map,
  setCenter,
  setMarkers,
  maxMarkers,
}) => {
  const [options, setOptions] = useState<SearchOption[]>([]);
  const provider = useMemo(() => new OpenStreetMapProvider(), []);
  const [inputValue, setInputValue] = useState<string>("");
  const [openSnackbarNoResults, setSnackbarNoResults] = useState(false);
  const [openSnackbarMaxArray, setOpenSnackbarMaxArray] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);

  const closeSnackbarMaxArray = () => setOpenSnackbarMaxArray(false);
  const closeSnackbarNoResults = () => setSnackbarNoResults(false);

  const debouncedInput = useDebounce(inputValue, 300);

  useEffect(() => {
    if (debouncedInput?.trim()) {
      const searchLocations = async (input: string) => {
        setIsSearching(true);
        try {
          const results = await provider.search({ query: input });
          setOptions(
            results.map((result) => ({
              label: result.label,
              value: { x: result.x, y: result.y },
              id: `${result.label}-${result.x}-${result.y}`,
            })),
          );
        } catch (error) {
          console.error("Search failed: ", error);
          setSearchError(true);
        } finally {
          setIsSearching(false);
        }
      };
      searchLocations(debouncedInput);
    } else {
      setOptions([]);
    }
  }, [debouncedInput, provider]);

  const handleOptionSelect = (option: SearchOption) => {
    if (!option || !map) return;

    if (!("value" in option)) {
      console.warn("Invalid option format");
      return;
    }

    const latLng = L.latLng(option.value.y, option.value.x);
    setCenter(latLng);

    setMarkers((prevMarkers) => {
      if (prevMarkers.length >= maxMarkers) {
        setOpenSnackbarMaxArray(true);
        return prevMarkers;
      }

      const newMarker = {
        id: self.crypto.randomUUID(),
        name: option.label,
        position: latLng,
        searchLocation: latLng,
      };

      const isDuplicate = prevMarkers.some(
        (marker) => marker.name.toLowerCase() === newMarker.name.toLowerCase(),
      );

      return isDuplicate ? prevMarkers : [...prevMarkers, newMarker];
    });
  };

  /* Allows user to hit enter for search instead of only selecting from the dropdown suggestions */
  const handleKeyPress = async (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && inputValue.trim()) {
      setIsSearching(true);
      try {
        const results = await provider.search({ query: inputValue });
        if (results.length === 0) {
          setSnackbarNoResults(true);
          return;
        }

        const firstResult = results[0];
        const latLng = L.latLng(firstResult.y, firstResult.x);
        setCenter(latLng);

        setMarkers((prevMarkers) => {
          if (prevMarkers.length >= maxMarkers) {
            setOpenSnackbarMaxArray(true);
            return prevMarkers;
          }

          const newMarker = {
            id: self.crypto.randomUUID(),
            name: firstResult.label,
            position: latLng,
            searchLocation: latLng,
          };

          const isDuplicate = prevMarkers.some(
            (marker) =>
              marker.name.toLowerCase() === newMarker.name.toLowerCase(),
          );

          return isDuplicate ? prevMarkers : [...prevMarkers, newMarker];
        });
      } catch (error) {
        console.error("Search failed: ", error);
        setSearchError(true);
      } finally {
        setIsSearching(false);
      }
    }
  };

  return (
    <div style={{ paddingLeft: "0.5em" }}>
      <Autocomplete
        onKeyDown={handleKeyPress}
        freeSolo
        options={options}
        inputValue={inputValue}
        onInputChange={(_, newValue) => {
          setInputValue(newValue);
        }}
        getOptionLabel={(option) =>
          typeof option === "string" ? option : option.label
        }
        getOptionKey={(option) =>
          typeof option === "string" ? option : option.id
        }
        onChange={(e, option) => {
          if (option && typeof option !== "string" && "value" in option) {
            if (e.target instanceof HTMLInputElement) e.target.blur();
            handleOptionSelect(option);
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            fullWidth
            placeholder="Search your landmark"
            sx={(theme) => ({
              "& .MuiInputBase-root": {
                backgroundColor: theme.palette.primary.light,
              },
            })}
            slotProps={{
              inputLabel: params.InputLabelProps,
              htmlInput: params.inputProps,
              input: {
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
        )}
        loading={isSearching}
        loadingText="Searching..."
      />
      <Snackbar
        open={openSnackbarMaxArray}
        onClose={closeSnackbarMaxArray}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={closeSnackbarMaxArray}
          severity="warning"
          variant="filled"
          sx={{ width: "100%" }}
        >
          Please delete an old marker before a new one can be added.
        </Alert>
      </Snackbar>
      <Snackbar
        open={openSnackbarNoResults}
        onClose={closeSnackbarNoResults}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Alert
          onClose={closeSnackbarNoResults}
          severity="warning"
          variant="filled"
        >
          Landmark not found. Please try a different search term.
        </Alert>
      </Snackbar>
      <Snackbar
        open={searchError}
        onClose={() => setSearchError(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setSearchError(false)}>
          Search failed. Please try again.
        </Alert>
      </Snackbar>
    </div>
  );
};

export default SearchField;
