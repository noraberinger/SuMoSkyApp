import React, { useState } from "react";
import {
  Accordion,
  Typography,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material/";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";

interface PhotoFeatureProps {
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
    <>
      <Accordion
        expanded={expandedSunAccordion}
        onChange={() => handleAccordionToggle("sun")}
        sx={{
          width: "100%",
          marginTop: "1em",
          boxShadow: "none",
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
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="SunTimes"
          id="SunTimes"
        >
          <Typography sx={{ textTransform: "uppercase" }}>Sun Times</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography sx={{ textTransform: "uppercase" }}>
            - Start Morning <br /> Blue Hour: {sunTimes.blueHourMorning}{" "}
            {getAmPm(sunTimes.blueHourMorning)}
            <br />
            <br />- Sunrise: {sunTimes.sunrise} {getAmPm(sunTimes.sunrise)}
            <br />
            <br />
            - End Morning <br /> Golden Hour: {sunTimes.goldenHourMorning}{" "}
            {getAmPm(sunTimes.goldenHourMorning)}
            <br />
            <br />
            - Start Evening <br /> Golden Hour: {
              sunTimes.goldenHourEvening
            }{" "}
            {getAmPm(sunTimes.goldenHourEvening)}
            <br />
            <br />- Sunset: {sunTimes.sunset} {getAmPm(sunTimes.sunset)}
            <br />
            <br />
            - Start Evening <br /> Blue Hour: {sunTimes.blueHourEvening}{" "}
            {getAmPm(sunTimes.blueHourEvening)}
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Accordion
        expanded={expandedMoonAccordion}
        onChange={() => handleAccordionToggle("moon")}
        sx={{
          width: "100%",
          boxShadow: "none",
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
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="MoonTimes"
          id="MoonTimes"
        >
          <Typography sx={{ textTransform: "uppercase" }}>
            Moon Times
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography sx={{ textTransform: "uppercase" }}>
            - Rise: {moonTimes.rise} {getAmPm(moonTimes.rise)}
            <br />
            <br />- Set: {moonTimes.set} {getAmPm(moonTimes.set)}
            <br />
            <br />- Moon Phase: {moonPhase.phase}
            <br />
            {isSupermoon ? "Supermoon" : ""}
          </Typography>
        </AccordionDetails>
      </Accordion>
    </>
  );
};

export default PhotoFeatures;
