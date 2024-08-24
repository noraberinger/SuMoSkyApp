import React from 'react';
import { useRef, useEffect, useState} from 'react';
import TerrenderCanvas from './components/TerrenderCanvas';

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

//Fetch ClientConfig from Server -> result of processClientConfig
const App: React.FC = () => {
  const [clientConfig, setClientConfig] = useState<ClientConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (error) console.log(error);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/config');
        if (!response.ok){
          throw new Error(`HTTP error, status: ${response.status}`);
        }
        const data: ClientConfig = await response.json();
        setClientConfig(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        }
        else {
          setError('Unknown config error');
        }
      }
    };

    fetchConfig();
  }, []);

  return (
    <div>
      {clientConfig? <TerrenderCanvas config={clientConfig} />: <div>Loading config</div>}
      {error? <div>Error: {error}</div>:null}
    </div>
  );
};

export default App;
