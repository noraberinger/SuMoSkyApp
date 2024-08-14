"use strict";
//Translated this file from .js into .ts, the .js file was authored by Julian Croci.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const nconf_1 = __importDefault(require("nconf"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const processClientConfig_1 = __importDefault(require("./processClientConfig"));
const node_static_1 = require("node-static");
// Function to resolve paths
const resolvePath = (filePath) => {
    if (!filePath) {
        return undefined;
    }
    return path_1.default.isAbsolute(filePath) ? filePath : path_1.default.join(__dirname, filePath);
};
// Load configuration
const configFile = process.argv[2] || './server-config.json';
nconf_1.default.file(configFile);
const serverConfig = {
    hostname: nconf_1.default.get('server:hostname'),
    port: nconf_1.default.get('server:port'),
    heightAssets: resolvePath(nconf_1.default.get('server:heightAssets')),
    textureAssets: resolvePath(nconf_1.default.get('server:textureAssets')),
    geomErrorFolder: resolvePath(nconf_1.default.get('server:geomErrorFolder')),
    client: nconf_1.default.get('server:client') || 'client'
};
const hostname = serverConfig.hostname;
const port = serverConfig.port;
const heightAssetFolder = serverConfig.heightAssets;
const textureAssetFolder = serverConfig.textureAssets;
const geomErrorFolder = serverConfig.geomErrorFolder;
const client = serverConfig.client;
// Validate server type
if (!(client === 'client' || client === 'expert' || client === 'standard' || client === 'minimal' || client === 'noDrawingBench')) {
    console.error('Unknown server type: ' + client);
    process.exit(1);
}
// Process client configuration
const clientConfig = (0, processClientConfig_1.default)(nconf_1.default);
// Initialize express app and static server
const app = (0, express_1.default)();
const staticServer = new node_static_1.Server(`../${client}/public`);
// Handle height asset requests
const handleHeightAsset = async (req, res) => {
    const lod = parseInt(req.params.lod);
    const x = parseInt(req.params.xIndex);
    const y = parseInt(req.params.yIndex);
    const fileType = clientConfig.heightIsTiff ? '.tif' : '.png';
    const filePath = path_1.default.join(heightAssetFolder || '', lod.toString(), x.toString(), y.toString() + fileType);
    try {
        await fs_1.default.promises.access(filePath);
        res.sendFile(filePath);
    }
    catch {
        res.status(204).send(`Height map not found for LOD: ${lod} at ${x}/${y}`);
    }
};
// Handle texture asset requests
const handleTextureAsset = async (req, res) => {
    const lod = parseInt(req.params.lod);
    const x = parseInt(req.params.xIndex);
    const y = parseInt(req.params.yIndex);
    let fileType = '.png';
    if (clientConfig.colorIsTiff) {
        fileType = '.tif';
    }
    else if (clientConfig.colorIsJpeg) {
        fileType = '.jpg';
    }
    const filePath = path_1.default.join(textureAssetFolder || '', lod.toString(), x.toString(), y.toString() + fileType);
    try {
        await fs_1.default.promises.access(filePath);
        res.sendFile(filePath);
    }
    catch {
        res.status(204).send(`Texture not found for LOD: ${lod} at ${x}/${y}`);
    }
};
// Asset route handler
app.get('/asset/:type/:lod/:xIndex/:yIndex', (req, res) => {
    switch (req.params.type) {
        case 'height':
            handleHeightAsset(req, res);
            break;
        case 'texture':
            handleTextureAsset(req, res);
            break;
        default:
            res.status(400).send(`Unknown Asset Type: ${req.params.type}`);
    }
});
// Geometric error route handler
app.get('/geom/:lod/:kPatchBase', async (req, res) => {
    if (!geomErrorFolder) {
        res.status(204).send('No geometric errors provided');
        return;
    }
    const filePath = path_1.default.join(geomErrorFolder, `${req.params.lod}_${req.params.kPatchBase}.json`);
    try {
        await fs_1.default.promises.access(filePath);
        res.sendFile(filePath);
    }
    catch {
        res.status(204).send(`Geom Error not found for LOD: ${req.params.lod} with kPatchBase: ${req.params.kPatchBase}`);
    }
});
// Client config route
app.get('/config', (req, res) => {
    res.json(clientConfig);
});
// Serve static files
app.get('/*', (req, res) => {
    staticServer.serve(req, res);
});
// Start server
app.listen(port, hostname, () => {
    console.log(`Server running at ${hostname}:${port}`);
});
