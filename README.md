# SuMoSkyApp

## General Setup
Make sure to run `git submodule init` after cloning this repo to your local machine.
In order to update the sumbodules execute `git submodule update --remote`.

## Using the Development Server
In order to provide real-time updates during development, this project uses webpack-dev-server.
To start the development server follow these steps:
- Ensure node.js and npm is installed.
- Navigate to the location of the client directory.
- Ensure all necessary packages found in packages.json are installed. For this execute `npm install`.
- Execute `npm run build` to build the project.
- Execute `npm start` in order to start the devServer at localhost:8080.

## Using the Production Server to run example data
To run the example data follow these steps:
- Ensure node.js and npm is installed.
- Navigate to the location of the server directory.
- Execute `npm install` in order to install the required node_modules.
- Execute `npm start` in order to start the server at localhost:3000.

## Changes Terrender
Camera.js in calculateMatrices changed (this.projectionMatrix = m4.perspective(this.#fov, this.gl.canvas.width / this.gl.canvas.height, 0.01, 1000);
to (this.projectionMatrix = m4.perspective(this.#fov, this.gl.canvas.width / this.gl.canvas.height,  0.0001, 100);

## License
This project is licensed under the MIT License.
For any Weather Data: Data provided by Open-Meteo, licensed under CC-BY 4.0

---

# Editing this README

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.


## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
