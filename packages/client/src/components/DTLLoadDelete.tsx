import React, { useEffect, useState } from 'react';
import { Typography, Button, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, Fab, Dialog, DialogTitle, IconButton, DialogContent } from '@mui/material/';
import { LatLngExpression } from 'leaflet';
import { PinDrop as PinIcon, Delete as DeleteIcon, Bookmark, Close } from '@mui/icons-material';
import { convertLatLngToCoords } from './Utils/Calc';

interface DTLLoadDeleteProps {
    isDTLVisible: boolean;
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
}
  
/**
 * @returns Table showing saved DTL PLans
 * Gets DTL from local storage.
 * Functionality buttons to delete a plan and to move to a saved plan.
 */
const DTLLoadDelete: React.FC<DTLLoadDeleteProps> = ({ isDTLVisible, setCenter, setSelectedDate, setSliderTime, savedPlans, setSavedPlans}) => {
    const [error, setError] = useState<string | null>(null);
    const [tableIsOpen, setTableIsOpen] = useState<boolean>(false);

    useEffect(() => {
        const loadSavedPlans = () => {
            try {
                const savedData = localStorage.getItem('savedData');
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
    }, []);

    const handleDelete = (index: number) => {
        const updatedPlans = savedPlans.filter((_, i) => i !== index);
        setSavedPlans(updatedPlans);
        localStorage.setItem('savedData', JSON.stringify(updatedPlans));
    };

    const handleMarker = (plan: Plan) => {
        setCenter(plan.currentLocation);
        setSliderTime(plan.currentTime);
        const date = new Date(plan.currentDate);
        setSelectedDate(date);
    };

    const toggleTable = () => setTableIsOpen(!tableIsOpen);

    const getLatLngAsString = (location: L.LatLngExpression) : string => {
        const {lat, lng} = convertLatLngToCoords(location);
        return `Lat: ${lat.toFixed(2)}, Lng: ${lng.toFixed(2)}`;
    };

    const getTimeAsString = (time: number) : string => {
        const hour = Math.floor(time / 6);
        const minute = (time % 6) * 10;
        return `${hour}:${minute}`;
    };

    return (
        <div>
            <Fab color='info' aria-label='showPlans' onClick={toggleTable} size='small' style={{position: 'absolute', top: isDTLVisible ? '9.375em' : '2.9em', left: '4em', zIndex: '2000'}}>
                <Bookmark/>
            </Fab>
            <Dialog open={tableIsOpen} onClose={toggleTable} fullWidth maxWidth='sm' style={{zIndex: 2000}}>
                <DialogTitle>
                    Saved Plans
                    <IconButton aria-label='close' onClick={toggleTable} sx={{ position:'absolute', right: '2em', top: '2em'}}>
                        <Close/>
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    { savedPlans.length === 0 ? (
                    <Typography> No plans saved </Typography>
                    ) : (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Location</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Time</TableCell>
                                    <TableCell align='center'>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {savedPlans.map((plan, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{getLatLngAsString(plan.currentLocation)}</TableCell>
                                        <TableCell>{new Date(plan.currentDate).toLocaleDateString()}</TableCell>
                                        <TableCell>{getTimeAsString(plan.currentTime)}</TableCell>
                                        <TableCell align='center'>
                                            <Button onClick={() => handleMarker(plan)}><PinIcon/></Button>
                                            <Button onClick={() => handleDelete(index)}><DeleteIcon/></Button>
                                        </TableCell>
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