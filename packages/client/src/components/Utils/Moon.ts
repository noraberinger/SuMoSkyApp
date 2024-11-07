"use strict";
import * as twgl from "twgl.js";
import moonFs from "../shaders/moon.frag";
import moonVs from "../shaders/moon.vert";

class Moon {
  private gl: WebGL2RenderingContext | WebGLRenderingContext;
  private textures: { moonTexture: WebGLTexture | null };
  private shaderProgramInfo: twgl.ProgramInfo;
  private shaderProgram: WebGLProgram | null;
  private bufferInfo: twgl.BufferInfo;
  private position: { x: number; y: number; z: number };
  private radius: number;

  constructor(
    gl: WebGL2RenderingContext | WebGLRenderingContext,
    positionMoon: { azimuth: number; altitude: number },
  ) {
    this.gl = gl;
    this.textures = { moonTexture: null };
    this.shaderProgramInfo = twgl.createProgramInfo(this.gl, [moonVs, moonFs]);
    this.shaderProgram = this.shaderProgramInfo.program;
    this.bufferInfo = this.createQuadBuffer();
    this.radius = 2;
    this.position = this.initialPosition(positionMoon);
    this.setupTextures();
  }

  /** Create a simple Quad */
  private createQuadBuffer(): twgl.BufferInfo {
    const arrays = {
      position: { numComponents: 2, data: [-1, -1, 1, -1, -1, 1, 1, 1] },
      texcoord: { numComponents: 2, data: [0, 0, 1, 0, 0, 1, 1, 1] },
    };
    return twgl.createBufferInfoFromArrays(this.gl, arrays);
  }

  /** Create textures. */
  private setupTextures(): void {
    const moonUrl = "/textures/moon.png";

    this.textures.moonTexture = twgl.createTexture(this.gl, {
      src: moonUrl,
    });
  }

  //TODO: Radius
  private initialPosition(positionMoon: {
    azimuth: number;
    altitude: number;
  }): { x: number; y: number; z: number } {
    const x =
      this.radius *
      Math.cos(positionMoon.altitude) *
      Math.sin(positionMoon.azimuth);
    const y = this.radius * Math.sin(positionMoon.altitude);
    const z =
      this.radius *
      Math.cos(positionMoon.altitude) *
      Math.cos(positionMoon.azimuth);
    return { x, y, z };
  }

  private updatePosition(x: number, y: number, z: number): void {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
  }

  public animate(positionMoon: { azimuth: number; altitude: number }) {
    const x =
      this.radius *
      Math.cos(positionMoon.altitude) *
      Math.sin(positionMoon.azimuth);
    const y = this.radius * Math.sin(positionMoon.altitude);
    const z =
      this.radius *
      Math.cos(positionMoon.altitude) *
      Math.cos(positionMoon.azimuth);
    this.updatePosition(x, y, z);
    this.render();
  }

  /** Render using a blendFactor to blend from dayTexture to nightTexture according to the sliderValue. */
  public render(): void {
    this.gl.disable(this.gl.DEPTH_TEST);
    //this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    let mvp = twgl.m4.identity();
    const scaleFactor = 0.05;
    mvp = twgl.m4.scale(mvp, [scaleFactor, scaleFactor, 1], mvp);
    mvp = twgl.m4.translate(mvp, [
      this.position.x,
      this.position.y,
      this.position.z,
    ]);

    this.gl.useProgram(this.shaderProgram);

    if (this.shaderProgram && this.textures) {
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.moonTexture);
      this.gl.uniform1i(
        this.gl.getUniformLocation(this.shaderProgram, "uTextureMoon"),
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
}

export default Moon;
