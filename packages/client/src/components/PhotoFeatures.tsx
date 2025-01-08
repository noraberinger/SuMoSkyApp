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

const getAmPm = (timeString: string) => {
  const [hours] = timeString.split(":");
  const hour = parseInt(hours, 10);
  return hour < 12 ? "AM" : "PM";
};

/**
 * @returns Accordion showing interesting times used in Photography.
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
            backgroundColor: "#878787",
            paddingLeft: "0.5em",
          },
          "& .MuiAccordionDetails-root": { padding: "0em" },
          "& .MuiTypography-root": {
            color: "#fff",
            background: "#878787",
            fontSize: "0.85rem",
            fontWeight: "bold",
            lineHeight: "normal",
          },
          border: "2px solid",
          borderColor: "grey.600",
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
          <Typography
            sx={{
              textTransform: "uppercase",
              paddingLeft: "0.5em",
              paddingBottom: "0.5em",
            }}
          >
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
      <div style={{ padding: "0.016em" }} />
      <Accordion
        expanded={expandedMoonAccordion}
        onChange={() => handleAccordionToggle("moon")}
        sx={{
          width: "100%",
          boxShadow: "none",
          "& .MuiAccordionSummary-root": {
            backgroundColor: "#878787",
            paddingLeft: "0.5em",
          },
          "& .MuiAccordionDetails-root": { padding: "0em" },
          "& .MuiTypography-root": {
            color: "#fff",
            background: "#878787",
            fontSize: "0.85rem",
            fontWeight: "bold",
            lineHeight: "normal",
          },
          border: "2px solid",
          borderColor: "grey.600",
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
          <Typography
            sx={{
              textTransform: "uppercase",
              paddingLeft: "0.5em",
              paddingBottom: "0.5em",
            }}
          >
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
