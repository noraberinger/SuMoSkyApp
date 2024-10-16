import React from 'react';
import { useRef, useEffect, useState} from 'react';
import {Terrender, StandardInputHandler} from 'terrender-core';
import Button from '@mui/material/Button';
import { LatLngExpression } from 'leaflet';
import { Height, NumbersRounded } from '@mui/icons-material';
import { positionZurich } from './LeafletMap';

interface ClientConfig {
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
  center: LatLngExpression;
}

/**
 * @returns TerrenderCanvas
 * Canvas Component which renders Terrender fully as is according to config. 
 * Where config is the output of processClientConfig.ts.
*/
const TerrenderCanvas : React.FC<TerrenderCanvasProps> = ({ config, center }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const terrenderRef = useRef<Terrender | null>(null);
  const inputHandlerRef = useRef<StandardInputHandler | null>(null);
  const [didInitialDraw, setDidInitialDraw] = useState(false);
  /** For toggleTopDownMode and moveToLocation in topDown */
  const [topDown, setTopDown] = useState<{initialUp:number[]; position: number[]; posZCoord: number; target: number[]; targetXCoord: number; targetYCoord: number} | undefined>();  
  const topDownCamZCoord = 2;
    
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

    /** Drawing 3D object onto 2D WebGL RenderingContext */
    const drawSomething = (didDraw: boolean) => {
      if (didDraw) {
        // const gl = terrenderRef.current?.getGl();
        //TODO: Add fragment and vertex shader + add objects as context
      }
    }

    try{
      /** Initialize Terrender and input handler */
      terrenderRef.current =new Terrender(gl, config, config.initialCamera as object);
      terrenderRef.current.setRenderLoopCallback((didDraw: boolean, swapped: boolean) => {
        /** Check if tile data is loaded */
        const rootTilesReady = !terrenderRef.current?.getLoadingState().isLoading();
        // console.log("renderLoopCallback", rootTilesReady, terrenderRef.current?.getQuadTree().roots);
        if ( rootTilesReady )  {
          terrenderRef.current?.setRenderLoopCallback(drawSomething);
          setDidInitialDraw(true);
        }
      });
      inputHandlerRef.current =new StandardInputHandler(terrenderRef.current);
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
  
  /** Helper function to extract lat, lng from LatLngExpression */
  const convertLatLngToCoords = (latLng: LatLngExpression): { lat: number; lng: number } => {
    let lat: number;
    let lng: number;
    if(Array.isArray(latLng)) {
      lat = latLng[0], 
      lng = latLng[1];
    } else {
      lat = latLng.lat, 
      lng = latLng.lng;
    }
    return { lat, lng };
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

  const getTerrainPosition = (latLng: LatLngExpression) : { lat: number; lng: number; zCoord: number; newPos: number[] } => {
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
 

  const moveToLocation = (latLng: LatLngExpression) => {
    /** If center changes while Camera is not in topDown => getCamera().target is [0, 0, 1]  */
    if (terrenderRef.current && !topDown) {
      const { lat, lng, zCoord, newPos } = getTerrainPosition(latLng);
      const newTarget = terrenderRef.current.getCamera().target;
      newTarget[0] = newPos[0];
      terrenderRef.current.getCamera().changeCamPosition(newPos, newTarget);
    } else if (terrenderRef.current && topDown) {
      /** If center changes while Camera is in topDown => getCamera().target is [0, 1, 0]*/
      const { lat, lng, zCoord, newPos } = getTerrainPosition(latLng);
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
      height: '100%'}}
    />
    <div id='top-down-mode-button' style={{position: 'absolute', bottom: '1em', right: '1em'}}>
      <Button variant='contained' color='info' onClick={toggleTopDownMode} size='small'>
        {Boolean(topDown) ? 'Disable Top Down Mode' : 'Enable Top Down Mode'}
      </Button>
    </div>
    </>
  );
};

export default TerrenderCanvas;
