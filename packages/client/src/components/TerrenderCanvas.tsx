import React from 'react';
import { useRef, useEffect, useState} from 'react';
import {Terrender, StandardInputHandler} from 'terrender-core';
import Button from '@mui/material/Button';
import L, { LatLngExpression } from 'leaflet';
import SkyQuadBlended from './Utils/SkyQuadBlended';
import Sun from './Utils/Sun';
import Moon from './Utils/Moon';
import { convertLatLngToCoords } from './Utils/Calc';

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
  positionSun: {azimuth: number; altitude: number;}
  positionMoon: {azimuth: number; altitude: number;}
}

class CustomTerrender extends Terrender {
  preDrawCallback?: () => void = undefined;
  
  setPreDrawCallback = (func: () => void) => {
    this.preDrawCallback = func;
  }

  render = () =>  {
    this.preDrawCallback && this.preDrawCallback();
    this.drawDefault();
    this.drawCallback && this.drawCallback();
  }
}

class CustomInputHandler extends StandardInputHandler {
  minZoom: number;
  maxZoom: number;
  camera: any;
  constructor(terrender: Terrender, camera: any, minZoom: number, maxZoom: number) {
    super(terrender);
    this.camera = camera;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.onWheel = this.onWheelHandler.bind(this);
  }

  //TODO: Tried this to fix the overzoom effect => doesn't work aka this method is never called
  onWheelHandler(event: any) {
    event.preventDefault();
    let centerOffset = [
            (2 * event.offsetX - this.gl.canvas.width) / this.gl.canvas.width,
            - (2 * event.offsetY - this.gl.canvas.height) / this.gl.canvas.height,
    ];

    const zoomChange = -event.deltaY * this.sensitivity;
    const newZoomLevel = this.camera.position[2] + zoomChange;

    if (newZoomLevel < this.minZoom) {
      this.camera.position[2] = this.minZoom;
    } else if (newZoomLevel > this.maxZoom) {
      this.camera.position[2] = this.maxZoom;
    } else {
      this.camera.position[2] = newZoomLevel;
    }

    this.moveOnViewAxis(zoomChange, centerOffset);
  }
}

/**
 * @returns TerrenderCanvas
 * Canvas Component which renders Terrender fully as is according to config. 
 * Where config is the output of processClientConfig.ts.
*/
const TerrenderCanvas : React.FC<TerrenderCanvasProps> = ({ config, center, time, date, positionSun, positionMoon }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const terrenderRef = useRef<CustomTerrender | null>(null);
  const inputHandlerRef = useRef<StandardInputHandler | null>(null);
  const [didInitialDraw, setDidInitialDraw] = useState(false);
  /** For toggleTopDownMode and moveToLocation in topDown */
  const [topDown, setTopDown] = useState<{initialUp:number[]; position: number[]; posZCoord: number; target: number[]; targetXCoord: number; targetYCoord: number} | undefined>();  
  const topDownCamZCoord = 2;
  /** References for WebGL Objects, drawn using function drawSky */
  const skyquadRef = useRef<SkyQuadBlended | null>(null);
  const sunRef = useRef<Sun | null>(null);
  const moonRef = useRef<Moon | null>(null);

  /** Sync skyQuad values when DayTimeSlider or Calendar changes */
  useEffect(() => {
    if (skyquadRef.current && terrenderRef.current) {
      console.log("syncing date & time", date, time);
      if (center as L.LatLngExpression) {
        skyquadRef.current.syncDateTime(date, time, center);
        terrenderRef.current.setShouldRedrawCallback(() => true);
        terrenderRef.current.setRenderLoopCallback((didDraw: boolean) => didDraw && terrenderRef.current?.setShouldRedrawCallback(() => false));
        terrenderRef.current.requestRender();
      }
    }
  }, [date, time]);

  useEffect(() => {
    if (sunRef.current && terrenderRef.current) {
      console.log("syncing sun position", date, time, center);
      if (positionSun) {
        sunRef.current.animate(positionSun);
        terrenderRef.current.setShouldRedrawCallback(() => true);
        terrenderRef.current.setRenderLoopCallback((didDraw: boolean)=> didDraw &&terrenderRef.current?.setShouldRedrawCallback(() => false));
        terrenderRef.current.requestRender();
      }
    }
  }, [positionSun]);

  useEffect(() => {
    if (moonRef.current && terrenderRef.current) {
      console.log("syncing moon position", date, time, center);
      if (positionMoon) {
        moonRef.current.animate(positionMoon);
        terrenderRef.current.setShouldRedrawCallback(() => true);
        terrenderRef.current.setRenderLoopCallback((didDraw: boolean)=> didDraw &&terrenderRef.current?.setShouldRedrawCallback(() => false));
        terrenderRef.current.requestRender();
      }
    }
  }, [positionMoon]);
    
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas){
      console.error('Canvas reference is not set');
      return;
    }

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl){
      console.error('WebGL not supported');
      return;
    }

    if (!config){
      console.error('Config is not loaded');
      return;
    }

    try{
      /** Initialize Canvas objects and input handler */
      terrenderRef.current =new CustomTerrender(gl, config, config.initialCamera as object);
      skyquadRef.current = new SkyQuadBlended(gl, date, time, center);
      sunRef.current = new Sun(gl, positionSun);
      moonRef.current = new Moon(gl, positionMoon);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      terrenderRef.current.setEventBased(true);
      terrenderRef.current.setPreDrawCallback(() =>{
        terrenderRef.current?.drawCustom(drawSky);
     });
      terrenderRef.current.setRenderLoopCallback(() => {
        /** Check if tile data is loaded */
        const rootTilesReady = !terrenderRef.current?.getLoadingState().isLoading();
        if ( rootTilesReady && terrenderRef.current)  {
          setDidInitialDraw(true);
        }
      });
      //inputHandlerRef.current =new CustomInputHandler(terrenderRef.current, terrenderRef.current.getCamera(), 5, 10);
      inputHandlerRef.current = new StandardInputHandler(terrenderRef.current);
      /** Render terrain */
      terrenderRef.current.start();
    } catch (error){
      console.error('Failed to initialize Terrender or Input Handler:', error);
    }

    /** Clean up:
     *  -Stop rendering loop
     *  -Release WebGL resources
     */
    return () => {
      if (terrenderRef.current){
        terrenderRef.current.running = false;
        const gl = terrenderRef.current.getGl();
        const loseContext = gl.getExtension('WEBGL_lose_context');
        loseContext?.loseContext();
        terrenderRef.current = null;
        inputHandlerRef.current = null;
      }
    }
    
  }, [config]);

  /** Draw all elements except terrender. */
  const drawSky = (didDraw: boolean) => {
    if (didDraw && skyquadRef.current && sunRef.current && moonRef.current) {
      skyquadRef.current.render();
      sunRef.current.render();
      moonRef.current.render();
    }
  };  

  /** Calculates newPos and newTarget in order to move on terrain to a specified location.
   * - Coordinate system gl: 
         *      x: horizontal, +x on right => lng: E,W; 
         *      y: vertical, +y on top;  => lat: S,N
         *      z: backwards and forward, +z backwards => tilt.
   *  - newPos: [lng, lat, z], the new location of the camera. Camera is the center of the canvas.
   *  - newTarget: [lng, terrenderRef.current.getCamera().target[1], terrenderRef.current.getCamera().target[2]], the target of the camera. Camera looks at target.
   *  - elevation: raw elevation data for specific lng, lat point.
  */
  const getTerrainPosition = (latLng: L.LatLngExpression) : { lat: number; lng: number; zCoord: number; newPos: number[] } => {
    const amplification = 4;

    if (terrenderRef.current) {
      const { lat, lng } = convertLatLngToCoords(latLng);
      const elevation = terrenderRef.current.getQuadTree().getHeightValue(lng, lat);
      const z = elevation * terrenderRef.current.getParameters().heightScaling * amplification;
      const position = [lng, lat, z];
      return { lat: lat, lng: lng, zCoord: z, newPos: position};
    } else {
      throw new TypeError('terrenderRef is undefined.')
    }
  };
 
  const moveToLocation = (latLng: L.LatLngExpression) => {
    /** If center changes while Camera is not in topDown => getCamera().target is [0, 0, 1]  */
    if (terrenderRef.current && !topDown) {
      const { newPos } = getTerrainPosition(latLng);
      const newTarget = terrenderRef.current.getCamera().target;
      newTarget[0] = newPos[0];
      terrenderRef.current.getCamera().changeCamPosition(newPos, newTarget);
    } else if (terrenderRef.current && topDown) {
      /** If center changes while Camera is in topDown => getCamera().target is [0, 1, 0]*/
      const { zCoord, newPos } = getTerrainPosition(latLng);
      const initialUp = topDown.initialUp;
      const position = newPos;
      const posZCoord = zCoord;
      const target = topDown.target;
      const targetXCoord = target[0];
      const targetYCoord = target[1];
      setTopDown({initialUp, position, posZCoord, target, targetXCoord, targetYCoord});

      target[0] = position[0]
      position[2] = topDownCamZCoord;
      const newTarget = [position[0], position[1], 0];
      terrenderRef.current.getCamera().initialUp = [0, 1, 0];
      terrenderRef.current.getCamera().changeCamPosition(position, newTarget);
    }
  };
  
  /** If center changes and didInitialDraw => moveToLocation.
   * - didInitialDraw is true when tiles finished loading.
   */
  useEffect(() => {
    if (center && didInitialDraw) {
      moveToLocation(center);
    } 
  }, [center, didInitialDraw]);
 
  /**
   * Functionality Button which allows user to change to top down view of Terrender and back.
   * Makes use of @mui Button component:
   * * https://mui.com/material-ui/react-button/
   */
  const toggleTopDownMode = () => {
    if (inputHandlerRef.current && terrenderRef.current) {
      /** Reset topDownMode */
      if ( topDown ) { 
        terrenderRef.current.getCamera().position[2] = topDown.posZCoord;
        terrenderRef.current.getCamera().initialUp = topDown.initialUp;
        terrenderRef.current.getCamera().target[0] = topDown.targetXCoord;
        terrenderRef.current.getCamera().target[1] = topDown.targetYCoord;
        terrenderRef.current.getCamera().changeCamPosition(topDown.position, topDown.target);
        setTopDown(undefined);
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
        const initialUp  =  terrenderRef.current.getCamera().initialUp;
        const posZCoord = position[2]; 
        const target = terrenderRef.current.getCamera().target;
        const targetXCoord = target[0];
        const targetYCoord = target[1];
        setTopDown({position, initialUp, posZCoord, target, targetXCoord, targetYCoord});

        position[2] = topDownCamZCoord;
        const newTarget = [position[0], position[1], 0];
        terrenderRef.current.getCamera().initialUp = [0, 1, 0];
        terrenderRef.current.getCamera().changeCamPosition(position, newTarget);
      }
    }
  };
  
  return (
    <>
    <canvas
    ref={canvasRef}
    style={{
      width: '100%',
      height: '100%',
      overflow: 'hidden'}}
    />
    <div id='top-down-mode-button' style={{position: 'absolute', bottom: '1em', right: '1em'}}>
      <Button variant='contained' color='info' onClick={toggleTopDownMode} size='small'>
        {topDown ? 'Disable Top Down Mode' : 'Enable Top Down Mode'}
      </Button>
    </div>
    </>
  );
};

export default TerrenderCanvas;
