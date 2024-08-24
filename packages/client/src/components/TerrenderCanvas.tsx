import React from 'react';
import { useRef, useEffect, useState} from 'react';
import {Terrender, StandardInputHandler} from 'terrender-core';

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
 * Canvas Component which renders Terrender fully as is according to config. 
 * Where config is the output of processClientConfig.ts.
*/
const TerrenderCanvas : React.FC<{config: ClientConfig}> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const terrenderRef = useRef<Terrender | null>(null);
  const inputHandlerRef = useRef<StandardInputHandler | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas){
      console.error("Canvas reference is not set");
      return;
    }

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl){
      console.error("WebGL not supported");
      return;
    }

    if (!config){
      console.error("Config is not loaded");
      return;
    }

    try{
      //Initialize Terrender and input handler
      terrenderRef.current =new Terrender(gl, config, config.initialCamera as object);
      inputHandlerRef.current =new StandardInputHandler(terrenderRef.current);
      //Render terrain
      terrenderRef.current.start();
    } catch (error){
      console.error("Failed to initialize Terrender or Input Handler:", error);
    }

    /** Clean up:
     *  -Stop rendering loop
     *  -Release WebGL resources
     */
    return () => {
      if (terrenderRef.current){
        terrenderRef.current.running = false;
        const gl = terrenderRef.current.getGlInfo().getGl();
        const loseContext = gl.getExtension('WEBGL_lose_context');
        loseContext?.loseContext();
        terrenderRef.current = null;
        inputHandlerRef.current = null;
      }
    }
    
  }, [config]);
  
  return (
    <>
    <canvas style={{width:"100%", height:"100%"}} ref={canvasRef} />
    <div style={{position: "absolute", top: "2em", right: "2em"}}>
      <button type="button" onClick={() => setIsDrawing(prev => !prev)}>
        {isDrawing ? 'Disable Drawing' : 'Enable Drawing'}
      </button> 
      {isDrawing && (
        <div id="drawingContainer" className="container">
          <div id="lineContainer">
            <input type="color" id="colorPicker" defaultValue="#000000" />
            <label htmlFor="colorPicker">Color</label>
          </div>
          <div id="lineContainer">
            <input type="checkbox" id="deleteLine" />
            <label htmlFor="deleteLine">Delete Line</label>
          </div>
          <div id="lineContainer">
            <input type="number" defaultValue="0.5" step="0.1" id="lineWidth" />
            <label htmlFor="lineWidth">Line Width</label>
          </div>
          <div id="lineContainer">
            <button type="button" id="downloadLines">Download JSON</button>
          </div>
          <div id="lineContainer">
            <input type="file" id="uploadLinesFile" accept=".json" />
            <button id="uploadLines">Upload JSON</button>
          </div>
          <div id="fileError"></div>
        </div>
      )}
    </div>
    </>
  );
};

export default TerrenderCanvas;