import React, { useState } from "react";
import {
  Accordion,
  Typography,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material/";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";

interface PhotoFeatureProps {
  isDTLVisible: boolean;
  sunTimes: {
    sunrise: string;
    sunset: string;
    goldenHourMorning: string;
    goldenHourEvening: string;
    blueHourMorning: string;
    blueHourEvening: string;
  };
  moonTimes: { rise: string; set: string };
  isSupermoon: boolean;
  moonPhase: { phase: string };
}

/**
 * @returns Accordion showing interesting photofeatures.
 * Includes golden hour, blue hour, moon phases and supermoon text if supermoon.
 */
const PhotoFeatures: React.FC<PhotoFeatureProps> = ({
  isDTLVisible,
  sunTimes,
  moonTimes,
  isSupermoon,
  moonPhase,
}) => {
  const [expandedSunAccordion, setExpandedSunAccordion] = useState(false);
  const [expandedMoonAccordion, setExpandedMoonAccordion] = useState(false);

  const handleAccordionToggle = (type: string) => {
    if (type === "sun") {
      setExpandedSunAccordion(!expandedSunAccordion);
    } else if (type === "moon") {
      setExpandedMoonAccordion(!expandedMoonAccordion);
    }
  };

  const getAmPm = (timeString: string) => {
    const [hours] = timeString.split(":");
    const hour = parseInt(hours, 10);
    return hour < 12 ? "AM" : "PM";
  };

  return (
    <div>
      <Accordion
        expanded={expandedSunAccordion}
        onChange={() => handleAccordionToggle("sun")}
        sx={{
          boxShadow: "none",
          minWidth: "14em",
          minHeight: "1.875em",
          "& .MuiAccordionSummary-root": {
            backgroundColor: "#faf5f5",
            paddingLeft: "0.5em",
          },
          "& .MuiAccordionDetails-root": { padding: "0em" },
          "& .MuiTypography-root": {
            color: "#333",
            background: "#faf5f5",
            fontSize: "0.85rem",
            fontWeight: "bold",
            lineHeight: "normal",
          },
          top: isDTLVisible ? "10.025em" : "4.675em",
          zIndex: 1600,
          position: "absolute",
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="SunTimes"
          id="SunTimes"
        >
          <Typography>SUN TIMES</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            Start Blue Hour AM: {sunTimes.blueHourMorning}{" "}
            {getAmPm(sunTimes.blueHourMorning)}
            <br />
            Sunrise: {sunTimes.sunrise} {getAmPm(sunTimes.sunrise)}
            <br />
            End Golden Hour AM: {sunTimes.goldenHourMorning}{" "}
            {getAmPm(sunTimes.goldenHourMorning)}
            <br />
            Start Golden Hour PM: {sunTimes.goldenHourEvening}{" "}
            {getAmPm(sunTimes.goldenHourEvening)}
            <br />
            Sunset: {sunTimes.sunset} {getAmPm(sunTimes.sunset)}
            <br />
            Start Blue Hour PM: {sunTimes.blueHourEvening}{" "}
            {getAmPm(sunTimes.blueHourEvening)}
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Accordion
        expanded={expandedMoonAccordion}
        onChange={() => handleAccordionToggle("moon")}
        sx={{
          boxShadow: "none",
          minWidth: "14em",
          minHeight: "1.875em",
          "& .MuiAccordionSummary-root": {
            backgroundColor: "#faf5f5",
            paddingLeft: "0.5em",
          },
          "& .MuiAccordionDetails-root": { padding: "0em" },
          "& .MuiTypography-root": {
            color: "#333",
            background: "#faf5f5",
            fontSize: "0.85rem",
            fontWeight: "bold",
            lineHeight: "normal",
          },
          top: isDTLVisible ? "13.175em" : "7.825em",
          zIndex: 1500,
          position: "absolute",
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="MoonTimes"
          id="MoonTimes"
        >
          <Typography>MOON TIMES</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            Rise: {moonTimes.rise} {getAmPm(moonTimes.rise)}
            <br />
            Set: {moonTimes.set} {getAmPm(moonTimes.set)}
            <br />
            Moon Phase: {moonPhase.phase}
            <br />
            {isSupermoon ? "Supermoon" : ""}
          </Typography>
        </AccordionDetails>
      </Accordion>
    </div>
  );
};

export default PhotoFeatures;
