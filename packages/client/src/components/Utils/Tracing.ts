import Camera from "terrender-core/src/Utils/Camera";
import tracingAreaFs from "../shaders/tracingArea.frag";
import tracingAreaVs from "../shaders/tracingArea.vert";

class Tracing {
  private gl: WebGL2RenderingContext | WebGLRenderingContext;
  private camera: Camera;
  private viewProjectionLocation: WebGLUniformLocation | null;
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
    this.viewProjectionLocation = null;
    this.vertexBuffer = null;
    this.colorBuffer = null;
    this.indexBuffer = null;
    this.sunVertices = null;
    this.moonVertices = null;
    this.program = null;
    this.createShaders();
    this.createBuffers();
  }

  /* Initialization of shaders */
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

  /* Buffer initialization */
  private createBuffers() {
    if (this.program) {
      this.gl.useProgram(this.program);

      const vertices = new Float32Array(12);

      const colors = new Float32Array(16);

      /* Indices for triangles */
      const indices = new Uint16Array([
        0,
        1,
        2, // Triangle 0

        4,
        5,
        6, // Triangle 1

        8,
        9,
        10, // Triangle 2

        12,
        13,
        14, // Triangle 3

        16,
        17,
        18, // Triangle 4

        20,
        21,
        22, // Triangle 5
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

  private drawObject(vertices: Float32Array | null) {
    if (this.program && this.vertexBuffer && vertices && vertices.length > 0) {
      this.gl.useProgram(this.program);

      /* Transparency Handling */
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

      /* Set up attributes */
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
      }

      this.gl.disable(this.gl.BLEND);
    }
  }

  private createColorArray(red: number, green: number, blue: number) {
    /* Create color buffer for 6 triangles, each with 4 vertices, each vertex with 4 color components */
    const colors = new Float32Array(6 * 4 * 4);

    for (let tri = 0; tri < 6; tri++) {
      const alpha =
        tri === 0 || tri === 5
          ? 0.2 /* first and last */
          : tri === 1 || tri === 4
            ? 0.4 /* second and secondlast */
            : 0.8; /* middle */

      for (let vert = 0; vert < 4; vert++) {
        const idx = (tri * 4 + vert) * 4;
        colors[idx + 0] = red;
        colors[idx + 1] = green;
        colors[idx + 2] = blue;
        colors[idx + 3] = alpha;
      }
    }

    return colors;
  }

  public updateTracingArea(
    sunVertices: Float32Array,
    moonVertices: Float32Array,
  ) {
    this.sunVertices = sunVertices;
    this.moonVertices = moonVertices;
  }

  public renderTracingArea() {
    if (!this.vertexBuffer) {
      console.warn("tracingBuffer is null.");
      return;
    }

    /* Update color buffer */
    const sunColors = this.createColorArray(1.0, 1.0, 0.0);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, sunColors, this.gl.STATIC_DRAW);
    this.drawObject(this.sunVertices);

    const moonColors = this.createColorArray(0.0, 0.0, 1.0);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, moonColors, this.gl.STATIC_DRAW);
    this.drawObject(this.moonVertices);
  }
}

export default Tracing;
