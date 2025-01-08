import React, { useCallback } from "react";
import SunCalc from "suncalc";
import { useRef, useEffect, useState, useMemo } from "react";
import { Terrender, StandardInputHandler } from "terrender-core";
import Button from "@mui/material/Button";
import L from "leaflet";
import SkyQuadBlended from "./Utils/SkyQuadBlended";
import {
  convertDateTime,
  convertLatLngToCoords,
  toDeg,
  translateCoords,
} from "./Utils/Calc";
import { ThemeProvider, Snackbar, Alert, Portal } from "@mui/material";
import { functionalities } from "./Utils/ColorThemes";
import Compass from "./Compass";
import CelestialBodies from "./Utils/CelestialBodies";
import Tracing from "./Utils/Tracing";

/* Helper functions calculating Sun and Moon Angles azimuth (horizontal angle) and altitude in radians */
const getSunAngles = (
  landmark: { lat: number; lng: number },
  start: Date,
  end: Date,
) => {
  const startAnglesSun = SunCalc.getPosition(start, landmark.lat, landmark.lng); //t-timeOffsetInMinutes
  const endAnglesSun = SunCalc.getPosition(end, landmark.lat, landmark.lng); //t+timeOffsetInMinutes

  return [
    startAnglesSun.azimuth,
    startAnglesSun.altitude,
    endAnglesSun.azimuth,
    endAnglesSun.altitude,
  ];
};

const getMoonAngles = (
  landmark: { lat: number; lng: number },
  start: Date,
  end: Date,
) => {
  const startAnglesMoon = SunCalc.getMoonPosition(
    start,
    landmark.lat,
    landmark.lng,
  );
  const endAnglesMoon = SunCalc.getMoonPosition(
    end,
    landmark.lat,
    landmark.lng,
  );

  return [
    startAnglesMoon.azimuth,
    startAnglesMoon.altitude,
    endAnglesMoon.azimuth,
    endAnglesMoon.altitude,
  ];
};

/* Find the distance vector of azimuth and altitude */
const getVectorFromAngles = (azimuth: number, altitude: number) => {
  const flippedAzimuth = azimuth - Math.PI;

  const x = Math.sin(flippedAzimuth) * Math.cos(altitude);
  const y = Math.cos(flippedAzimuth) * Math.cos(altitude);
  const z = Math.sin(altitude);

  return [x, y, z];
};

export interface ClientConfig {
  tileSideLength?: number;
  boundaries?: number[];
  estMaxHeight?: number;
  xStart?: number;
  yStart?: number;
  maxLod?: number;
  kPatchBase?: number;
  currentLod?: number;
  errorThreshold?: number;
  useCullingMetric?: boolean;
  useDistanceMetric?: boolean;
  useMinMaxForErrors?: boolean;
  maxGpuCache?: number;
  maxRamCache?: number;
  colorIsTiff?: boolean;
  colorIsJpeg?: boolean;
  heightIsTiff?: boolean;
  noColorTextures?: boolean;
  dynamicBinTreeUpdate?: boolean;
  dynamicBinTreeUpdateTreeLengthRatio?: number;
  dynamicBinTreeUpdateNotReadyRatio?: number;
  useGeomMetric?: boolean;
  initialCamera?: object;
  dollyCam?: object[];
}

interface TerrenderCanvasProps {
  config: ClientConfig;
  landmark?: L.LatLngExpression;
  time: number;
  date: Date;
  sliderElevation: number;
  sliderVisibility: number;
  toggledTopDown: boolean;
  setToggledTopDown: React.Dispatch<React.SetStateAction<boolean>>;
  setElevationCurrentCenter: React.Dispatch<React.SetStateAction<number>>;
  elevationCurrentCenter: number;
}

class CustomTerrender extends Terrender {
  preDrawCallback?: () => void = undefined;

  setPreDrawCallback = (func: () => void) => {
    this.preDrawCallback = func;
  };

  render = () => {
    if (this.preDrawCallback) {
      this.preDrawCallback();
    }
    this.drawDefault();
    if (this.drawCallback) {
      this.drawCallback();
    }
  };
}

/* When this zCoord is 1, Camera is at Horizon line => acts as a proportional offset */
const camHeightMultiplier = 1;
/* Time offsets in minutes for tracing => currently over interval of 1 hour 6 triangles are created */
const timeOffsets = [-30, -20, -10, 0, 10, 20, 30];

/**
 * @returns TerrenderCanvas
 * Canvas Component which renders Terrender fully as is according to config.
 * Where config is the output of processClientConfig.ts.
 */
const TerrenderCanvas: React.FC<TerrenderCanvasProps> = ({
  config,
  landmark: center,
  time,
  date,
  sliderElevation,
  sliderVisibility,
  toggledTopDown,
  setToggledTopDown,
  setElevationCurrentCenter,
  elevationCurrentCenter,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const terrenderRef = useRef<CustomTerrender | null>(null);
  const inputHandlerRef = useRef<StandardInputHandler | null>(null);
  const [didInitialDraw, setDidInitialDraw] = useState(false);
  const [topDownConfigs, setTopDownConfigs] = useState<
    | {
        position: number[];
        target: number[];
      }
    | undefined
  >();
  const isTopDown = Boolean(topDownConfigs);
  useEffect(() => {
    setToggledTopDown(isTopDown);
  }, [isTopDown, setToggledTopDown]);

  /* References for WebGL Objects */
  const skyquadRef = useRef<SkyQuadBlended | null>(null);
  const celestialBodiesRef = useRef<CelestialBodies | null>(null);
  const tracingRef = useRef<Tracing | null>(null);
  /* Compass direction/heading */
  const [currentDirection, setCurrentDirection] = useState<number>(0);

  /** Memo calculations for:
   *  - landmarkToCoordMemo: Convert LatLng to Coords
   *  - landmarkElevationMemo: Get Elevation at landmark
   *  - dateTimeMemo: Convert Date and Time to Date
   *  - distanceFactorMemo: Unit factor for sun tracing, the higher the factor the further the sun tracing. Factor is adjusted by sliderVisibility.
   */
  const landmarkToCoordMemo = useMemo(() => {
    if (center) {
      return convertLatLngToCoords(center);
    }
    return { lat: 0, lng: 0 }; /* return default value if no center provided */
  }, [center]);

  const landmarkElevationMemo = useMemo(() => {
    if (!center || !terrenderRef.current || !didInitialDraw) return 0;
    const { lat, lng } = convertLatLngToCoords(center);
    const elevation = terrenderRef.current
      .getQuadTree()
      .getHeightValue(lng, lat);
    return elevation;
  }, [center, terrenderRef, didInitialDraw]);

  const dateTimeMemo = useMemo(() => {
    if (date && time) {
      const currentDate = convertDateTime(date, time);
      return currentDate;
    }
    return new Date(); /* return default value if no time provided */
  }, [date, time]);

  const distanceFactorMemo = useMemo(() => {
    const distanceFactor = sliderVisibility;
    return distanceFactor;
  }, [sliderVisibility]);

  /* Memo calculations for tracing coordinates of the Sun and Moon */
  const tracingCoordsSun = useMemo(() => {
    if (!terrenderRef.current) {
      console.warn("Terrender not initialized");
      return;
    }

    const tracingPoints = [];

    const tenMinAngles = timeOffsets.map((timeDelta) => {
      return getSunAngles(
        landmarkToCoordMemo,
        new Date(dateTimeMemo.getTime() + timeDelta * 60000),
        new Date(dateTimeMemo.getTime() + (timeDelta + 10) * 60000),
      );
    });

    /* Basepoint = landmark, has to be calculated once */
    const p_0 = [
      landmarkToCoordMemo.lng,
      landmarkToCoordMemo.lat,
      landmarkElevationMemo *
        terrenderRef.current.getParameters().heightScaling,
    ];

    for (let i = 0; i < tenMinAngles.length - 1; i++) {
      if (tenMinAngles[i][1] > 0) {
        const v_1 = getVectorFromAngles(
          tenMinAngles[i][0],
          tenMinAngles[i][1],
        ); /* Start Angle => t-timeOffsetInMinutes */

        const v_2 = getVectorFromAngles(
          tenMinAngles[i][2],
          tenMinAngles[i][3],
        ); /* End Angle => t+timeOffsetInMinutes */

        /* Point deduced from the vector representing t-timeOffsetInMinutes */
        const p_1 = [
          p_0[0] - v_1[0] * distanceFactorMemo,
          p_0[1] - v_1[1] * distanceFactorMemo,
          p_0[2] - v_1[2] * distanceFactorMemo,
        ];
        /* Point deduced from the vector representing t+timeOffsetInMinutes */
        const p_2 = [
          p_0[0] - v_2[0] * distanceFactorMemo,
          p_0[1] - v_2[1] * distanceFactorMemo,
          p_0[2] - v_2[2] * distanceFactorMemo,
        ];

        tracingPoints.push(p_0, p_1, p_2, p_0);
      }
    }

    return tracingPoints;
  }, [
    dateTimeMemo,
    distanceFactorMemo,
    landmarkElevationMemo,
    landmarkToCoordMemo,
  ]);

  const tracingCoordsMoon = useMemo(() => {
    if (!terrenderRef.current) {
      console.warn("Terrender not initialized");
      return;
    }

    const tracingPoints = [];

    const tenMinAngles = timeOffsets.map((timeDelta) => {
      return getMoonAngles(
        landmarkToCoordMemo,
        new Date(dateTimeMemo.getTime() + timeDelta * 60000),
        new Date(dateTimeMemo.getTime() + (timeDelta + 10) * 60000),
      );
    });

    /* Basepoint = landmark, has to be calculated once */
    const p_0 = [
      landmarkToCoordMemo.lng,
      landmarkToCoordMemo.lat,
      landmarkElevationMemo *
        terrenderRef.current.getParameters().heightScaling,
    ];

    for (let i = 0; i < tenMinAngles.length - 1; i++) {
      if (tenMinAngles[i][1] > 0) {
        const v_1 = getVectorFromAngles(
          tenMinAngles[i][0],
          tenMinAngles[i][1],
        ); /* Start Angle => t-timeOffsetInMinutes */

        const v_2 = getVectorFromAngles(
          tenMinAngles[i][2],
          tenMinAngles[i][3],
        ); /* End Angle => t+timeOffsetInMinutes*/

        /* Point deduced from the vector representing t-timeOffsetInMinutes */
        const p_1 = [
          p_0[0] - v_1[0] * distanceFactorMemo,
          p_0[1] - v_1[1] * distanceFactorMemo,
          p_0[2] - v_1[2] * distanceFactorMemo,
        ];
        /* Point deduced from the vector representing t+timeOffsetInMinutes */
        const p_2 = [
          p_0[0] - v_2[0] * distanceFactorMemo,
          p_0[1] - v_2[1] * distanceFactorMemo,
          p_0[2] - v_2[2] * distanceFactorMemo,
        ];

        tracingPoints.push(p_0, p_1, p_2, p_0);
      }
    }

    return tracingPoints;
  }, [
    dateTimeMemo,
    distanceFactorMemo,
    landmarkElevationMemo,
    landmarkToCoordMemo,
  ]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const tracingCoordsShadowSun = useMemo(() => {
    const tenMinAngles = timeOffsets.map((timeDelta) => {
      const [startAzimuth, endAzimuth] = getSunAngles(
        landmarkToCoordMemo,
        new Date(dateTimeMemo.getTime() + timeDelta * 60000),
        new Date(dateTimeMemo.getTime() + (timeDelta + 10) * 60000),
      );
      return [startAzimuth, endAzimuth];
    });

    const combinedCoords = tenMinAngles.map((sunAzimuths) => {
      if (!terrenderRef.current) {
        console.warn("Terrender not initialized");
        return;
      }
      const coords = [
        [
          landmarkToCoordMemo.lng,
          landmarkToCoordMemo.lat,
          (landmarkElevationMemo + 1) *
            terrenderRef.current.getParameters().heightScaling,
        ],
        [
          ...translateCoords(
            landmarkToCoordMemo.lng,
            landmarkToCoordMemo.lat,
            500,
            toDeg(sunAzimuths[1]),
          ),
          0,
        ], //Sun azimuth at t+timeOffsetInMinutes
        [
          ...translateCoords(
            landmarkToCoordMemo.lng,
            landmarkToCoordMemo.lat,
            500,
            toDeg(sunAzimuths[0]),
          ),
          0,
        ], //Sun azimuth at t-timeOffsetInMinutes
        [
          landmarkToCoordMemo.lng,
          landmarkToCoordMemo.lat,
          landmarkElevationMemo *
            terrenderRef.current.getParameters().heightScaling,
        ],
      ];
      return coords;
    });

    return combinedCoords;
  }, [dateTimeMemo, landmarkToCoordMemo, landmarkElevationMemo]);

  /** Helper function setting setShouldRedrawCallback in Terrender
   *  - setShouldRedrawCallback is evaluated in renderLoop of Terrender. If true, it forces a render.
   *  - setRenderLoopCallback is called after renderLoop, with didDraw indicating if Terrender actually rendered something. This avoids terrender rendering in circles.
   */
  const forceRender = useCallback(() => {
    if (terrenderRef.current) {
      terrenderRef.current.setShouldRedrawCallback(() => true);
      terrenderRef.current.setRenderLoopCallback((didDraw: boolean) => {
        if (didDraw) terrenderRef.current?.setShouldRedrawCallback(() => false);
        /* Check if tile data is loaded */
        if (!didInitialDraw) {
          const rootTilesReady = !terrenderRef.current
            ?.getLoadingState()
            .isLoading();
          if (rootTilesReady && terrenderRef.current) setDidInitialDraw(true);
        }
      });
      /* Calling render loop of Terrender */
      terrenderRef.current.requestRender();
    }
  }, [didInitialDraw]);

  /* Setup of canvas */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas reference is not set");
      return;
    }

    const gl = canvas.getContext("webgl2");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    if (!config) {
      console.error("Config is not loaded");
      return;
    }

    try {
      /** Initialize Canvas objects and input handler */
      terrenderRef.current = new CustomTerrender(
        gl,
        config,
        config.initialCamera as object,
      );
      skyquadRef.current = new SkyQuadBlended(gl);
      celestialBodiesRef.current = new CelestialBodies(gl);
      tracingRef.current = new Tracing(gl, terrenderRef.current.getCamera());
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      terrenderRef.current.setEventBased(true);
      terrenderRef.current.setPreDrawCallback(() => {
        skyquadRef.current?.render();
        celestialBodiesRef.current?.renderPath();
        celestialBodiesRef.current?.renderPosition();
      });
      terrenderRef.current.setDrawCallback(() => {
        tracingRef.current?.renderTracingArea();
      });
      terrenderRef.current.setRenderLoopCallback(() => {
        /* Check if tile data is loaded */
        const rootTilesReady = !terrenderRef.current
          ?.getLoadingState()
          .isLoading();
        if (rootTilesReady && terrenderRef.current) {
          setDidInitialDraw(true);
        }
      });
      inputHandlerRef.current = new StandardInputHandler(terrenderRef.current);
      /* Start terrain rendering */
      terrenderRef.current.start();
    } catch (error) {
      console.error(
        "Failed to initialize any of the objects TerrenderCanvas, InputHandler, CelestialBodies:",
        error,
      );
    }

    /** Clean up:
     *  -Stop rendering loop
     *  -Release WebGL resources
     */
    return () => {
      if (terrenderRef.current) {
        terrenderRef.current.running = false;
        const gl = terrenderRef.current.getGl();
        const loseContext = gl.getExtension("WEBGL_lose_context");
        loseContext?.loseContext();
        terrenderRef.current = null;
        inputHandlerRef.current = null;
        skyquadRef.current = null;
        celestialBodiesRef.current = null;
      }
    };
  }, [config]);

  /** Sync skyQuad values */
  useEffect(() => {
    if (skyquadRef.current && terrenderRef.current) {
      if (center as L.LatLngExpression) {
        skyquadRef.current.syncDateTime(date, time, center);
        forceRender();
      }
    } else {
      console.warn(
        "useEffect failed as skyQuadRef.current || terrenderRef.current is null.",
      );
    }
  }, [center, date, forceRender, time]);

  /* Sync celestialBodies according to changing lat, lng, time, date, viewing direction */
  useEffect(() => {
    if (celestialBodiesRef.current) {
      celestialBodiesRef.current.updatePath(
        landmarkToCoordMemo.lat,
        landmarkToCoordMemo.lng,
        date,
        currentDirection,
        landmarkElevationMemo,
      );
      forceRender();
    }
  }, [
    date,
    forceRender,
    landmarkToCoordMemo.lat,
    landmarkToCoordMemo.lng,
    currentDirection,
    landmarkElevationMemo,
  ]);

  useEffect(() => {
    if (celestialBodiesRef.current) {
      celestialBodiesRef.current.updatePosition(
        landmarkToCoordMemo.lat,
        landmarkToCoordMemo.lng,
        dateTimeMemo,
        currentDirection,
        landmarkElevationMemo,
      );
      forceRender();
    }
  }, [
    forceRender,
    landmarkToCoordMemo.lat,
    landmarkToCoordMemo.lng,
    dateTimeMemo,
    currentDirection,
    landmarkElevationMemo,
  ]);

  /* Sync tracing Area */
  useEffect(() => {
    if (tracingRef.current) {
      if (tracingCoordsSun && tracingCoordsMoon) {
        tracingRef.current.updateTracingArea(
          new Float32Array(tracingCoordsSun.flat()),
          new Float32Array(tracingCoordsMoon.flat()),
        );
        forceRender();
      }
    }
  }, [forceRender, tracingCoordsMoon, tracingCoordsSun]);

  //TODO: bug with compass, moving compass, topDownMode, compass set to 0, disable topDownMode, compass !set to 0 + location incorrect
  useEffect(() => {
    if (!didInitialDraw || !terrenderRef.current || !center) return;

    if (center) {
      const { lat, lng } = convertLatLngToCoords(center);
      const elevation = terrenderRef.current
        .getQuadTree()
        .getHeightValue(lng, lat);
      setElevationCurrentCenter(elevation);

      const z =
        (elevation + sliderElevation) *
        terrenderRef.current.getParameters().heightScaling *
        camHeightMultiplier;

      if (isTopDown) {
        const topDownPosition = [lng, lat, 0.1];
        const topDownTarget = [lng, lat, 0];
        terrenderRef.current
          .getCamera()
          .lookAt(topDownPosition, topDownTarget, [0, 1, 0]);
      } else {
        const newPos = [lng, lat, z];
        const newTarget = [
          lng,
          ...terrenderRef.current.getCamera().target.slice(1),
        ];
        terrenderRef.current.getCamera().changeCamPosition(newPos, newTarget);
      }
    }
  }, [
    center,
    didInitialDraw,
    isTopDown,
    setElevationCurrentCenter,
    elevationCurrentCenter,
    sliderElevation,
  ]);

  /**
   * Toggles the camera view between top-down mode and the previous mode.
   * If top-down mode is enabled, it saves the current camera position and target,
   * then sets the camera to a top-down view. If top-down mode is disabled, it restores
   * the saved camera position and target.
   */
  const toggleTopDownMode = () => {
    if (terrenderRef.current) {
      /**
       * Reset top-down mode by restoring the camera's previous position and target.
       * This will disable the top-down view and revert to the original camera settings.
       */
      if (topDownConfigs) {
        terrenderRef.current
          .getCamera()
          .lookAt(topDownConfigs.position, topDownConfigs.target, [0, 0, 1]);
        setTopDownConfigs(undefined);
      } else {
        /* Enable topDown view, Keep track of prev values using setTopDownConfigs */
        const { position, target } = terrenderRef.current.getCamera();
        setTopDownConfigs({
          position,
          target,
        });

        const topDownPosition = [position[0], position[1], 0.1];
        const topDownTarget = [position[0], position[1], 0];
        terrenderRef.current
          .getCamera()
          .lookAt(topDownPosition, topDownTarget, [0, 1, 0]); /* y,x,z */
      }
    }
  };

  const [showMoonInfo, setShowMoonInfo] = useState(false);
  const hasShownMoonInfo = useRef(false);
  const [showSunInfo, setShowSunInfo] = useState(false);
  const hasShownSunInfo = useRef(false);
  useEffect(() => {
    if (
      tracingCoordsMoon &&
      tracingCoordsMoon.length > 0 &&
      !hasShownMoonInfo.current
    ) {
      setShowMoonInfo(true);
      hasShownMoonInfo.current = true;
    } else if (
      tracingCoordsSun &&
      tracingCoordsSun.length > 0 &&
      !hasShownSunInfo.current
    ) {
      setShowSunInfo(true);
      hasShownSunInfo.current = true;
    }
  }, [tracingCoordsMoon, tracingCoordsSun]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      />
      <div
        id="top-down-mode-button"
        style={{ position: "absolute", bottom: "1em", right: "1em" }}
      >
        <ThemeProvider theme={functionalities}>
          <Button
            color="secondary"
            variant="contained"
            onClick={toggleTopDownMode}
            size="small"
          >
            {topDownConfigs
              ? "Disable Top Down Camera"
              : "Enable Top Down Camera"}
          </Button>
        </ThemeProvider>
      </div>

      <Compass
        camera={terrenderRef.current?.getCamera()}
        setCurrentDirection={setCurrentDirection}
        currentDirection={currentDirection}
        topDown={toggledTopDown}
      ></Compass>

      <Portal>
        <Snackbar
          open={showMoonInfo}
          onClose={() => setShowMoonInfo(false)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            onClose={() => setShowMoonInfo(false)}
            severity="info"
            variant="filled"
            sx={{ width: "100%" }}
          >
            Blue triangles on terrain show moon position over time frame ±30
            minutes from current time. <br />
            Only visible when moon is above horizon. <br />
            If not visible, when moon is above horizon, please move around the
            terrain to make them appear in your field of view.
          </Alert>
        </Snackbar>

        <Snackbar
          open={showSunInfo}
          onClose={() => setShowSunInfo(false)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            onClose={() => setShowSunInfo(false)}
            severity="info"
            variant="filled"
            sx={{ width: "100%" }}
          >
            Yellow triangles on terrain show sun position over time frame ±30
            minutes from current time. <br />
            Only visible when sun is above horizon. <br />
            If not visible, when sun is above horizon, please move around the
            terrain to make them appear in your field of view.
          </Alert>
        </Snackbar>
      </Portal>
    </>
  );
};

export default TerrenderCanvas;
