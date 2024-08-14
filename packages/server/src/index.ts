//Translated this file from .js into .ts, the .js file was authored by Julian Croci.

import express, { Request, Response } from 'express';
import nconf from 'nconf';
import fs from 'fs';
import path from 'path';
import processClientConfig from './processClientConfig';
import { Server as StaticServer } from 'node-static';

// Define types for the config values
interface ServerConfig {
    hostname: string;
    port: number;
    heightAssets?: string;
    textureAssets?: string;
    geomErrorFolder?: string;
    client: string;
}

interface ClientConfig {
    heightIsTiff: boolean;
    colorIsTiff: boolean;
    colorIsJpeg: boolean;
}

// Function to resolve paths
const resolvePath = (filePath: string): string | undefined => {
    if (!filePath) {
        return undefined;
    }
    return path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
};

// Load configuration
const configFile = process.argv[2] || './server-config.json';
nconf.file(configFile);

const serverConfig: ServerConfig = {
    hostname: nconf.get('server:hostname') as string,
    port: nconf.get('server:port') as number,
    heightAssets: resolvePath(nconf.get('server:heightAssets') as string),
    textureAssets: resolvePath(nconf.get('server:textureAssets') as string),
    geomErrorFolder: resolvePath(nconf.get('server:geomErrorFolder') as string),
    client: (nconf.get('server:client') as string) || 'client'
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
const clientConfig = processClientConfig(nconf) as ClientConfig;

// Initialize express app and static server
const app = express();
const staticServer = new StaticServer(`../${client}/public`);

// Handle height asset requests
const handleHeightAsset = async (req: Request, res: Response) => {
    const lod = parseInt(req.params.lod);
    const x = parseInt(req.params.xIndex);
    const y = parseInt(req.params.yIndex);
    const fileType = clientConfig.heightIsTiff ? '.tif' : '.png';
    const filePath = path.join(heightAssetFolder || '', lod.toString(), x.toString(), y.toString() + fileType);

    try {
        await fs.promises.access(filePath);
        res.sendFile(filePath);
    } catch {
        res.status(204).send(`Height map not found for LOD: ${lod} at ${x}/${y}`);
    }
};

// Handle texture asset requests
const handleTextureAsset = async (req: Request, res: Response) => {
    const lod = parseInt(req.params.lod);
    const x = parseInt(req.params.xIndex);
    const y = parseInt(req.params.yIndex);
    let fileType = '.png';

    if (clientConfig.colorIsTiff) {
        fileType = '.tif';
    } else if (clientConfig.colorIsJpeg) {
        fileType = '.jpg';
    }

    const filePath = path.join(textureAssetFolder || '', lod.toString(), x.toString(), y.toString() + fileType);

    try {
        await fs.promises.access(filePath);
        res.sendFile(filePath);
    } catch {
        res.status(204).send(`Texture not found for LOD: ${lod} at ${x}/${y}`);
    }
};

// Asset route handler
app.get('/asset/:type/:lod/:xIndex/:yIndex', (req: Request, res: Response) => {
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
app.get('/geom/:lod/:kPatchBase', async (req: Request, res: Response) => {
    if (!geomErrorFolder) {
        res.status(204).send('No geometric errors provided');
        return;
    }

    const filePath = path.join(geomErrorFolder, `${req.params.lod}_${req.params.kPatchBase}.json`);
    try {
        await fs.promises.access(filePath);
        res.sendFile(filePath);
    } catch {
        res.status(204).send(`Geom Error not found for LOD: ${req.params.lod} with kPatchBase: ${req.params.kPatchBase}`);
    }
});

// Client config route
app.get('/config', (req: Request, res: Response) => {
    res.json(clientConfig);
});

// Serve static files
app.get('/*', (req: Request, res: Response) => {
    staticServer.serve(req, res);
});

// Start server
app.listen(port, hostname, () => {
    console.log(`Server running at ${hostname}:${port}`);
});
