import React, { Dispatch, SetStateAction, useState } from 'react';
import { Button, Snackbar, Typography, Fab } from '@mui/material/';
import { handleSnackbarClose } from './Utils/Calc';
import { Plan } from './DTLLoadDelete';
import { BookmarkAdd }  from '@mui/icons-material/';

interface StorageHandlerProps {
    center: L.LatLngExpression | undefined;
    date: Date;
    time: number;
    setSavedPlans: React.Dispatch<React.SetStateAction<Plan[]>>
}

interface DTLSaveButtonProps extends StorageHandlerProps {
    isDTLVisible: boolean;
}

const localStorageHandler = ({center, date, time, setSavedPlans}: StorageHandlerProps) => {
    const [error, setError] = useState<string | null>(null);

    const getCurrentData = () : { currentLocation: L.LatLngExpression, currentDate: Date, currentTime: number } | null => {
        
        if (center) {
            const currentLocation = center;
            const currentDate = date;
            const currentTime = time;
            return { currentLocation, currentDate, currentTime };
        } else {
            console.warn('Center is undefined.');
        }
        return null;
    };

    const handleSaveDTL= () => {
        const data = getCurrentData();

        if (data) {
            try {
                const existingPlans = localStorage.getItem('savedData');
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
                        console.error('Failed to parse existing plans: ', parseError);
                    }
                }
                plans.push(data);
                localStorage.setItem('savedData', JSON.stringify(plans));
                setSavedPlans(plans);
            } catch (e) {
                setError('Failed to save data to local storage.');
                console.error(e);
            }
        }
    };

    return { handleSaveDTL };
}
  
/**
 * @returns Button to save specific DTL
 * Current DTL data will be stored in localstorage.
 */
const DTLSave: React.FC<DTLSaveButtonProps> = ({ center, date, time, isDTLVisible, setSavedPlans}) => {
    const [openSnackbarDTL, setOpenSnackbarDTL] = useState(false);
    const snackbarStates = { openSnackbarDTL };
    const setSnackbarStates = { openSnackbarDTL: setOpenSnackbarDTL };

    const { handleSaveDTL } = localStorageHandler({center, date, time, setSavedPlans});
    const triggerSnackbarClose = () => handleSnackbarClose(snackbarStates, setSnackbarStates);

    return (
        <div>
        <Fab color='info' aria-label='showPlans' onClick={() => {setOpenSnackbarDTL(true), handleSaveDTL()}} size='small' style={{position: 'absolute', top: isDTLVisible ? '9.375em' : '2.9em', left: '1em', zIndex: '1000'}}>
            <BookmarkAdd/>
        </Fab>
        <Snackbar 
        open={openSnackbarDTL}
        message={
          <Typography dangerouslySetInnerHTML={{ __html: 'Saving current Date, Time and Location.' }} />
        }
        autoHideDuration={6000}
        onClose={triggerSnackbarClose}
        />
        </div>
    )
};

export default DTLSave;