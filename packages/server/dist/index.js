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
const node_static_1 = __importDefault(require("node-static"));
const processClientConfig_1 = __importDefault(require("./processClientConfig"));
// Load configuration file
const configFile = process.argv[2] || './server-config.json';
nconf_1.default.file({ file: configFile });
/**
 * Check if path relative or absolute, if relative prepend current directory
 * @param {string} p
 * @returns {string | undefined}
 */
const resolvePath = (p) => {
    if (!p) {
        return undefined;
    }
    if (p.startsWith('/')) {
        return p;
    }
    else {
        return path_1.default.join(__dirname, p);
    }
};
// Get configuration values
const hostname = nconf_1.default.get('server:hostname');
const port = nconf_1.default.get('server:port');
const heightAssetFolder = resolvePath(nconf_1.default.get('server:heightAssets')) || '';
const textureAssetFolder = resolvePath(nconf_1.default.get('server:textureAssets')) || '';
const geomErrorFolder = resolvePath(nconf_1.default.get('server:geomErrorFolder')) || '';
const type = nconf_1.default.get('server:type') || 'expert';
// Validate server type
const validTypes = ['expert'];
if (!validTypes.includes(type)) {
    console.error('Unknown server type: ' + type);
    process.exit(1);
}
// Process client config
const clientConfig = (0, processClientConfig_1.default)(nconf_1.default);
const app = (0, express_1.default)();
const staticServer = new node_static_1.default.Server(path_1.default.join('..', 'client', type, 'public'));
// Handle height asset requests
const handleHeightAsset = (req, res) => {
    const lod = Number.parseInt(req.params.lod, 10);
    const x = Number.parseInt(req.params.xIndex, 10);
    const y = Number.parseInt(req.params.yIndex, 10);
    const fileType = clientConfig.heightIsTiff ? '.tif' : '.png';
    const filePath = path_1.default.join(heightAssetFolder, lod.toString(), x.toString(), y.toString() + fileType);
    fs_1.default.promises.access(filePath).then(() => {
        res.sendFile(filePath);
    }).catch(() => {
        res.status(204).send('Height map not found for LOD: ' + lod + ' at ' + x + '/' + y);
    });
};
// Handle texture asset requests
const handleTextureAsset = (req, res) => {
    const lod = Number.parseInt(req.params.lod, 10);
    const x = Number.parseInt(req.params.xIndex, 10);
    const y = Number.parseInt(req.params.yIndex, 10);
    let fileType = '.png';
    if (clientConfig.colorIsTiff) {
        fileType = '.tif';
    }
    else if (clientConfig.colorIsJpeg) {
        fileType = '.jpg';
    }
    const filePath = path_1.default.join(textureAssetFolder, lod.toString(), x.toString(), y.toString() + fileType);
    fs_1.default.promises.access(filePath).then(() => {
        res.sendFile(filePath);
    }).catch(() => {
        res.status(204).send('Texture not found for LOD: ' + lod + ' at ' + x + '/' + y);
    });
};
// Routes
app.get('/asset/:type/:lod/:xIndex/:yIndex', (req, res) => {
    switch (req.params.type) {
        case 'height':
            handleHeightAsset(req, res);
            break;
        case 'texture':
            handleTextureAsset(req, res);
            break;
        default:
            res.status(400).send('Unknown Asset Type: ' + req.params.type);
    }
});
app.get('/geom/:lod/:kPatchBase', (req, res) => {
    if (!geomErrorFolder) {
        res.status(204).send('No geometric errors provided');
        return;
    }
    const filePath = path_1.default.join(geomErrorFolder, `${req.params.lod}_${req.params.kPatchBase}.json`);
    fs_1.default.promises.access(filePath).then(() => {
        res.sendFile(filePath);
    }).catch(() => {
        res.status(204).send('Geom Error not found for LOD: ' + req.params.lod + ' with kPatchBase: ' + req.params.kPatchBase);
    });
});
app.get('/config', (req, res) => {
    res.json(clientConfig);
});
app.get('/*', (req, res) => {
    staticServer.serve(req, res);
});
// Start the server
app.listen(port, hostname, () => {
    console.log('Server running at http://' + hostname + ':' + port);
});
