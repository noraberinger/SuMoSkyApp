import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import { TextField, InputAdornment  } from '@mui/material';
import 'leaflet-control-geocoder';
import L, { Control, LatLng, map } from 'leaflet';
import Geocoder from 'leaflet-control-geocoder';
import { nominatim } from 'leaflet-control-geocoder/dist/geocoders';
import { Marker } from './LeafletMap';

interface GeocodeResultType {
    center: L.LatLng;
}

interface SearchFieldProps {
    map: L.Map | null;
    setCenter:   React.Dispatch<React.SetStateAction<L.LatLngExpression>>;
    setMarkers: React.Dispatch<React.SetStateAction<Marker[]>>;
}

/**
 * 
 * @returns SearchField
 * Allows user to search for a location known to OpenStreetMap.
 * Makes use of @mui InputBase API and SearchIcon:
 * * https://mui.com/material-ui/api/input-base/
 * * https://mui.com/material-ui/material-icons/?query=search+
 */
const SearchField: React.FC<SearchFieldProps> = ({ map, setCenter, setMarkers }) => {
    /// const [searchQuery, setSearchQuery] = useState('');

    const handleSearchInput = (input: string)=> {
        console.log('handleSearchInput', input, map);
        //e.preventDefault();
        if (!input || !map) return;

        const geocoder = (L.Control as any).Geocoder.nominatim();

        geocoder.geocode(input, function(results: GeocodeResultType[]) {
            console.log('handleSearchInput results', results);
            if (results && results.length > 0) {
                const latLng = results[0].center;
                setCenter(latLng);
                setMarkers((prevMarkers) => ([...prevMarkers, {id: self.crypto.randomUUID(), name: input, position: latLng }]));
            }
        });
    };

    return (
        <div style={{paddingLeft: '0.5em'}}>
        <TextField
        fullWidth
          sx={(theme)=> ({ '& .MuiInputBase-root': { backgroundColor: theme.palette.primary.light }})}
            placeholder='Search Location'
            onKeyDown={(e : React.KeyboardEvent<HTMLDivElement>)=> { 
                console.log(e.target instanceof HTMLInputElement && e.target.value);
                if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                    e.target.blur();
                    handleSearchInput(e.target.value);
            }}}
            slotProps={{
            input: {
                startAdornment: <InputAdornment position='start'>   <SearchIcon /></InputAdornment>,
            },
            }}
        />
    </div>
    );
};

export default SearchField;