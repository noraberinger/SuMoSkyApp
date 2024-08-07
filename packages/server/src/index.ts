//Translated this file from .js into .ts, the .js file was authored by Julian Croci.

import express, { Request, Response } from 'express';
import nconf from 'nconf';
import fs from 'fs';
import path from 'path';
import nodeStatic from 'node-static';
import processClientConfig from './processClientConfig';

// Load configuration file
const configFile = process.argv[2] || './server-config.json';
nconf.file({ file: configFile });

/**
 * Check if path relative or absolute, if relative prepend current directory
 * @param {string} p
 * @returns {string | undefined}
 */
const resolvePath = (p: string): string | undefined => {
    if (!p) {
        return undefined;
    }
    if (p.startsWith('/')) {
        return p;
    } else {
        return path.join(__dirname, p);
    }
}

// Get configuration values
const hostname: string = nconf.get('server:hostname');
const port: number = nconf.get('server:port');
const heightAssetFolder: string = resolvePath(nconf.get('server:heightAssets')) || '';
const textureAssetFolder: string = resolvePath(nconf.get('server:textureAssets')) || '';
const geomErrorFolder: string = resolvePath(nconf.get('server:geomErrorFolder')) || '';
const type: string = nconf.get('server:type') || 'expert';

// Validate server type
const validTypes = ['expert'];
if (!validTypes.includes(type)) {
    console.error('Unknown server type: ' + type);
    process.exit(1);
}

// Process client config
const clientConfig = processClientConfig(nconf);

const app = express();
const staticServer = new nodeStatic.Server(path.join('..', 'client', type, 'public'));

// Handle height asset requests
const handleHeightAsset = (req: Request, res: Response): void => {
    const lod = Number.parseInt(req.params.lod, 10);
    const x = Number.parseInt(req.params.xIndex, 10);
    const y = Number.parseInt(req.params.yIndex, 10);
    const fileType = clientConfig.heightIsTiff ? '.tif' : '.png';
    const filePath = path.join(heightAssetFolder, lod.toString(), x.toString(), y.toString() + fileType);

    fs.promises.access(filePath).then(() => { 
        res.sendFile(filePath);
    }).catch(() => {
        res.status(204).send('Height map not found for LOD: ' + lod + ' at ' + x + '/' + y);
    });
}

// Handle texture asset requests
const handleTextureAsset = (req: Request, res: Response): void => {
    const lod = Number.parseInt(req.params.lod, 10);
    const x = Number.parseInt(req.params.xIndex, 10);
    const y = Number.parseInt(req.params.yIndex, 10);
    let fileType = '.png';

    if (clientConfig.colorIsTiff) {
        fileType = '.tif';
    } else if (clientConfig.colorIsJpeg) {
        fileType = '.jpg';
    }

    const filePath = path.join(textureAssetFolder, lod.toString(), x.toString(), y.toString() + fileType);

    fs.promises.access(filePath).then(() => { 
        res.sendFile(filePath);
    }).catch(() => {
        res.status(204).send('Texture not found for LOD: ' + lod + ' at ' + x + '/' + y);
    });
}

// Routes
app.get('/asset/:type/:lod/:xIndex/:yIndex', (req: Request, res: Response) => {
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

app.get('/geom/:lod/:kPatchBase', (req: Request, res: Response) => {
    if (!geomErrorFolder) {
        res.status(204).send('No geometric errors provided');
        return;
    }

    const filePath = path.join(geomErrorFolder, `${req.params.lod}_${req.params.kPatchBase}.json`);
    fs.promises.access(filePath).then(() => { 
        res.sendFile(filePath);
    }).catch(() => {
        res.status(204).send('Geom Error not found for LOD: ' + req.params.lod + ' with kPatchBase: ' + req.params.kPatchBase);
    });
});

app.get('/config', (req: Request, res: Response) => {
    res.json(clientConfig);
});

app.get('/*', (req: Request, res: Response) => {
    staticServer.serve(req, res);
});

// Start the server
app.listen(port, hostname, () => {
    console.log('Server running at http://' + hostname + ':' + port);
});
