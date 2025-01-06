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
  const [openSnackbarMaxArray, setOpenSnackbarMaxArray] = useState(false);
  const [options, setOptions] = useState<SearchOption[]>([]);
  const provider = useMemo(() => new OpenStreetMapProvider(), []);
  const [inputValue, setInputValue] = useState<string>("");

  const debouncedInput = useDebounce(inputValue, 300);

  useEffect(() => {
    if (debouncedInput) {
      const searchLocations = async (input: string) => {
        const results = await provider.search({ query: input });
        setOptions(
          results.map((result) => ({
            label: result.label,
            value: { x: result.x, y: result.y },
          })),
        );
      };
      searchLocations(debouncedInput);
    }
  }, [debouncedInput, provider]);

  const handleSnackbarClose = () => {
    setOpenSnackbarMaxArray(false);
  };

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

  return (
    <div style={{ paddingLeft: "0.5em" }}>
      <Autocomplete
        freeSolo
        options={options}
        inputValue={inputValue}
        onInputChange={(_, newValue) => {
          setInputValue(newValue);
        }}
        getOptionLabel={(option) =>
          typeof option === "string" ? option : option.label
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
      />
      <Snackbar open={openSnackbarMaxArray} onClose={handleSnackbarClose}>
        <Alert
          onClose={handleSnackbarClose}
          severity="warning"
          variant="filled"
          sx={{ width: "100%" }}
        >
          Please delete an old marker before a new one can be added.
        </Alert>
      </Snackbar>
    </div>
  );
};

export default SearchField;
