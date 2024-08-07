"use strict";
//Translated this file from .js into .ts, the .js file was authored by Julian Croci.
Object.defineProperty(exports, "__esModule", { value: true });
const processClientConfig = (conf) => {
    let clientConfig = conf.get('client') || {};
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
    const geomFolder = conf.get('server:geomErrorFolder');
    clientConfig.useGeomMetric = geomFolder && clientConfig.useGeomMetric !== false ? true : false;
    const textureFolder = conf.get('server:textureAssets');
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
exports.default = processClientConfig;
