import React from 'react';
import { useRef, useEffect, useState} from 'react';
import {Terrender, StandardInputHandler} from 'terrender-core';
import Button from '@mui/material/Button';

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

/**
 * @returns TerrenderCanvas
 * Canvas Component which renders Terrender fully as is according to config. 
 * Where config is the output of processClientConfig.ts.
*/
const TerrenderCanvas : React.FC<{config: ClientConfig}> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const terrenderRef = useRef<Terrender | null>(null);
  const inputHandlerRef = useRef<StandardInputHandler | null>(null);
  const [currentIsTopDownRef, setIsTopDownRef] = useState(false);
    
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
      /** Initialize Terrender and input handler */
      terrenderRef.current =new Terrender(gl, config, config.initialCamera as object);
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

  /**
   * Functionality Button which allows user to change to top down view of Terrender and back.
   * Makes use of @mui Button component:
   * * https://mui.com/material-ui/react-button/
   */
  const toggleTopDownMode = () => {
    if (inputHandlerRef.current) {
      const currentIsTopDown = inputHandlerRef.current.isTopDownMode();
      inputHandlerRef.current.setTopDownMode(!currentIsTopDown);
      setIsTopDownRef(!currentIsTopDown);
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
        {currentIsTopDownRef? 'Disable Top Down Mode' : 'Enable Top Down Mode'}
      </Button>
    </div>
    </>
  );
};

export default TerrenderCanvas;