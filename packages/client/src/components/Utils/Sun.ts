"use strict";
import * as twgl from "twgl.js";
import sunFs from "../shaders/sun.frag";
import sunVs from "../shaders/sun.vert";
import pathFs from "../shaders/path.frag";
import pathVs from "../shaders/path.vert";
import Camera from "terrender-core/src/Utils/Camera";

class Sun {
  private gl: WebGL2RenderingContext | WebGLRenderingContext;
  private textures: { sunTexture: WebGLTexture | null };
  private shaderProgramInfo: twgl.ProgramInfo;
  private shaderProgram: WebGLProgram | null;
  private bufferInfo: twgl.BufferInfo;
  private pathShaderProgramInfo: twgl.ProgramInfo;
  private pathShaderProgram: WebGLProgram | null;
  private pathBufferInfo: twgl.BufferInfo;
  private position: { x: number; y: number; z: number };
  private radius: number;
  private camera: Camera;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(
    gl: WebGL2RenderingContext | WebGLRenderingContext,
    positionSun: { azimuth: number; altitude: number },
    camera: Camera,
    positionSunArray: { time: Date; azimuth: number; altitude: number }[],
  ) {
    this.gl = gl;
    this.camera = camera;
    this.canvasWidth = this.gl.canvas.width;
    this.canvasHeight = this.gl.canvas.height;
    this.textures = { sunTexture: null };
    this.radius = 1;
    this.shaderProgramInfo = twgl.createProgramInfo(this.gl, [sunVs, sunFs]);
    this.shaderProgram = this.shaderProgramInfo.program;
    this.bufferInfo = this.createQuadBuffer();
    this.pathShaderProgramInfo = twgl.createProgramInfo(this.gl, [
      pathVs,
      pathFs,
    ]);
    this.pathShaderProgram = this.pathShaderProgramInfo.program;
    this.pathBufferInfo = this.createPathBuffer2D(positionSunArray);
    this.position = this.calcPosition2D(positionSun);
    this.setupTextures();
  }

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

  private createPathBuffer2D(
    positionSunArray: { time: Date; azimuth: number; altitude: number }[],
  ): twgl.BufferInfo {
    const path = [];

    for (const position of positionSunArray) {
      const { azimuth, altitude } = position;
      const { x, y, z } = this.calcPosition2D({ azimuth, altitude });
      path.push(x, y, z);
    }

    // First and last points to close the loop
    const firstPoint = path.slice(0, 3);
    path.push(...firstPoint);

    return twgl.createBufferInfoFromArrays(this.gl, {
      position: { numComponents: 3, data: new Float32Array(path) },
    });
  }

  private setupTextures(): void {
    const sunUrl = "/textures/sun/sun.png";
    this.textures.sunTexture = twgl.createTexture(this.gl, { src: sunUrl });
  }

  private calcPosition2D(positionSun: { azimuth: number; altitude: number }): {
    x: number;
    y: number;
    z: number;
  } {
    const { x, y, z } = this.calcPosition(positionSun, 1);
    const canvasCenterX = this.canvasWidth / 2;
    const canvasCenterY = this.canvasHeight / 2;
    const onCanvasX = canvasCenterX + x;
    const onCanvasY = canvasCenterY - y;
    return { x: onCanvasX, y: onCanvasY, z };
  }

  private calcPosition(
    positionSun: { azimuth: number; altitude: number },
    radius: number,
  ): { x: number; y: number; z: number } {
    this.radius = radius;

    const x =
      this.radius *
      Math.cos(positionSun.altitude) *
      Math.cos(positionSun.azimuth);
    const y =
      this.radius *
      Math.cos(positionSun.altitude) *
      Math.sin(positionSun.azimuth);
    const z = this.radius * Math.sin(positionSun.altitude);

    return { x, y, z };
  }

  private updatePosition(x: number, y: number, z: number): void {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
  }

  private calculateMatrices(): void {
    this.camera.calculateMatrices();
  }

  public updateBuffer(
    positionSunArray: { time: Date; azimuth: number; altitude: number }[],
  ): void {
    this.pathBufferInfo = this.createPathBuffer2D(positionSunArray);
    this.renderPath();
  }

  public animate(positionSun: { azimuth: number; altitude: number }) {
    const { x, y, z } = this.calcPosition2D(positionSun);
    this.updatePosition(x, y, z);
    this.render();
  }

  public render(): void {
    this.gl.disable(this.gl.DEPTH_TEST);
    let mvp = twgl.m4.identity();
    const scaleFactor = 1;

    mvp = twgl.m4.translate(mvp, [
      this.position.x * scaleFactor,
      this.position.y * scaleFactor,
      this.position.z * scaleFactor,
    ]);

    this.gl.useProgram(this.shaderProgram);
    if (this.shaderProgram && this.textures) {
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.sunTexture);
      this.gl.uniform1i(
        this.gl.getUniformLocation(this.shaderProgram, "uTextureSun"),
        0,
      );

      twgl.setUniforms(this.shaderProgramInfo, { uMVP: mvp });
      twgl.setBuffersAndAttributes(
        this.gl,
        this.shaderProgramInfo,
        this.bufferInfo,
      );
      twgl.drawBufferInfo(this.gl, this.bufferInfo, this.gl.TRIANGLE_STRIP);
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
        1.0,
        0.5,
        0.0,
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

export default Sun;
