import React, { useCallback } from "react";
import SunCalc from "suncalc";
import { useRef, useEffect, useState, useMemo } from "react";
import { Terrender, StandardInputHandler } from "terrender-core";
import Button from "@mui/material/Button";
//import TextField from "@mui/material/TextField";
import L from "leaflet";
import SkyQuadBlended from "./Utils/SkyQuadBlended";
import {
  convertDateTime,
  convertLatLngToCoords,
  calculateTriangleLegs,
  toDeg,
  translateCoords,
} from "./Utils/Calc";
import { ThemeProvider } from "@mui/material";
import { functionalities } from "./Utils/ColorThemes";
import Compass from "./Compass";
import CelestialBodies from "./Utils/CelestialBodies";
import Tracing from "./Utils/Tracing";

const getSunAngles = (
  landmark: { lat: number; lng: number },
  start: Date,
  end: Date,
) => {
  //Get Azimuth and Altitude using suncalc, this gives use the direction of the body in horizontal plane (horizontal angle) and the vertical angle respectively
  //t-n'
  const startAnglesSun = SunCalc.getPosition(start, landmark.lat, landmark.lng);
  //t+n'
  const endAnglesSun = SunCalc.getPosition(end, landmark.lat, landmark.lng);

  return [
    startAnglesSun.azimuth,
    startAnglesSun.altitude,
    endAnglesSun.azimuth,
    endAnglesSun.altitude,
  ];
};

//Find the vector of two angles
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

/** When this zCoord is 1 Camera is at Horizon line => acts as a proportional offset */
const camHeightMultiplier = 1;
/** Time offsets in minutes for tracing => currently over interval of 1 hour 6 triangles are created */
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
  /** For toggleTopDownMode and moveToLocation in topDown */
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

  /** References for WebGL Objects, drawn using function drawSky */
  const skyquadRef = useRef<SkyQuadBlended | null>(null);
  const celestialBodiesRef = useRef<CelestialBodies | null>(null);
  const tracingRef = useRef<Tracing | null>(null);
  /** Compass direction */
  const [currentDirection, setCurrentDirection] = useState<number>(0);

  /** Memo calculations for date, time, lat, lng */
  const landmarkToCoordMemo = useMemo(() => {
    if (center) {
      return convertLatLngToCoords(center);
    }
    //return default if no center provided
    return { lat: 0, lng: 0 };
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
    //return default now if no time provided
    return new Date();
  }, [date, time]);

  const distanceFactorMemo = useMemo(() => {
    /** Factor for sun tracing, adjusting distance by the specified number */
    const distanceFactor = sliderVisibility;
    return distanceFactor;
  }, [sliderVisibility]);

  const tracingCoordsSun2 = useMemo(() => {
    const tracingPoints = [];

    const tenMinAngles = timeOffsets.map((timeDelta) => {
      return getSunAngles(
        landmarkToCoordMemo,
        new Date(dateTimeMemo.getTime() + timeDelta * 60000),
        new Date(dateTimeMemo.getTime() + (timeDelta + 10) * 60000),
      );
    });

    //Basepoint = landmark, has to be calculated once
    const p_0 = [
      landmarkToCoordMemo.lng,
      landmarkToCoordMemo.lat,
      landmarkElevationMemo * 0.000025,
    ];

    for (let i = 0; i < tenMinAngles.length - 1; i++) {
      //Start Angle => t-n'
      const v_1 = getVectorFromAngles(tenMinAngles[i][0], tenMinAngles[i][1]);
      //End Angle => t+n'
      const v_2 = getVectorFromAngles(tenMinAngles[i][2], tenMinAngles[i][3]);

      //Point deduced from the vector representing t-n'
      const p_1 = [
        p_0[0] - v_1[0] * distanceFactorMemo,
        p_0[1] - v_1[1] * distanceFactorMemo,
        p_0[2] - v_1[2] * distanceFactorMemo,
      ];
      //Point deduced from the vector representing t+n'
      const p_2 = [
        p_0[0] - v_2[0] * distanceFactorMemo,
        p_0[1] - v_2[1] * distanceFactorMemo,
        p_0[2] - v_2[2] * distanceFactorMemo,
      ];

      tracingPoints.push(p_0, p_1, p_2, p_0);
    }

    return tracingPoints;
  }, [
    dateTimeMemo,
    distanceFactorMemo,
    landmarkElevationMemo,
    landmarkToCoordMemo,
  ]);

  const tracingCoordsShadowSun = useMemo(() => {
    /*
    const tenMinSunAzimuths = [-30, -20, -10, 0, 10, 20].map((timeDelta) => {
      return getSunAzimuths(
        new Date(dateTimeMemo.getTime() + timeDelta * 60000),
        new Date(dateTimeMemo.getTime() + timeDelta + 10 * 60000),
      );
    });

    const combinedCoords = tenMinSunAzimuths.map((sunAzimuths, index) => {
      const coords = [
        [
          landmarkToCoordMemo.lng,
          landmarkToCoordMemo.lat,
          landmarkElevationMemo * 0.000025 + 1,
        ],
        //Sun azimuth at t+n'
        [
          ...translateCoords(
            landmarkToCoordMemo.lng,
            landmarkToCoordMemo.lat,
            500,
            toDeg(sunAzimuths[1]),
          ),
          0,
        ],
        //Sun azimuth at t-n'
        [
          ...translateCoords(
            landmarkToCoordMemo.lng,
            landmarkToCoordMemo.lat,
            500,
            toDeg(sunAzimuths[0]),
          ),
          0,
        ],
        [
          landmarkToCoordMemo.lng,
          landmarkToCoordMemo.lat,
          landmarkElevationMemo * 0.000025,
        ],
      ];
      return coords;
    });

    return combinedCoords;
    */

    const sunAzimuths = getSunAngles(
      landmarkToCoordMemo,
      new Date(dateTimeMemo.getTime() - 30 * 60000),
      new Date(dateTimeMemo.getTime() + 30 * 60000),
    );

    //Angles are in radians due to suncalc
    return [
      [
        landmarkToCoordMemo.lng,
        landmarkToCoordMemo.lat,
        (landmarkElevationMemo + 1) * 0.000025,
      ], // get sun position TOOD => altitude vector => altitude angle
      //Sun azimuth at t+n'
      [
        ...translateCoords(
          landmarkToCoordMemo.lng,
          landmarkToCoordMemo.lat,
          500,
          toDeg(sunAzimuths[1]),
        ),
        0,
      ],
      //Sun azimuth at t-n'
      [
        ...translateCoords(
          landmarkToCoordMemo.lng,
          landmarkToCoordMemo.lat,
          500,
          toDeg(sunAzimuths[0]),
        ),
        0,
      ],
      [
        landmarkToCoordMemo.lng,
        landmarkToCoordMemo.lat,
        landmarkElevationMemo * 0.000025,
      ],
    ];
  }, [dateTimeMemo, landmarkToCoordMemo, landmarkElevationMemo]);

  /** Calculating average position between time-30' and t+30' for the Moon */
  const landmarkToMoonAzimuth = useMemo(() => {
    //Get Azimuth using suncalc, this gives use the direction of the body in horizontal plane (horizontal angle); direction from landmark to body
    const startAzimuthMoon = SunCalc.getMoonPosition(
      new Date(dateTimeMemo.getTime() - 30 * 60000),
      landmarkToCoordMemo.lat,
      landmarkToCoordMemo.lng,
    );
    const endAzimuthMoon = SunCalc.getMoonPosition(
      new Date(dateTimeMemo.getTime() + 30 * 60000),
      landmarkToCoordMemo.lat,
      landmarkToCoordMemo.lng,
    );

    return [endAzimuthMoon.azimuth, startAzimuthMoon.azimuth];
  }, [dateTimeMemo, landmarkToCoordMemo.lat, landmarkToCoordMemo.lng]);

  /** 
  const tracingCoordsMoon = useMemo(
    () =>
      translateCoords(
        landmarkToCoordMemo.lat,
        landmarkToCoordMemo.lng,
        3, // km TODO user settable => visibiliy sider, text field
        toDeg(landmarkToMoonAzimuth),
      ),
    [landmarkToCoordMemo, landmarkToMoonAzimuth],
  );*/

  const tracingCoordsMoon = useMemo(() => {
    //Angles are in radians due to suncalc
    return [
      [0, 0, 0], // get moon position TOOD
      ...calculateTriangleLegs(
        [
          landmarkToCoordMemo.lat,
          landmarkToCoordMemo.lng,
          landmarkElevationMemo,
        ],
        landmarkToMoonAzimuth[0],
        landmarkToMoonAzimuth[1],
        1,
      ),
      [landmarkToCoordMemo.lat, landmarkToCoordMemo.lng, landmarkElevationMemo],
    ];
  }, [
    landmarkElevationMemo,
    landmarkToCoordMemo.lat,
    landmarkToCoordMemo.lng,
    landmarkToMoonAzimuth,
  ]);

  // TODO button to toggle between center & compass | tracingCoords as center & tracingMiddleAngle-180 as heading

  //Helper function setting setShouldRedrawCallback in Terrender
  const forceRender = useCallback(() => {
    if (terrenderRef.current) {
      // setShouldRedrawCallback is evaluated in renderLoop of Terrender. If true, it forces a render.
      terrenderRef.current.setShouldRedrawCallback(() => true);
      // setRenderLoopCallback is called after renderLoop, with didDraw indicating if Terrender actually rendered something
      // used to disable redraw callback again, to avoid terrender rendering in circles
      terrenderRef.current.setRenderLoopCallback((didDraw: boolean) => {
        if (didDraw) terrenderRef.current?.setShouldRedrawCallback(() => false);
        /** Check if tile data is loaded */
        if (!didInitialDraw) {
          const rootTilesReady = !terrenderRef.current
            ?.getLoadingState()
            .isLoading();
          if (rootTilesReady && terrenderRef.current) setDidInitialDraw(true);
        }
      });
      // make Terrender call renderloop
      terrenderRef.current.requestRender();
    }
  }, [didInitialDraw]);

  /** Draw all elements except terrender => terrender will be drawn after setPreDrawCallback => drawCustom(drawSky) 
  const drawSky = useCallback((didDraw: boolean) => {
    if (didDraw && skyquadRef.current && celestialBodiesRef.current) {
      skyquadRef.current.render();
      celestialBodiesRef.current.renderPath();
      celestialBodiesRef.current.renderPosition();
    }
  }, []);*/

  //Set up canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas reference is not set");
      return;
    }

    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
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
        //tracingRef.current?.renderTracingArea();
      });
      terrenderRef.current.setDrawCallback(() => {
        tracingRef.current?.renderTracingArea();
      });
      terrenderRef.current.setRenderLoopCallback(() => {
        /** Check if tile data is loaded */
        const rootTilesReady = !terrenderRef.current
          ?.getLoadingState()
          .isLoading();
        if (rootTilesReady && terrenderRef.current) {
          setDidInitialDraw(true);
        }
      });
      inputHandlerRef.current = new StandardInputHandler(terrenderRef.current);
      /** Render terrain */
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

  //Sync celestialBodies when lat, lng, time or date changes
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

  //Tracing Hook
  useEffect(() => {
    if (tracingRef.current) {
      tracingRef.current.updateTracingArea(
        new Float32Array(tracingCoordsSun2.flat()),
        new Float32Array(tracingCoordsMoon.flat()),
      );
      forceRender();
    }
  }, [
    forceRender,
    tracingCoordsShadowSun,
    tracingCoordsMoon,
    tracingCoordsSun2,
  ]);

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
        /** 
        const newPos = [lng, lat, z];
        const newTarget = [
          lng,
          ...terrenderRef.current.getCamera().target.slice(1),
        ];*/
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
  //TODO: Bug when orientation is S normal, top down => N, normal => orientation S but compass heading N
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
        // Enable topDown view, Keep track of prev values using setTopDownConfigs
        const { position, target } = terrenderRef.current.getCamera();
        setTopDownConfigs({
          position,
          target,
        });

        const topDownPosition = [position[0], position[1], 0.1];
        const topDownTarget = [position[0], position[1], 0];
        terrenderRef.current
          .getCamera()
          .lookAt(topDownPosition, topDownTarget, [0, 1, 0]); // y,x,z
      }
    }
  };

  /** 
  const [positionZ, setPositionZ] = useState(0);

  const [targetZ, setTargetZ] = useState(0);

  const [initialUp, setInitialUp] = useState([0, 0, 1]);

  useEffect(() => {
    if (terrenderRef.current) {
      const { position, target } = terrenderRef.current.getCamera();
      const newPosition = [position[0], position[1], positionZ];
      const newTarget = [target[0], target[1], targetZ];
      console.log(
        "DEBUG lookingAt (p,t)",
        position,
        target,
        "-> (p,t)",
        newPosition,
        newTarget,
        "initialUp:",
        initialUp,
        terrenderRef.current.getCamera(),
      );
      terrenderRef.current
        .getCamera()
        .lookAt(newPosition, newTarget, initialUp);
    }
  }, [positionZ, targetZ, initialUp]);*/

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
        {/*
        <TextField
          type="number"
          label="positionZ"
          value={positionZ}
          onChange={(e) => setPositionZ(Number(e.target.value))}
        />
        <TextField
          type="number"
          label="targetZ"
          value={targetZ}
          onChange={(e) => setTargetZ(Number(e.target.value))}
        />
        <TextField
          type="number"
          label="initialUp[0]"
          value={initialUp[0]}
          onChange={(e) =>
            setInitialUp([Number(e.target.value), initialUp[1], initialUp[2]])
          }
        />
        <TextField
          type="number"
          label="initialUp[1]"
          value={initialUp[1]}
          onChange={(e) =>
            setInitialUp([initialUp[0], Number(e.target.value), initialUp[2]])
          }
        />
        <TextField
          type="number"
          label="initialUp[2]"
          value={initialUp[2]}
          onChange={(e) =>
            setInitialUp([initialUp[0], initialUp[1], Number(e.target.value)])
          }
        />*/}
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
    </>
  );
};

export default TerrenderCanvas;
