import React, { useCallback } from "react";
import { useRef, useEffect, useState, useMemo } from "react";
import { Terrender, StandardInputHandler } from "terrender-core";
import Button from "@mui/material/Button";
//import TextField from "@mui/material/TextField";
import L from "leaflet";
import SkyQuadBlended from "./Utils/SkyQuadBlended";
import { convertDateTime, convertLatLngToCoords } from "./Utils/Calc";
import { ThemeProvider } from "@mui/material";
import { functionalities } from "./Utils/ColorThemes";
import Compass from "./Compass";
import CelestialBodies from "./Utils/CelestialBodies";

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
  center?: L.LatLngExpression;
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

/** Without this zCoord of Camera would be at Horizon line => acts as a proportional offset */
const camHeightMultiplier = 3.5;

/**
 * @returns TerrenderCanvas
 * Canvas Component which renders Terrender fully as is according to config.
 * Where config is the output of processClientConfig.ts.
 */
const TerrenderCanvas: React.FC<TerrenderCanvasProps> = ({
  config,
  center,
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
  /** Compass direction */
  const [currentDirection, setCurrentDirection] = useState<number>(0);

  /** Memo calculations for date, time, lat, lng */
  const latLngToCoordsMemo = useMemo(() => {
    if (center) {
      return convertLatLngToCoords(center);
    }
    //return default if no center provided
    return { lat: 0, lng: 0 };
  }, [center]);

  const dateTimeMemo = useMemo(() => {
    if (date && time) {
      const currentDate = convertDateTime(date, time);
      return currentDate;
    }
    //return default now if no time provided
    return new Date();
  }, [date, time]);

  //Helper function setting setShouldRedrawCallback in Terrender
  const forceRender = useCallback(() => {
    if (terrenderRef.current) {
      // setShouldRedrawCallback is evaluated in Terrender's renderLoop. if true, it forces a render
      terrenderRef.current.setShouldRedrawCallback(() => true);
      // setRenderLoopCallback is called after renderLoop, with didDraw indicating if Terrender actually rendered something
      // we'll use it to disable redraw callback again, to avoid terrender rendering in circles
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

  /** Draw all elements except terrender => terrender will be drawn after setPreDrawCallback => drawCustom(drawSky) */
  const drawSky = useCallback((didDraw: boolean) => {
    // skyCall++;
    ///  console.error("skycall", skyCall);
    if (didDraw && skyquadRef.current && celestialBodiesRef.current) {
      skyquadRef.current.render();
      celestialBodiesRef.current.renderPath();
      celestialBodiesRef.current.renderPosition();
    }
  }, []);

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
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      terrenderRef.current.setEventBased(true);
      terrenderRef.current.setPreDrawCallback(() => {
        terrenderRef.current?.drawCustom(drawSky);
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
  }, [config, drawSky]);

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
    if (celestialBodiesRef.current && terrenderRef.current) {
      celestialBodiesRef.current.updatePath(
        latLngToCoordsMemo.lat,
        latLngToCoordsMemo.lng,
        date,
        currentDirection,
      );
      forceRender();
    }
  }, [
    date,
    forceRender,
    latLngToCoordsMemo.lat,
    latLngToCoordsMemo.lng,
    currentDirection,
  ]);

  useEffect(() => {
    if (celestialBodiesRef.current && terrenderRef.current) {
      celestialBodiesRef.current.updatePosition(
        latLngToCoordsMemo.lat,
        latLngToCoordsMemo.lng,
        dateTimeMemo,
        currentDirection,
      );
      forceRender();
    }
  }, [
    date,
    forceRender,
    latLngToCoordsMemo.lat,
    latLngToCoordsMemo.lng,
    dateTimeMemo,
    currentDirection,
  ]);

  //TODO: visibility: farPlane zvector change in camera, projectiveProjection, convert z into real world with heightScaling Parameter, shader scalingFactor terrainRendering fragment shader make it white
  useEffect(() => {
    if (sliderVisibility) {
      return;
    }
  }, [sliderVisibility]);

  /** Calculates newPos and newTarget in order to move on terrain to a specified location.
   * - Coordinate system gl:
   *      x: horizontal, +x on right => lng: E,W;
   *      y: vertical, +y on top;  => lat: S,N
   *      z: backwards and forward, +z backwards => tilt.
   *  - newPos: [lng, lat, z], the new location of the camera. Camera is the center of the canvas.
   *  - newTarget: [lng, terrenderRef.current.getCamera().target[1], terrenderRef.current.getCamera().target[2]], the target of the camera. Camera looks at target.
   *  - elevation: raw elevation data for specific lng, lat point.
   *  - amplification: set to 4 such that observer height is set relative to height of terrain at specified lat, lng.
   */
  /** 
  const getTerrainHeight = useCallback((lat: number, lng: number): number => {
    if (terrenderRef.current) {
      const elevation = terrenderRef.current
        .getQuadTree()
        .getHeightValue(lng, lat);
      return elevation;
    } else {
      throw new TypeError("terrenderRef is undefined.");
    }
  }, []);

  const getTerrainPosition = useCallback(
    (
      latLng: L.LatLngExpression,
    ): { lat: number; lng: number; zCoord: number; newPos: number[] } => {
      if (terrenderRef.current) {
        const { lat, lng } = convertLatLngToCoords(latLng);
        const elevation = getTerrainHeight(lat, lng);
        //TODO: elevation + amplification as amplification is offset for elevation
        //Before: const z = elevation * terrenderRef.current.getParameters().heightScaling * amplification;
        const z =
          elevation *
          terrenderRef.current.getParameters().heightScaling *
          amplification;
        const position = [lng, lat, z];
        return { lat: lat, lng: lng, zCoord: z, newPos: position };
      } else {
        throw new TypeError("terrenderRef is undefined.");
      }
    },
    [getTerrainHeight],
  );

  const moveToLocation = useCallback(
    (latLng: L.LatLngExpression) => {
      console.log("DEBUG moveToLocation", latLng);
      // If center changes while Camera is not in topDown => getCamera().target is [0, 0, 1]  
      if (terrenderRef.current && !isTopDown) {
        const { newPos } = getTerrainPosition(latLng);
        const newTarget = [
          newPos[0],
          ...terrenderRef.current.getCamera().target.slice(1),
        ];
        terrenderRef.current.getCamera().changeCamPosition(newPos, newTarget);
        setCurrentDirection(0);
      } else if (terrenderRef.current && isTopDown) {
        // If center changes while Camera is in topDown => getCamera().target is [0, 1, 0]
        const { newPos } = getTerrainPosition(latLng);
        setTopDownConfigs((prevConfigs) =>
          prevConfigs
            ? {
                initialUp: prevConfigs.initialUp,
                position: newPos,
                target: [newPos[0], ...prevConfigs.target.slice(1)],
              }
            : undefined,
        );

        const newTarget = [newPos[0], newPos[1], 0];
        const newPosition = [newPos[0], newPos[1], topDownCamZCoord];
        terrenderRef.current
          .getCamera()
          .changeCamPosition(newPosition, newTarget);
        setCurrentDirection(0);
      }
    },
    [getTerrainPosition, isTopDown],
  );*/

  /** If center changes and didInitialDraw => moveToLocation.
   * - didInitialDraw is true when tiles finished loading.
   */
  /** 
  useEffect(() => {
    if (center && didInitialDraw) {
      moveToLocation(center);
      const { lat, lng } = convertLatLngToCoords(center);
      const elevation = getTerrainHeight(lat, lng);
      setElevationCurrentCenter(elevation);
    }
  }, [
    center,
    didInitialDraw,
    getTerrainHeight,
    moveToLocation,
    setElevationCurrentCenter,
  ]);

  useEffect(() => {
    if (terrenderRef.current) {
      const { position, target, initialUp } = terrenderRef.current.getCamera();
      const newPosition = [
        position[0],
        position[1],
        (elevationCurrentCenter + sliderElevation) *
          terrenderRef.current.getParameters().heightScaling *
          amplification,
      ];

      console.log(
        `DEBUG elevation change ${elevationCurrentCenter}, ${sliderElevation}`,
        position,
        initialUp,
        target,
        "newPosition",
        newPosition,
      );

      terrenderRef.current.getCamera().changeCamPosition(newPosition, target);
    } else {
      console.warn("terrenderRef is null in moveCamUpZCoord.");
    }
  }, [elevationCurrentCenter, sliderElevation]);*/

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

      console.log(
        "z",
        z,
        terrenderRef.current.getParameters().heightScaling,
        elevation,
      );
      if (isTopDown) {
        const newPosition = [lng, lat, 0.1];
        const newTarget = [lng, lat, 0];
        terrenderRef.current
          .getCamera()
          .lookAt(newPosition, newTarget, [0, 1, 0]);
      } else {
        const newPos = [lng, lat, z];
        const newTarget = [
          lng,
          ...terrenderRef.current.getCamera().target.slice(1),
        ];
        terrenderRef.current.getCamera().changeCamPosition(newPos, newTarget);
      }
      setCurrentDirection(0);
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
   * Functionality Button which allows user to change to top down view of Terrender and back.
   * Makes use of @mui Button component:
   * * https://mui.com/material-ui/react-button/
   */
  const toggleTopDownMode = () => {
    if (terrenderRef.current) {
      /** Reset topDownMode */
      if (topDownConfigs) {
        terrenderRef.current
          .getCamera()
          .lookAt(topDownConfigs.position, topDownConfigs.target, [0, 0, 1]);
        setTopDownConfigs(undefined);
      } else {
        /** Enable topDown view, Keep track of prev values using setTopDown.
         *  - Coordinate system gl:
         *      x: horizontal, +x on right;
         *      y: vertical, +y on top;
         *      z: backwards and forward, +z backwards.
         *  - position[2]: z-coordinate of current camera position.
         *  - target: [position[0], position[1], 0], camera looks at target => looks at current position, coordinates of target are therefore: [x: lng (E,W), y: lat (S,N), z: 0].
         *  - initialUp: v3[], "up" direction of the camera => vector pointing from inner centre in direction of the v3[].
         */
        const { position, target } = terrenderRef.current.getCamera();
        setTopDownConfigs({
          position,
          target,
        });

        const newPosition = [position[0], position[1], 0.1];
        const newTarget = [position[0], position[1], 0];
        terrenderRef.current
          .getCamera()
          .lookAt(newPosition, newTarget, [0, 1, 0]);
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
