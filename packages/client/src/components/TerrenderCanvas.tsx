import React, { useCallback } from "react";
import { useRef, useEffect, useState, useMemo } from "react";
import { Terrender, StandardInputHandler } from "terrender-core";
import Button from "@mui/material/Button";
import L from "leaflet";
import SkyQuadBlended from "./Utils/SkyQuadBlended";
import { convertDateTime, convertLatLngToCoords } from "./Utils/Calc";
import { ThemeProvider } from "@mui/material";
import { infoTheme } from "./Utils/ColorThemes";
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
  elevation: number;
  visibility: number;
  toggledTopDown: boolean;
  setToggledTopDown: React.Dispatch<React.SetStateAction<boolean>>;
  setSliderElevation: React.Dispatch<React.SetStateAction<number>>;
  setElevation: React.Dispatch<React.SetStateAction<number>>;
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
  elevation,
  visibility,
  toggledTopDown,
  setToggledTopDown,
  setSliderElevation,
  setElevation,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const terrenderRef = useRef<CustomTerrender | null>(null);
  const inputHandlerRef = useRef<StandardInputHandler | null>(null);
  const [didInitialDraw, setDidInitialDraw] = useState(false);
  /** For toggleTopDownMode and moveToLocation in topDown */
  const [topDownConfigs, setTopDownConfigs] = useState<
    | {
        initialUp: number[];
        position: number[];
        posZCoord: number;
        target: number[];
        targetXCoord: number;
        targetYCoord: number;
      }
    | undefined
  >();
  const topDownCamZCoord = 2;
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

  //TODO: supervisor referenced index.js to use setDrawCallback and not requestAnimationFrame => major calls to this function chelp...
  // let skyCall = 0;
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
      //debugger;
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
      );
      forceRender();
    }
  }, [date, forceRender, latLngToCoordsMemo.lat, latLngToCoordsMemo.lng]);

  useEffect(() => {
    if (celestialBodiesRef.current && terrenderRef.current) {
      celestialBodiesRef.current.updatePosition(
        latLngToCoordsMemo.lat,
        latLngToCoordsMemo.lng,
        dateTimeMemo,
      );
      forceRender();
    }
  }, [
    date,
    forceRender,
    latLngToCoordsMemo.lat,
    latLngToCoordsMemo.lng,
    dateTimeMemo,
  ]);

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
  const getTerrainHeight = useCallback(
    (lat: number, lng: number): number => {
      if (terrenderRef.current) {
        const elevation = terrenderRef.current
          .getQuadTree()
          .getHeightValue(lng, lat);
        setElevation(elevation);
        return elevation;
      } else {
        throw new TypeError("terrenderRef is undefined.");
      }
    },
    [setElevation],
  );

  const getTerrainPosition = useCallback(
    (
      latLng: L.LatLngExpression,
    ): { lat: number; lng: number; zCoord: number; newPos: number[] } => {
      const amplification = 4;

      if (terrenderRef.current) {
        const { lat, lng } = convertLatLngToCoords(latLng);
        const elevation = getTerrainHeight(lat, lng);
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
      console.log("moveToLocation latLng", latLng);
      /** If center changes while Camera is not in topDown => getCamera().target is [0, 0, 1]  */
      if (terrenderRef.current && !topDownConfigs) {
        // setSliderElevation(Math.round(newZ));
        const { newPos } = getTerrainPosition(latLng);
        const newTarget = terrenderRef.current.getCamera().target;
        newTarget[0] = newPos[0];
        terrenderRef.current.getCamera().changeCamPosition(newPos, newTarget);
        setCurrentDirection(0);
      } else if (terrenderRef.current && topDownConfigs) {
        /** If center changes while Camera is in topDown => getCamera().target is [0, 1, 0]*/
        // setSliderElevation(Math.round(newZ));
        const { zCoord, newPos } = getTerrainPosition(latLng);
        const initialUp = topDownConfigs.initialUp;
        const position = newPos;
        const posZCoord = zCoord;
        const target = topDownConfigs.target;
        const targetXCoord = target[0];
        const targetYCoord = target[1];
        setTopDownConfigs({
          initialUp,
          position,
          posZCoord,
          target,
          targetXCoord,
          targetYCoord,
        });
        setToggledTopDown(true);

        target[0] = position[0];
        position[2] = topDownCamZCoord;
        const newTarget = [position[0], position[1], 0];
        terrenderRef.current.getCamera().initialUp = [0, 1, 0];
        terrenderRef.current.getCamera().changeCamPosition(position, newTarget);
        setCurrentDirection(0);
      }
    },
    [getTerrainPosition, setToggledTopDown, topDownConfigs],
  );

  //TODO log what is happening
  const clipCamView = useCallback((visibility: number) => {
    if (terrenderRef.current) {
      const position = terrenderRef.current.getCamera().position;
      const newTarget = terrenderRef.current.getCamera().target;
      const amplification = 4;
      const scaling = 0.000025;
      const z = visibility * amplification * scaling;
      newTarget[2] = z;
      terrenderRef.current.getCamera().changeCamPosition(position, newTarget);
    }
  }, []);

  /** If center or elevation changes and didInitialDraw => moveToLocation.
   * - didInitialDraw is true when tiles finished loading.
   */
  //TODO: When loading setSliderElevation === 0, one initialization slider at 0 or set to actual elevation of position which is the elevation relative to terrain data. e.g. 0.507 for Zurich => slider set to 507m?
  useEffect(() => {
    console.log("didInitialDraw", didInitialDraw);
    if (center && didInitialDraw) {
      moveToLocation(center);
    }
  }, [center, didInitialDraw, moveToLocation]);

  //TODO: visibility make sure terrain not just disappears
  useEffect(() => {
    if (center && visibility && didInitialDraw) {
      clipCamView(visibility);
    }
  }, [visibility, didInitialDraw, center, clipCamView]);

  /**
   * Functionality Button which allows user to change to top down view of Terrender and back.
   * Makes use of @mui Button component:
   * * https://mui.com/material-ui/react-button/
   */
  const toggleTopDownMode = () => {
    if (inputHandlerRef.current && terrenderRef.current) {
      /** Reset topDownMode */
      if (topDownConfigs) {
        terrenderRef.current.getCamera().position[2] = topDownConfigs.posZCoord;
        terrenderRef.current.getCamera().initialUp = topDownConfigs.initialUp;
        terrenderRef.current.getCamera().target[0] =
          topDownConfigs.targetXCoord;
        terrenderRef.current.getCamera().target[1] =
          topDownConfigs.targetYCoord;
        terrenderRef.current
          .getCamera()
          .changeCamPosition(topDownConfigs.position, topDownConfigs.target);
        setTopDownConfigs(undefined);
        setToggledTopDown(false);
        setCurrentDirection(0);
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
        const position = terrenderRef.current.getCamera().position;
        const initialUp = terrenderRef.current.getCamera().initialUp;
        const posZCoord = position[2];
        const target = terrenderRef.current.getCamera().target;
        const targetXCoord = target[0];
        const targetYCoord = target[1];
        setTopDownConfigs({
          position,
          initialUp,
          posZCoord,
          target,
          targetXCoord,
          targetYCoord,
        });
        setToggledTopDown(true);

        position[2] = topDownCamZCoord;
        const newTarget = [position[0], position[1], 0];
        terrenderRef.current.getCamera().initialUp = [0, 1, 0];
        terrenderRef.current.getCamera().changeCamPosition(position, newTarget);
        setCurrentDirection(0);
      }
    }
  };

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
        <ThemeProvider theme={infoTheme}>
          <Button
            variant="contained"
            color="info"
            onClick={toggleTopDownMode}
            size="small"
          >
            {topDownConfigs ? "Disable Top Down Mode" : "Enable Top Down Mode"}
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
