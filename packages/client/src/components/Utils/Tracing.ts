import Camera from "terrender-core/src/Utils/Camera";
import * as twgl from "twgl.js";
import tracingAreaFs from "../shaders/tracingArea.frag";
import tracingAreaVs from "../shaders/tracingArea.vert";

class Tracing {
  private gl: WebGL2RenderingContext | WebGLRenderingContext;
  private camera: Camera;
  private shaderProgramInfo: twgl.ProgramInfo | null;
  private viewProjectionLocation: WebGLUniformLocation | null;
  private translationLocation: WebGLUniformLocation | null;
  private scaleLocation: WebGLUniformLocation | null;
  private colorLocation: WebGLUniformLocation | null;
  private positionLocation: number;
  private vertexBuffer: WebGLBuffer | null;
  private colorBuffer: WebGLBuffer | null;
  private indexBuffer: WebGLBuffer | null;
  private sunVertices: Float32Array | null;
  private moonVertices: Float32Array | null;
  private program: WebGLProgram | null;

  constructor(
    gl: WebGL2RenderingContext | WebGLRenderingContext,
    camera: Camera,
  ) {
    this.gl = gl;
    this.camera = camera;
    this.shaderProgramInfo = null;
    this.viewProjectionLocation = null;
    this.translationLocation = null;
    this.scaleLocation = null;
    this.colorLocation = null;
    this.positionLocation = 0;
    this.vertexBuffer = null;
    this.colorBuffer = null;
    this.indexBuffer = null;
    this.sunVertices = null;
    this.moonVertices = null;
    this.program = null;
    this.createShaders();
    this.createBuffers();
  }

  //Initialization of shaders, creating shaderProgramInfo
  private createShaders() {
    const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER)!;
    const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER)!;

    if (!vertexShader || !fragmentShader) {
      console.warn("Shader creation for tracing failed.");
      return;
    }

    this.gl.shaderSource(vertexShader, tracingAreaVs);
    this.gl.compileShader(vertexShader);

    this.gl.shaderSource(fragmentShader, tracingAreaFs);
    this.gl.compileShader(fragmentShader);

    this.program = this.gl.createProgram();
    if (this.program) {
      this.gl.attachShader(this.program, vertexShader);
      this.gl.attachShader(this.program, fragmentShader);
      this.gl.linkProgram(this.program);
    }
  }

  //Buffer initialization using shaderProgramInfo as program
  private createBuffers() {
    if (this.program) {
      this.gl.useProgram(this.program);

      /*
      this.positionLocation = this.gl.getAttribLocation(
        this.program,
        "position",
      );

      this.translationLocation = this.gl.getUniformLocation(
        this.program,
        "translation",
      );
      this.scaleLocation = this.gl.getUniformLocation(this.program, "scale");
      */

      const vertices = new Float32Array([
        // Front face
        0.0,
        0.0,
        0.0, // top -> sun
        0.0,
        0.0,
        0.0, // left -> A2 derived a+n'
        0.0,
        0.0,
        0.0, // right -> A1 derived a-n'
        0.0,
        0.0,
        0.0, // back -> landmark
      ]);

      // Colors for each vertex
      const colors = new Float32Array([
        1.0,
        1.0,
        0.0,
        1.0,
        1.0,
        1.0,
        0.0,
        1.0,
        1.0,
        1.0,
        0.0,
        1.0,
        1.0,
        1.0,
        0.0,
        1.0, // yellow
      ]);

      // Indices for triangles
      const indices = new Uint16Array([
        // Triangle 0
        0, 1, 2,
        // Triangle 1
        4, 5, 6,
        // Triangle 2
        8, 9, 10,
        // Triangle 3
        12, 13, 14,
        // Triangle 4
        16, 17, 18,
        // Triangle 5
        20, 21, 22,
      ]);

      this.vertexBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

      this.colorBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, colors, this.gl.STATIC_DRAW);

      this.indexBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      this.gl.bufferData(
        this.gl.ELEMENT_ARRAY_BUFFER,
        indices,
        this.gl.STATIC_DRAW,
      );

      //this.colorLocation = this.gl.getUniformLocation(this.program, "color");

      this.viewProjectionLocation = this.gl.getUniformLocation(
        this.program,
        "viewProjection",
      );
    } else {
      console.warn(
        "shaderProgramInfo initialization failed. Check createShaders().",
      );
    }
  }

  private drawObject(
    vertices: Float32Array | null,
    // color: [number, number, number, number],
    //mode: number,
    //scale: [number, number] = [1, 1],
    //translation: [number, number] = [0, 0],
  ) {
    if (this.program && this.vertexBuffer && vertices && vertices.length > 0) {
      this.gl.useProgram(this.program);

      // Transparency Handling
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

      // this.bindBufferAndData(this.vertexBuffer, vertices);
      // this.setAttributesAndUniforms(color, scale, translation);

      // Set up attributes
      const positionLocation = this.gl.getAttribLocation(
        this.program,
        "position",
      );
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
      this.gl.vertexAttribPointer(
        positionLocation,
        3,
        this.gl.FLOAT,
        false,
        0,
        0,
      );
      this.gl.enableVertexAttribArray(positionLocation);

      const colorLocation = this.gl.getAttribLocation(this.program, "color");
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
      this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(colorLocation);

      const viewProjection = this.camera.viewProjectionMatrix;
      if (viewProjection) {
        this.gl.uniformMatrix4fv(
          this.viewProjectionLocation,
          false,
          viewProjection,
        );

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        this.gl.drawElements(this.gl.TRIANGLES, 18, this.gl.UNSIGNED_SHORT, 0);

        //this.gl.drawArrays(this.gl.TRIANGLES, 0, vertices.length / 3);
      }

      this.gl.disable(this.gl.BLEND);
    }
  }

  private bindBufferAndData(buffer: WebGLBuffer, vertices: Float32Array) {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
  }

  private setAttributesAndUniforms(
    color: [number, number, number, number],
    scale: [number, number],
    translation: [number, number],
  ) {
    this.gl.enableVertexAttribArray(this.positionLocation);
    this.gl.vertexAttribPointer(
      this.positionLocation,
      2,
      this.gl.FLOAT,
      false,
      0,
      0,
    );

    this.gl.uniform2fv(this.translationLocation, translation);
    this.gl.uniform2fv(this.scaleLocation, scale);
    this.gl.uniform4fv(this.colorLocation, color);
  }

  public updateTracingArea(
    sunVertices: Float32Array,
    moonVertices: Float32Array,
  ) {
    console.log("SUN vertices", this.sunVertices);
    this.sunVertices = sunVertices;
    this.moonVertices = moonVertices;
  }

  //in total points for 10 minutes step with color changing from opqute to full/0.8 color to opaque (0.2))
  public renderTracingArea() {
    if (!this.vertexBuffer) {
      console.warn("tracingBuffer is null.");
      return;
    }

    // Create color buffer for 6 triangles, each with 4 vertices, each with 4 color components
    const colors = new Float32Array(6 * 4 * 4);

    for (let tri = 0; tri < 6; tri++) {
      const alpha =
        tri === 0 || tri === 5
          ? 0.2 // first and last
          : tri === 1 || tri === 4
            ? 0.4 // second and second-to-last
            : 0.8; // middle triangles

      for (let vert = 0; vert < 4; vert++) {
        const idx = (tri * 4 + vert) * 4;
        colors[idx + 0] = 1.0; // r
        colors[idx + 1] = 1.0; // g
        colors[idx + 2] = 0.0; // b
        colors[idx + 3] = alpha;
      }
    }

    console.log("colors", colors);

    // Update color buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, colors, this.gl.STATIC_DRAW);

    this.drawObject(
      // this.vertexBuffer,
      this.sunVertices,
      //this.gl.TRIANGLES,
      //[1, 1],
      //[0, 0],
      /*
      [1.0, 1.0, 0.0, 0.5],
      this.gl.TRIANGLES,
      [1, 1],
      [0, 0],
      */
    );
  }
}

export default Tracing;
