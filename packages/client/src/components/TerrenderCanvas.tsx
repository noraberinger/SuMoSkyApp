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
  //toDeg,
  //translateCoords,
  getTopDownUpVec,
  calculateCamTarget,
  positionTargetDistance,
} from "./Utils/Calc";
import { ThemeProvider, Snackbar, Alert, Portal } from "@mui/material";
import { functionalities } from "./Utils/ColorThemes";
import Compass from "./Compass";
import CelestialBodies from "./Utils/CelestialBodies";
import Tracing from "./Utils/Tracing";
import Camera from "terrender-core/src/Utils/Camera";
import * as twgl from "twgl.js";

/* Added vector types */
const m4 = twgl.m4;
const v3 = twgl.v3;

/* When this zCoord is 1, Camera is at Horizon line => acts as a proportional offset */
const camHeightMultiplier = 1.25;
/* Time offsets in minutes for tracing => currently over interval of 1 hour 6 triangles are created */
const timeOffsets = [-30, -20, -10, 0, 10, 20, 30];

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

/* Extending Terrender source code such that able to render before terrain is rendered => needed to render SkyQuadBlended and CelestialBodies */
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

/* Extending StandardInputHandler in order to make minor changes to provided moveOnViewAxis and moveRelativeToTerrain function */
class CustomInputHandler extends StandardInputHandler {
  #camera: Camera;
  constructor(
    terrender: Terrender,
    config?: { sensitivity: number; positionFactor: number },
  ) {
    super(terrender, config);
    this.#camera = terrender.getCamera();
  }

  /** moveOnViewAxis reimplemented with the change of using lookAt instead of changeCamPosition
   * - Necessary to keep the correct rotation while zooming in topdown mode
   * - up vector instead of initialUp vector is used
   */
  moveOnViewAxis = (value: number, offsetCenter = [0, 0]) => {
    value *=
      Math.sqrt(Math.max(this.#camera.position[2], 0)) * this.positionFactor;

    const rotationAroundUp = m4.axisRotation(
      this.#camera.up,
      (-offsetCenter[0] * this.#camera.fov) / 2,
    );
    const rotationAroundRight = m4.axisRotation(
      this.#camera.right,
      (offsetCenter[1] * this.#camera.vfov) / 2,
    );

    let changeDirection = m4.transformDirection(
      rotationAroundRight,
      this.#camera.viewDirection,
    );
    changeDirection = v3.normalize(
      m4.transformDirection(rotationAroundUp, changeDirection),
    );
    const changeVec = v3.mulScalar(changeDirection, value);
    const newPosition = v3.add(this.#camera.position, changeVec);
    const newTarget = v3.add(newPosition, this.#camera.viewDirection);

    if (newPosition[2] <= 0) {
      return;
    }

    this.#camera.lookAt([...newPosition], [...newTarget], this.#camera.up);
  };

  /** moveRelativeToTerrain reimplemented with the change of using lookAt instead of changeCamPosition
   * - Necessary to keep the correct rotation while panning in topdown mode
   * - up vector instead of initialUp vector is used
   */
  moveRelativeToTerrain = (deltaCoords: Array<number>) => {
    deltaCoords = deltaCoords.map((value) => {
      return (
        value * Math.max(this.#camera.position[2], 0) * this.positionFactor
      );
    });

    let { right } = this.#camera;
    let forward = this.isTopDownMode()
      ? this.#camera.up
      : this.#camera.viewDirection;
    right[2] = 0;
    forward[2] = 0;
    right = [...v3.mulScalar(v3.normalize(right), deltaCoords[0])];
    forward = [...v3.mulScalar(v3.normalize(forward), deltaCoords[1])];

    let newPos = v3.add(this.#camera.position, right);
    newPos = v3.add(newPos, forward);
    let newTarget = v3.add(this.#camera.target, right);
    newTarget = v3.add(newTarget, forward);
    this.#camera.lookAt([...newPos], [...newTarget], this.#camera.up);
  };
}

/* Logic for Snackbars such that only activated once */
const useToggleOnce = (): [boolean, () => void] => {
  const [toggle, setToggle] = useState(false);
  const [, setWasToggled] = useState(false);

  const setToggleOnce = useCallback(() => {
    setToggle((prevValue) => (prevValue ? false : prevValue));
    setWasToggled((prevValue) => {
      if (!prevValue) setToggle(true);
      return true;
    });
  }, []);

  return [toggle, setToggleOnce];
};

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
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const terrenderRef = useRef<CustomTerrender | null>(null);
  const inputHandlerRef = useRef<StandardInputHandler | null>(null);
  const [didInitialDraw, setDidInitialDraw] = useState(false);

  /* References for WebGL Objects */
  const skyquadRef = useRef<SkyQuadBlended | null>(null);
  const celestialBodiesRef = useRef<CelestialBodies | null>(null);
  const tracingRef = useRef<Tracing | null>(null);
  /* Compass direction/heading */
  const [currentDirection, setCurrentDirection] = useState<number>(0);
  /* Snackbar states for Sun and Moon tracing; and track if already shown => only show once */
  const [showMoonInfo, toggleMoonInfo] = useToggleOnce();
  const [showSunInfo, toggleSunInfo] = useToggleOnce();

  /** Memo calculations for:
   *  - landmarkToCoordMemo: Convert LatLng to Coords
   *  - landmarkElevationMemo: Get Elevation at landmark
   *  - dateTimeMemo: Convert Date and Time to Date
   *  - distanceFactorMemo: Unit factor for sun tracing, the higher the factor the further the sun tracing. Factor is adjusted by sliderVisibility.
   */
  const centerCoords = useMemo(() => {
    if (center) {
      return convertLatLngToCoords(center);
    }
    return { lat: 0, lng: 0 }; /* return default value if no center provided */
  }, [center]);

  const landmarkElevation = useMemo(() => {
    if (!center || !terrenderRef.current || !didInitialDraw) return 0;
    const { lat, lng } = convertLatLngToCoords(center);
    const elevation = terrenderRef.current
      .getQuadTree()
      .getHeightValue(lng, lat);
    return elevation;
  }, [center, terrenderRef, didInitialDraw]);

  const dateTime = useMemo(() => {
    if (date && time) {
      const currentDate = convertDateTime(date, time);
      return currentDate;
    }
    return new Date(); /* return default value if no time provided */
  }, [date, time]);

  const distanceFactor = useMemo(() => {
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
        centerCoords,
        new Date(dateTime.getTime() + timeDelta * 60000),
        new Date(dateTime.getTime() + (timeDelta + 10) * 60000),
      );
    });

    /* Basepoint = landmark, has to be calculated once */
    const p_0 = [
      centerCoords.lng,
      centerCoords.lat,
      landmarkElevation * terrenderRef.current.getParameters().heightScaling,
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
          p_0[0] - v_1[0] * distanceFactor,
          p_0[1] - v_1[1] * distanceFactor,
          p_0[2] - v_1[2] * distanceFactor,
        ];
        /* Point deduced from the vector representing t+timeOffsetInMinutes */
        const p_2 = [
          p_0[0] - v_2[0] * distanceFactor,
          p_0[1] - v_2[1] * distanceFactor,
          p_0[2] - v_2[2] * distanceFactor,
        ];

        tracingPoints.push(p_0, p_1, p_2, p_0);
      }
    }

    return tracingPoints;
  }, [dateTime, distanceFactor, landmarkElevation, centerCoords]);

  const tracingCoordsMoon = useMemo(() => {
    if (!terrenderRef.current) {
      console.warn("Terrender not initialized");
      return;
    }

    const tracingPoints = [];

    const tenMinAngles = timeOffsets.map((timeDelta) => {
      return getMoonAngles(
        centerCoords,
        new Date(dateTime.getTime() + timeDelta * 60000),
        new Date(dateTime.getTime() + (timeDelta + 10) * 60000),
      );
    });

    /* Basepoint = landmark, has to be calculated once */
    const p_0 = [
      centerCoords.lng,
      centerCoords.lat,
      landmarkElevation * terrenderRef.current.getParameters().heightScaling,
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
          p_0[0] - v_1[0] * distanceFactor,
          p_0[1] - v_1[1] * distanceFactor,
          p_0[2] - v_1[2] * distanceFactor,
        ];
        /* Point deduced from the vector representing t+timeOffsetInMinutes */
        const p_2 = [
          p_0[0] - v_2[0] * distanceFactor,
          p_0[1] - v_2[1] * distanceFactor,
          p_0[2] - v_2[2] * distanceFactor,
        ];

        tracingPoints.push(p_0, p_1, p_2, p_0);
      }
    }

    return tracingPoints;
  }, [dateTime, distanceFactor, landmarkElevation, centerCoords]);

  /** 
  // Activate this function in case you want to trace the coord of the Sun with a prism, instead of triangles on the terrain implemented above in tracingCoordsSun
  const tracingCoordsSunPrism = useMemo(() => {
    const tenMinAngles = timeOffsets.map((timeDelta) => {
      const [startAzimuth, endAzimuth] = getSunAngles(
        centerCoords,
        new Date(dateTime.getTime() + timeDelta * 60000),
        new Date(dateTime.getTime() + (timeDelta + 10) * 60000),
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
          centerCoords.lng,
          centerCoords.lat,
          (landmarkElevation + 1) *
            terrenderRef.current.getParameters().heightScaling,
        ],
        [
          ...translateCoords(
            centerCoords.lng,
            centerCoords.lat,
            500,
            toDeg(sunAzimuths[1]),
          ),
          0,
        ], //Sun azimuth at t+timeOffsetInMinutes
        [
          ...translateCoords(
            centerCoords.lng,
            centerCoords.lat,
            500,
            toDeg(sunAzimuths[0]),
          ),
          0,
        ], //Sun azimuth at t-timeOffsetInMinutes
        [
          centerCoords.lng,
          centerCoords.lat,
          landmarkElevation *
            terrenderRef.current.getParameters().heightScaling,
        ],
      ];
      return coords;
    });

    return combinedCoords;
  }, [dateTime, centerCoords, landmarkElevation]);
  */

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
      inputHandlerRef.current = new CustomInputHandler(terrenderRef.current);
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
        centerCoords.lat,
        centerCoords.lng,
        date,
        currentDirection,
        landmarkElevation,
      );
      forceRender();
    }
  }, [
    date,
    forceRender,
    centerCoords.lat,
    centerCoords.lng,
    currentDirection,
    landmarkElevation,
  ]);

  useEffect(() => {
    if (celestialBodiesRef.current) {
      celestialBodiesRef.current.updatePosition(
        centerCoords.lat,
        centerCoords.lng,
        dateTime,
        currentDirection,
        landmarkElevation,
      );
      forceRender();
    }
  }, [
    forceRender,
    centerCoords.lat,
    centerCoords.lng,
    dateTime,
    currentDirection,
    landmarkElevation,
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

  /* Reset terrain to initial state with the coords given in the input, e.g. when center is changed over SearchField */
  const resetTerrainToCoords = useCallback(
    (lat: number, lng: number) => {
      if (!didInitialDraw || !terrenderRef.current) return;

      /* Compass direction */
      const defaultDirection = 0;
      setCurrentDirection(defaultDirection);

      /* Calculate elevation at center */
      const elevation = terrenderRef.current
        .getQuadTree()
        .getHeightValue(lng, lat);
      setElevationCurrentCenter(elevation);

      /* Check if InputHandler is in top down mode and reset the camera position according to this check */
      if (inputHandlerRef.current?.isTopDownMode()) {
        /* Positioning of camera slighlty above target location */
        const topDownPosition = [lng, lat, 0.1];
        const topDownTarget = [lng, lat, 0];
        terrenderRef.current
          .getCamera()
          .changeCamPosition(topDownPosition, topDownTarget);
      } else {
        /* Calculate position z-value of camera and add sliderElevation if any */
        const z_position =
          (elevation + sliderElevation) *
          terrenderRef.current.getParameters().heightScaling *
          camHeightMultiplier;
        /* Target of camera takes target z-value without any additional elevation */
        const z_target =
          elevation *
          terrenderRef.current.getParameters().heightScaling *
          camHeightMultiplier;

        /* Set camera and target, where target is calculated according to a compass heading of 0°, a distance of 100, the z-value corresponding to the height of the terrain and the camera's positon */
        const newPos = [lng, lat, z_position];
        const newTarget = calculateCamTarget(
          defaultDirection,
          100,
          z_target,
          newPos,
        );
        terrenderRef.current.getCamera().changeCamPosition(newPos, newTarget);
      }
    },
    [didInitialDraw, setElevationCurrentCenter, sliderElevation],
  );

  /* When Compass updates cardinal direction setDirection is called and rotates camera, no change of position and target of camera instead use of lookAt function */
  const setDirection = useCallback(
    (newDirection: number) => {
      const camera = terrenderRef.current?.getCamera();
      if (!camera) return;

      setCurrentDirection(newDirection);

      if (toggledTopDown) {
        /* Calculate rotation around up vector using the new direction */
        const up = getTopDownUpVec(newDirection);
        camera.lookAt(camera.position, camera.target, up);
      } else {
        /* Calculate rotation around camera target according to new direction, while preserving distance between camera position and camera target, and z-value. */
        const newTarget = calculateCamTarget(
          newDirection,
          positionTargetDistance(camera.position, camera.target),
          camera.target[2],
          camera.position,
        );
        camera.changeCamPosition(camera.position, newTarget);
      }
    },
    [toggledTopDown],
  );

  /* Reset terrain when center changes => this makes sure the terrain is always reset to the initial state using the memoized coords */
  useEffect(() => {
    if (centerCoords.lat && centerCoords.lng)
      resetTerrainToCoords(centerCoords.lat, centerCoords.lng);
  }, [centerCoords.lat, centerCoords.lng, resetTerrainToCoords]);

  /* Toggle of Enable/Disable Top Down Camera Button */
  const toggleTopDown = useCallback(
    (enable: boolean) => {
      inputHandlerRef.current?.setTopDownMode(enable);
      setToggledTopDown(enable);
      /* Reset to initial state using the memoized coords */
      resetTerrainToCoords(centerCoords.lat, centerCoords.lng);
    },
    [
      setToggledTopDown,
      resetTerrainToCoords,
      centerCoords.lat,
      centerCoords.lng,
    ],
  );

  /* Snackbars with information on tracing areas; set up such that only triggered once */
  useEffect(() => {
    if (tracingCoordsSun && tracingCoordsSun.length > 0) {
      toggleSunInfo();
    }
  }, [toggleSunInfo, tracingCoordsSun]);

  useEffect(() => {
    if (tracingCoordsMoon && tracingCoordsMoon.length > 0) {
      toggleMoonInfo();
    }
  }, [toggleMoonInfo, tracingCoordsMoon]);

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
            onClick={() => toggleTopDown(!toggledTopDown)}
            size="small"
          >
            {toggledTopDown
              ? "Disable Top Down Camera"
              : "Enable Top Down Camera"}
          </Button>
        </ThemeProvider>
      </div>

      <Compass
        setDirection={setDirection}
        direction={currentDirection}
      ></Compass>

      <Portal>
        <Snackbar
          open={showMoonInfo}
          onClose={toggleMoonInfo}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            onClose={toggleMoonInfo}
            severity="info"
            variant="filled"
            sx={{ width: "100%" }}
          >
            Blue triangles on terrain trace the moon position over a time frame
            ±30 minutes from current time. <br />
            Only visible when moon is above horizon. <br />
            If not visible, when moon is above horizon, please move around the
            terrain to make them appear in your field of view.
          </Alert>
        </Snackbar>

        <Snackbar
          open={showSunInfo}
          onClose={toggleSunInfo}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            onClose={toggleSunInfo}
            severity="info"
            variant="filled"
            sx={{ width: "100%" }}
          >
            Yellow triangles on terrain trace the sun position over a time frame
            ±30 minutes from current time. <br />
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
