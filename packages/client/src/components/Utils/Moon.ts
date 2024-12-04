"use strict";
import * as twgl from "twgl.js";
import moonFs from "../shaders/moon.frag";
import moonVs from "../shaders/moon.vert";
import pathFs from "../shaders/path.frag";
import pathVs from "../shaders/path.vert";
import Camera from "terrender-core/src/Utils/Camera";

class Moon {
  private gl: WebGL2RenderingContext | WebGLRenderingContext;
  private textures: { moonTexture: WebGLTexture | null };
  private shaderProgramInfo: twgl.ProgramInfo;
  private shaderProgram: WebGLProgram | null;
  private bufferInfo: twgl.BufferInfo;
  private pathShaderProgramInfo: twgl.ProgramInfo;
  private pathShaderProgram: WebGLProgram | null;
  private pathBufferInfo: twgl.BufferInfo;
  //private position: { x: number; y: number; z: number };
  private position2D: { x: number; y: number };
  private radius: number;
  private camera: Camera;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(
    gl: WebGL2RenderingContext | WebGLRenderingContext,
    positionMoon: { azimuth: number; altitude: number },
    camera: Camera,
    positionMoonArray: {
      time: Date;
      azimuth: number;
      altitude: number;
      distance: number;
    }[],
  ) {
    this.gl = gl;
    this.camera = camera;
    this.canvasWidth = this.gl.canvas.width;
    this.canvasHeight = this.gl.canvas.height;
    this.textures = { moonTexture: null };
    this.radius = 1;
    this.shaderProgramInfo = twgl.createProgramInfo(this.gl, [moonVs, moonFs]);
    this.shaderProgram = this.shaderProgramInfo.program;
    this.bufferInfo = this.createQuadBuffer();
    this.pathShaderProgramInfo = twgl.createProgramInfo(this.gl, [
      pathVs,
      pathFs,
    ]);
    this.pathShaderProgram = this.pathShaderProgramInfo.program;
    //this.pathBufferInfo = this.createPathBuffer(positionMoonArray);
    this.pathBufferInfo = this.createPathBuffer2D(positionMoonArray);
    //this.position = this.calcPosition(positionMoon, 1);
    this.position2D = this.calcPosition2D(positionMoon);
    this.setupTextures();
  }

  /** Create a simple Quad */
  private createQuadBuffer(): twgl.BufferInfo {
    const arrays = {
      position: {
        numComponents: 3,
        data: [-0.05, -0.05, 0, 0.05, -0.05, 0, -0.05, 0.05, 0, 0.05, 0.05, 0],
      },
      texcoord: { numComponents: 2, data: [0, 0, 1, 0, 0, 1, 1, 1] },
      indices: [0, 1, 2, 2, 1, 3],
    };
    return twgl.createBufferInfoFromArrays(this.gl, arrays);
  }

  /** Create Arc */
  private createPathBuffer(
    positionMoonArray: {
      time: Date;
      azimuth: number;
      altitude: number;
      distance: number;
    }[],
  ): twgl.BufferInfo {
    const path = [];

    for (const position of positionMoonArray) {
      const { azimuth, altitude } = position;
      const { x, y, z } = this.calcPosition({ azimuth, altitude }, 1);
      path.push(x, y, z);
    }

    const firstPoint = path.slice(0, 3);
    path.push(...firstPoint);

    return twgl.createBufferInfoFromArrays(this.gl, {
      position: { numComponents: 3, data: new Float32Array(path) },
    });
  }

  private createPathBuffer2D(
    positionMoonArray: {
      time: Date;
      azimuth: number;
      altitude: number;
      distance: number;
    }[],
  ): twgl.BufferInfo {
    const path = [];

    for (const position of positionMoonArray) {
      const { azimuth, altitude } = position;
      const { x, y } = this.calcPosition2D({ azimuth, altitude });
      path.push(x, y);
    }

    const firstPoint = path.slice(0, 2);
    path.push(...firstPoint);

    return twgl.createBufferInfoFromArrays(this.gl, {
      position: { numComponents: 2, data: new Float32Array(path) },
    });
  }

  /** Create textures. */
  private setupTextures(): void {
    const moonUrl = "/textures/moon.png";

    this.textures.moonTexture = twgl.createTexture(this.gl, {
      src: moonUrl,
    });
  }

  private calcPosition(
    positionMoon: { azimuth: number; altitude: number },
    radius: number,
  ): {
    x: number;
    y: number;
    z: number;
  } {
    this.radius = radius;

    //positionMoon is in radians => for spherical coords
    const x =
      this.radius *
      Math.cos(positionMoon.altitude) *
      Math.cos(positionMoon.azimuth);
    const y =
      this.radius *
      Math.cos(positionMoon.altitude) *
      Math.sin(positionMoon.azimuth);
    const z = this.radius * Math.sin(positionMoon.altitude);

    return { x, y, z };
  }

  private calcPosition2D(positionMoon: { azimuth: number; altitude: number }): {
    x: number;
    y: number;
  } {
    const x = (positionMoon.azimuth / (2 * Math.PI)) * this.canvasWidth;
    const y = (1 - positionMoon.altitude / Math.PI) * this.canvasHeight;

    return { x, y };
  }

  /** 
  private updatePosition(x: number, y: number, z: number): void {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
  } */

  private updatePosition2D(x: number, y: number): void {
    this.position2D.x = x;
    this.position2D.y = y;
  }

  private calculateMatrices(): void {
    this.camera.calculateMatrices();
  }

  /** In case of change in location create new buffer => correct orbit for that location */
  public updateBuffer(
    positionMoonArray: {
      time: Date;
      azimuth: number;
      altitude: number;
      distance: number;
    }[],
  ): void {
    //his.pathBufferInfo = this.createPathBuffer(positionMoonArray);
    this.pathBufferInfo = this.createPathBuffer2D(positionMoonArray);
    this.renderPath();
  }

  /** Sun movement over 24hours */
  public animate(positionMoon: { azimuth: number; altitude: number }) {
    //const { x, y, z } = this.calcPosition(positionMoon, 1);
    //this.updatePosition(x, y, z);
    const { x, y } = this.calcPosition2D(positionMoon);
    this.updatePosition2D(x, y);
    this.render();
  }

  /** Render using a blendFactor to blend from dayTexture to nightTexture according to the sliderValue. */
  public render(): void {
    this.gl.disable(this.gl.DEPTH_TEST);
    //this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    //viewProjectionMatrix will not be undefined as defined using calculateMatrices method in Camera.js on initialization of Terrender in TerrenderCanvas
    this.calculateMatrices();
    if (this.camera.viewMatrix && this.camera.projectionMatrix) {
      let mvp = twgl.m4.identity();
      /** 
      const scaleFactorSize = 0.1;
      mvp = twgl.m4.scale(
        mvp,
        [scaleFactorSize, scaleFactorSize, scaleFactorSize],
        mvp,
      );

      
      const clipPos = twgl.m4.transformPoint(this.viewProjectionMatrix, [
        this.position.x,
        this.position.y,
        this.position.z,
      ]);

      mvp = twgl.m4.translate(mvp, [clipPos[0], clipPos[1], clipPos[2]]); 

      mvp = twgl.m4.translate(mvp, [
        this.position.x,
        this.position.y,
        this.position.z,
      ]);

      console.log("xyz", this.position.x, this.position.y, this.position.z); */

      mvp = twgl.m4.translate(mvp, [this.position2D.x, this.position2D.y]);

      //console.log("clipPos", clipPos);
      //console.log("mvp", mvp);

      this.gl.useProgram(this.shaderProgram);

      if (this.shaderProgram && this.textures) {
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.moonTexture);
        this.gl.uniform1i(
          this.gl.getUniformLocation(this.shaderProgram, "uTextureMoon"),
          0,
        );

        this.gl.uniformMatrix4fv(
          this.gl.getUniformLocation(this.shaderProgram, "uMVP"),
          false,
          mvp,
        );

        twgl.setBuffersAndAttributes(
          this.gl,
          this.shaderProgramInfo,
          this.bufferInfo,
        );
        twgl.drawBufferInfo(this.gl, this.bufferInfo, this.gl.TRIANGLE_STRIP);
      }
    }
  }

  public renderPath(): void {
    this.gl.disable(this.gl.DEPTH_TEST);
    this.gl.useProgram(this.pathShaderProgram);
    if (this.pathShaderProgram) {
      this.calculateMatrices();
      const mvp = twgl.m4.identity();

      this.gl.uniform4f(
        this.gl.getUniformLocation(this.pathShaderProgram, "uColor"),
        0.0,
        0.0,
        1.0,
        1.0,
      );

      this.gl.uniformMatrix4fv(
        this.gl.getUniformLocation(this.pathShaderProgram, "uMVP"),
        false,
        mvp,
      );

      twgl.setBuffersAndAttributes(
        this.gl,
        this.pathShaderProgramInfo,
        this.pathBufferInfo,
      );
      twgl.drawBufferInfo(this.gl, this.pathBufferInfo, this.gl.LINE_STRIP);
    }
  }
}

export default Moon;
