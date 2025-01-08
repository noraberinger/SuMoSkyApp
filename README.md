# SuMoSkyApp: Interactive Sun, Moon, Night Sky and Landscape Viewer

## Description
The goal of this Bachelor Thesis is to develop a **web application** that enables **interactive analysis and visualization** of the **dynamic position of sun and moon** as seen from the Earth’s surface. It allows users to **explore and predict optimal conditions** by simulating different times, dates, and locations, while navigating a high-resolution terrain as well as a 2D Map.

### Key Features
- **3D Terrain:** 
    - Usage of [Terrender source code](https://gitlab.ifi.uzh.ch/vmml/webgisterrain/-/tree/master/terrender-core/src?ref_type=heads) for a smooth and high-quality terrain rendering.
- **2D Map:** 
    - Offers an efficient, clear and practical way of pinpointing a selected landmark.
    - Managing setting, editing, and removal of markers for selected points of interest. 
- **Celestial Bodies Sun and Moon:** 
    - Visualization of their dynamic positions, as well as their daily paths, rendered in both 2D and 3D environments. 
    - Additional information such as moon phase and important daylight hours such as golden and blue hour. 
    - Tracing Area feature enables users to select an area of interest for positioning their photography equipment, ensuring both the specified landmark and the celestial body of interest are in view. This feature is rendered directly onto the 3D Terrain, allowing users to analyse their position immediately and immersive.
- **Planning Tools:** 
    - Search field, calendar feature, and a time slider enables users to plan photography sessions based on precise location, date, and time. 
    - Plans of interest can be saved for later use.

## General Setup
- Clone this repository. The main branch contains the latest features as of the 15th of January 2025.
- The repository makes use of [WebGisTerrain](https://gitlab.ifi.uzh.ch/vmml/webgisterrain) [V2.0 branch](https://gitlab.ifi.uzh.ch/vmml/webgisterrain/-/tree/V2.0?ref_type=heads). The mentioned repository is linked using git sumbodule.
    - Run `git submodule init` after cloning this repo to your local machine.
    - In order to update the sumbodules execute `git submodule update --remote`.

### Using the Development Server
In order to provide real-time updates during development, this project uses webpack-dev-server.
To start the development server follow these steps:
- Ensure node.js and npm is installed.
- Navigate to the location of the client directory.
- Ensure all necessary packages found in packages.json are installed. For this execute `npm install`.
- Execute `npm run build` to build the project.
- Execute `npm start` in order to start the devServer at localhost:8080.

### Using the Production Server to run example data
To run the example data follow these steps:
- Ensure node.js and npm is installed.
- Navigate to the location of the server directory.
- Execute `npm install` in order to install the required node_modules.
- Execute `npm start` in order to start the server at localhost:3000.

## Notable changes made to the source code of [Terrender](https://gitlab.ifi.uzh.ch/vmml/webgisterrain/-/tree/master/terrender-core/src?ref_type=heads)
- In the file Camera.js in calculateMatrices changed `(this.projectionMatrix = m4.perspective(this.#fov, this.gl.canvas.width / this.gl.canvas.height, 0.01, 1000);`
to **`(this.projectionMatrix = m4.perspective(this.#fov, this.gl.canvas.width / this.gl.canvas.height,  0.0001, 100);`**. 
The change targets the near and far plane of the projectionMatrix. Please take note of this change and adjust it manually, as any local changes to the submodule are saved locally only and hence are overwritten once `git submodule update --remote` is executed.

## Required Data
The [configuration file](https://gitlab.ifi.uzh.ch/vmml/sumoskyapp/-/blob/main/packages/server/server-config.json?ref_type=heads) of the production server is by default set up to use the provided test data. Any geographical data used in this project was provided by the Visualization and MultiMedia Lab of the University of Zurich.


## License
This project is licensed under the MIT License.
For any Weather Data: Data provided by Open-Meteo, licensed under CC-BY 4.0
