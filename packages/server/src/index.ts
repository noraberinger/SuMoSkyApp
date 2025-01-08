/** Translated this file from .js into .ts, the .js file was authored by Julian Croci.
 * Further extended it for own use.
 */

import express, { Request, Response } from "express";
import nconf from "nconf";
import fs from "fs";
import path from "path";
import processClientConfig from "./processClientConfig";
import { Server as StaticServer } from "node-static";

// Define types for the config values
interface ServerConfig {
  hostname: string;
  port: number;
  heightAssets?: string;
  textureAssets?: string;
  geomErrorFolder?: string;
  textureFolder?: string;
}

interface ClientConfig {
  heightIsTiff: boolean;
  colorIsTiff: boolean;
  colorIsJpeg: boolean;
}

/* Function to resolve paths */
const resolvePath = (filePath: string): string | undefined => {
  if (!filePath) {
    return undefined;
  }
  return path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
};

/* Load configuration */
const configFile = process.argv[2] || "./server-config.json";
nconf.file(configFile);

const serverConfig: ServerConfig = {
  hostname: nconf.get("server:hostname") as string,
  port: nconf.get("server:port") as number,
  heightAssets: resolvePath(nconf.get("server:heightAssets") as string),
  textureAssets: resolvePath(nconf.get("server:textureAssets") as string),
  geomErrorFolder: resolvePath(nconf.get("server:geomErrorFolder") as string),
  textureFolder: resolvePath(nconf.get("server:textureFolder") as string),
};

const hostname = serverConfig.hostname;
const port = serverConfig.port;
const heightAssetFolder = serverConfig.heightAssets;
const textureAssetFolder = serverConfig.textureAssets;
const geomErrorFolder = serverConfig.geomErrorFolder;
const textureFolder = serverConfig.textureFolder;

/* Process client configuration */
const clientConfig = processClientConfig(nconf) as ClientConfig;

/* Initialize express app and static server */
const app = express();
const staticServer = new StaticServer(`../client/dist`);

/* Handle textureFolder */
if (textureFolder) {
  app.use("/textures", express.static(textureFolder));
} else {
  app.get("/textures", (req: Request, res: Response) => {
    res.status(404).send("No texture assets provided");
  });
}

/* UNCOMMENT IF ONE WANTS TO LOG ANY ERRORS */
//const errorFilePath = path.join(__dirname, "errorfile.json");

/* Handle height asset requests */
const handleHeightAsset = async (req: Request, res: Response) => {
  const lod = parseInt(req.params.lod);
  const x = parseInt(req.params.xIndex);
  const y = parseInt(req.params.yIndex);
  const fileType = clientConfig.heightIsTiff ? ".tif" : ".png";
  const filePath = path.join(
    heightAssetFolder || "",
    lod.toString(),
    x.toString(),
    y.toString() + fileType,
  );

  try {
    await fs.promises.access(filePath);
    res.sendFile(filePath);
  } catch {
    res.status(204).send(`Height map not found for LOD: ${lod} at ${x}/${y}`);
    /** UNCOMMENT IF ONE WANTS TO LOG ANY ERRORS
    fs.appendFileSync(
      errorFilePath,
      JSON.stringify(`Height: ${lod}/${x}/${y}`) + "\n",
    ); */
  }
};

// Handle texture asset requests
const handleTextureAsset = async (req: Request, res: Response) => {
  const lod = parseInt(req.params.lod);
  const x = parseInt(req.params.xIndex);
  const y = parseInt(req.params.yIndex);
  let fileType = ".png";

  if (clientConfig.colorIsTiff) {
    fileType = ".tif";
  } else if (clientConfig.colorIsJpeg) {
    fileType = ".jpg";
  }

  const filePath = path.join(
    textureAssetFolder || "",
    lod.toString(),
    x.toString(),
    y.toString() + fileType,
  );

  try {
    await fs.promises.access(filePath);
    res.sendFile(filePath);
  } catch {
    res.status(204).send(`Texture not found for LOD: ${lod} at ${x}/${y}`);
    /**
    fs.appendFileSync(
      errorFilePath,
      JSON.stringify(`Color: ${lod}/${x}/${y}`) + "\n",
    ); */
  }
};

// Asset route handler
app.get("/asset/:type/:lod/:xIndex/:yIndex", (req: Request, res: Response) => {
  switch (req.params.type) {
    case "height":
      handleHeightAsset(req, res);
      break;
    case "texture":
      handleTextureAsset(req, res);
      break;
    default:
      res.status(400).send(`Unknown Asset Type: ${req.params.type}`);
  }
});

// Geometric error route handler
app.get("/geom/:lod/:kPatchBase", async (req: Request, res: Response) => {
  if (!geomErrorFolder) {
    res.status(204).send("No geometric errors provided");
    return;
  }

  const filePath = path.join(
    geomErrorFolder,
    `${req.params.lod}_${req.params.kPatchBase}.json`,
  );
  try {
    await fs.promises.access(filePath);
    res.sendFile(filePath);
  } catch {
    res
      .status(204)
      .send(
        `Geom Error not found for LOD: ${req.params.lod} with kPatchBase: ${req.params.kPatchBase}`,
      );
  }
});

// Client config route
app.get("/config", (req: Request, res: Response) => {
  res.json(clientConfig);
});

// Serve static files
app.get("/*", (req: Request, res: Response) => {
  staticServer.serve(req, res);
});

// Start server
app.listen(port, hostname, () => {
  console.log(`Server running at ${hostname}:${port}`);
});
