//Translated this file from .js into .ts, the .js file was authored by Julian Croci.

import * as nconf from 'nconf';

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

const processClientConfig = (conf: nconf.Provider): ClientConfig => {
    let clientConfig: ClientConfig = conf.get('client') || {};

    // Set default values
    clientConfig = {
        tileSideLength: 257,
        boundaries: [-180, -90, 180, 90],
        estMaxHeight: 10000,
        xStart: 0,
        yStart: 0,
        maxLod: 7,
        kPatchBase: 129,
        currentLod: 7,
        errorThreshold: 0.01,
        useCullingMetric: true,
        useDistanceMetric: true,
        useMinMaxForErrors: false,
        maxGpuCache: 200,
        maxRamCache: 400,
        colorIsTiff: false,
        colorIsJpeg: false,
        heightIsTiff: true,
        noColorTextures: false,
        dynamicBinTreeUpdate: true,
        dynamicBinTreeUpdateTreeLengthRatio: 0.75,
        dynamicBinTreeUpdateNotReadyRatio: 0.2,
        ...clientConfig
    };

    // Set values that can be derived from server settings
    const geomFolder: string | undefined = conf.get('server:geomErrorFolder');
    clientConfig.useGeomMetric = geomFolder && clientConfig.useGeomMetric !== false ? true : false;

    const textureFolder: string | undefined = conf.get('server:textureAssets');
    clientConfig.noColorTextures = !clientConfig.noColorTextures && textureFolder ? false : true;

    // Handle cam settings
    if (!clientConfig.initialCamera) {
        clientConfig.initialCamera = {};
    }

    if (clientConfig.dollyCam && clientConfig.dollyCam.length > 0) {
        clientConfig.initialCamera = {
            ...clientConfig.initialCamera,
            ...(clientConfig.dollyCam[0] || {})
        };
    }

    return clientConfig;
};

export default processClientConfig;