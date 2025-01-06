import * as Astronomy from "astronomy-engine";
import * as twgl from "twgl.js";
import celestialBodiesFs from "../shaders/celestialBodies.frag";
import celestialBodiesVs from "../shaders/celestialBodies.vert";

interface Vertex {
  x: number;
  y: number;
  aboveHorizon: number;
  azimuth: number;
}

interface Trace {
  date: Date;
  sun: [number, number];
  moon: [number, number];
  to: [number, number];
}

const pathCacheSize = 30; //in total allowing 30 center and/or date changes => should be enough if user has fixed landmark and date in mind
const positionCacheSize = pathCacheSize * (144 * 0.5); //144 as each day has 24 * 6 10min intervals => slider steps in 10min steps
const pathSamplingRate = 1;
const tracingCacheSize = positionCacheSize; //same size as positionCacheSize as max amount of tracing lines is equal to max amount of positions
const tracingSamplingRate = 10; //sampling every 10 minutes for tracing lines

class CelestialBodies {
  private gl: WebGL2RenderingContext | WebGLRenderingContext;
  private shaderProgramInfo: twgl.ProgramInfo | null;
  private pathBuffer: WebGLBuffer | null;
  private circleBuffer: WebGLBuffer | null;
  private lineBuffer: WebGLBuffer | null;
  private positionLocation: number;
  private translationLocation: WebGLUniformLocation | null;
  private scaleLocation: WebGLUniformLocation | null;
  private colorLocation: WebGLUniformLocation | null;
  private currentDirection: number;
  private maxElevation: number;
  private pathCache = new Map<
    string,
    { sunPath: Float32Array; moonPath: Float32Array }
  >();
  private positionCache = new Map<
    string,
    {
      sun: [number, number, boolean];
      moon: [number, number, boolean];
    }
  >();
  private tracingCache = new Map<string, Trace[]>();
  private currentPathKey?: string;
  private currentPositionKey?: string;
  private currentTracingKey?: string;
  private currentTrace?: Trace;

  constructor(gl: WebGL2RenderingContext | WebGLRenderingContext) {
    this.gl = gl;
    this.shaderProgramInfo = null;
    this.pathBuffer = null;
    this.circleBuffer = null;
    this.lineBuffer = null;
    this.positionLocation = 0;
    this.translationLocation = null;
    this.scaleLocation = null;
    this.colorLocation = null;
    this.currentDirection = 0;
    this.maxElevation = 10000; //max elevation in meters, same as max elevation for elevation slider and max elevation that camera can be moved up or down
    this.createShaders();
    this.createBuffers();
  }

  //Initialization of shaders, creating shaderProgramInfo
  private createShaders() {
    const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER)!;
    const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER)!;

    if (!vertexShader || !fragmentShader) {
      console.warn("Shader creation for celestial bodies failed.");
      return;
    }

    this.gl.shaderSource(vertexShader, celestialBodiesVs);
    this.gl.compileShader(vertexShader);

    this.gl.shaderSource(fragmentShader, celestialBodiesFs);
    this.gl.compileShader(fragmentShader);

    this.shaderProgramInfo = twgl.createProgramInfo(this.gl, [
      celestialBodiesVs,
      celestialBodiesFs,
    ]);
  }

  //Buffer initialization using shaderProgramInfo as program
  private createBuffers() {
    if (this.shaderProgramInfo) {
      const program = this.shaderProgramInfo.program;
      this.gl.useProgram(program);

      this.positionLocation = this.gl.getAttribLocation(program, "position");
      this.translationLocation = this.gl.getUniformLocation(
        program,
        "translation",
      );
      this.scaleLocation = this.gl.getUniformLocation(program, "scale");
      this.colorLocation = this.gl.getUniformLocation(program, "color");

      this.circleBuffer = this.gl.createBuffer();
      this.pathBuffer = this.gl.createBuffer();
      this.lineBuffer = this.gl.createBuffer();

      const circleVertices = this.createCircleVertices();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.circleBuffer);
      this.gl.bufferData(
        this.gl.ARRAY_BUFFER,
        circleVertices,
        this.gl.STATIC_DRAW,
      );
    } else {
      console.warn(
        "shaderProgramInfo initialization failed. Check createShaders().",
      );
    }
  }

  //CircleVertices for Sun/Moon object
  private createCircleVertices(segments = 32): Float32Array {
    const vertices = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      vertices.push(Math.cos(theta), Math.sin(theta));
    }
    return new Float32Array(vertices);
  }

  //Wrapping azimuth to [-180,180]°
  private wrapAzimuth(azimuth: number): number {
    return ((((azimuth + 180) % 360) + 360) % 360) - 180;
  }

  /** Smooth transition at boundaries:
   *  Path normalized to screen space => normalizedAzimuth/90; 175/90=1.94 units screen space
   *  180-175=5 gap on each side, trying to prevent sharp edges at boundaries
   */
  private smoothAzimuthGap(relativeAzimuth: number, azimuth: number): number {
    if (relativeAzimuth < -175 && azimuth > 175) {
      relativeAzimuth += 360;
    } else if (relativeAzimuth > 175 && azimuth < -175) {
      relativeAzimuth -= 360;
    }
    return Math.max(-180, Math.min(180, relativeAzimuth));
  }

  private normalizeAzimuth(azimuth: number, currentDirection: number): number {
    // Ensure currentDirection is within 0-360°
    currentDirection = ((currentDirection % 360) + 360) % 360;

    // Ensure azimuth is within ±180°
    let relativeAzimuth = azimuth - currentDirection;
    relativeAzimuth = this.wrapAzimuth(relativeAzimuth);
    relativeAzimuth = this.smoothAzimuthGap(relativeAzimuth, azimuth);

    return relativeAzimuth;
  }

  /** Calculating current Position of Sun/Moon in respect to Observer from Earth.
   *  Conversion of equatorial coordinates (ra, dec) to horizontal coordinates.
   */
  private calculatePosition(
    body: Astronomy.Body,
    observer: Astronomy.Observer,
    date: Date,
  ): [number, number, boolean] {
    /** Calculate equatorial coordinates first for the specific body, date and for observer location
     *  Outputs right ascension (ra) and declination (dec) in degrees => necessary data for calculating horizontal coordinates
     *  dec: positive: north of celestial equator; negative: south of celestial equator; range -90° to +90°; scalar value
     *  ra: angle eastward along celestial equator; range 0° to 360°; similar to longitude but on celestial sphere; scalar value
     */
    const equator = Astronomy.Equator(body, date, observer, false, true);
    /** Calculates horizontal coordinates for a given equatorial coordinates (ra, dec) and observer location.
     *  Altitude: angle in degrees above the horizon; range -90° to +90°; scalar value
     *  Azimuth: angle in degrees along the horizon; range 0° to 360°; scalar value
     */
    const horizon = Astronomy.Horizon(
      date,
      observer,
      equator.ra,
      equator.dec,
      "normal",
    );

    const normalizedAzimuth = this.normalizeAzimuth(
      horizon.azimuth,
      this.currentDirection,
    );

    //Normalize to fit screen
    const x = normalizedAzimuth / 90;
    const y = horizon.altitude / 90;
    //If Object is visible or not
    const aboveHorizon = horizon.altitude >= 0;

    return [x, y, aboveHorizon];
  }

  /** Calculation of path for a body, observer and date using data samples over time => builds a vertex array representing the path*/
  private calculatePath24h(
    body: Astronomy.Body,
    observer: Astronomy.Observer,
    date: Date,
  ) {
    //Simplified calculation with 24h path => down below calculation for path which includes previous and next day
    const currentDayVertices: Vertex[] = [];
    const coveredAngles = new Set<number>();

    for (let minutes = 0; minutes < 1440; minutes += pathSamplingRate) {
      const pathDate = new Date(date.getTime() + minutes * 60000);
      try {
        const equator = Astronomy.Equator(
          body,
          pathDate,
          observer,
          false,
          true,
        );
        const horizon = Astronomy.Horizon(
          pathDate,
          observer,
          equator.ra,
          equator.dec,
          "normal",
        );
        const normalizedAzimuth = this.normalizeAzimuth(
          horizon.azimuth,
          this.currentDirection,
        );

        const currentAngle = Math.round(normalizedAzimuth);
        if (!coveredAngles.has(currentAngle)) {
          coveredAngles.add(currentAngle);
          const x = normalizedAzimuth / 90;
          const y = horizon.altitude / 90;
          const aboveHorizon = horizon.altitude >= 0 ? 1.0 : 0.4;

          currentDayVertices.push({
            x,
            y,
            aboveHorizon,
            azimuth: normalizedAzimuth,
          });
        }
      } catch (e) {
        console.warn(
          `Error calculating position for ${body} at ${pathDate.toISOString()} for observer at lat: ${observer.latitude}, lng: ${observer.longitude}: ${e}`,
        );
      }
    }

    currentDayVertices.sort((a, b) => a.azimuth - b.azimuth);

    const vertices = currentDayVertices.flatMap((v) => [
      v.x,
      v.y,
      v.aboveHorizon,
    ]);

    return {
      pathVertices: new Float32Array(vertices),
    };
  }

  private calculatePathCurrentPrevNextDay(
    body: Astronomy.Body,
    observer: Astronomy.Observer,
    date: Date,
  ) {
    const currentDayVertices: Vertex[] = [];
    const prevAndNextDayVertices: Vertex[] = [];
    const coveredAngles = new Set();

    //Calculate Path for current day, sampling according to pathSamplingRate
    for (let minutes = 0; minutes < 1440; minutes += pathSamplingRate) {
      const pathDate = new Date(date.getTime() + minutes * 60000);
      try {
        const equator = Astronomy.Equator(
          body,
          pathDate,
          observer,
          false,
          true,
        );
        const horizon = Astronomy.Horizon(
          pathDate,
          observer,
          equator.ra,
          equator.dec,
          "normal",
        );
        const normalizedAzimuth = this.normalizeAzimuth(
          horizon.azimuth,
          this.currentDirection,
        );

        //check if calculated angle is already in covered angle respectively only unique currentAngle is added into set, duplicates will be ignored
        const currentAngle = Math.round(normalizedAzimuth);
        coveredAngles.add(currentAngle);

        //normalize azimuth and altitude to fit screen same as in calculatePosition
        const x = normalizedAzimuth / 90;
        const y = horizon.altitude / 90;
        //if path is visible respectively above horizon set visibility to 1.0, else to 0.4
        const aboveHorizon = horizon.altitude >= 0 ? 1.0 : 0.4;

        //add the data to the currentDayVertices array
        currentDayVertices.push({
          x,
          y,
          aboveHorizon,
          azimuth: normalizedAzimuth,
        });
      } catch (e) {
        console.warn(
          `Error calculating position for ${body} at ${pathDate}: ${e}`,
        );
      }
    }

    //Calculate paths for previous (-1) and next day (+1) in order to have a smooth transition between days
    [-1, 1].forEach((dayOffset) => {
      const offsetDate = new Date(date);
      //offset the date in order to calculate path either for prev or next day
      offsetDate.setDate(offsetDate.getDate() + dayOffset);

      //sampling every 2 minutes over 24h period of the offset
      for (let minutes = 0; minutes < 1440; minutes += pathSamplingRate) {
        const pathDate = new Date(offsetDate.getTime() + minutes * 60000);
        try {
          const equator = Astronomy.Equator(
            body,
            pathDate,
            observer,
            false,
            true,
          );
          const horizon = Astronomy.Horizon(
            pathDate,
            observer,
            equator.ra,
            equator.dec,
            "normal",
          );
          const normalizedAzimuth = this.normalizeAzimuth(
            horizon.azimuth,
            this.currentDirection,
          );

          //Add currentAngle to coveredAngles if unique and normalize to fit screen
          const currentAngle = Math.round(normalizedAzimuth);
          if (!coveredAngles.has(currentAngle)) {
            const x = normalizedAzimuth / 90;
            const y = horizon.altitude / 90;
            const aboveHorizon = horizon.altitude >= 0 ? 1.0 : 0.4;

            prevAndNextDayVertices.push({
              x,
              y,
              aboveHorizon,
              azimuth: normalizedAzimuth,
            });
            coveredAngles.add(currentAngle);
          }
        } catch (e) {
          console.warn(
            `Error calculating position for ${body} at ${pathDate}: ${e}`,
          );
        }
      }
    });

    //Sort paths for a curved path
    const allVertices = [...prevAndNextDayVertices, ...currentDayVertices].sort(
      (a, b) => a.azimuth - b.azimuth,
    );

    //Convert vertex objects in array into single array containing x, y and aboveHorizon (aboveHorizon = z value) used for rendering
    const vertices = allVertices.flatMap((v) => [v.x, v.y, v.aboveHorizon]);

    return {
      pathVertices: new Float32Array(vertices),
    };
  }

  /** Draw any object according to:
   * specified buffer,
   * vertices if given (given if path, not given if position),
   * color,
   * mode: gl.TRIANGLE_FAN, gl.LINE_STRIP,
   * scale,
   * translation*/
  private drawObject(
    buffer: WebGLBuffer,
    vertices: Float32Array | null,
    color: [number, number, number, number],
    mode: number,
    scale: [number, number] = [1, 1],
    translation: [number, number] = [0, 0],
  ) {
    if (this.shaderProgramInfo) {
      this.gl.useProgram(this.shaderProgramInfo.program);
    } else {
      console.warn("shaderProgram is not active. Check initialization.");
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);

    //Upload vertices to buffer if vertices != null
    if (vertices) {
      this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    }

    //Transparency handling
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.gl.enableVertexAttribArray(this.positionLocation);

    const divisor = vertices && vertices.length % 3 === 0 ? 3 : 2;
    const vertexAmount = vertices
      ? vertices.length / divisor
      : this.gl.getBufferParameter(this.gl.ARRAY_BUFFER, this.gl.BUFFER_SIZE) /
        8;

    if (mode === this.gl.TRIANGLES) {
      this.gl.vertexAttribPointer(
        this.positionLocation,
        2,
        this.gl.FLOAT,
        false,
        0,
        0,
      );
      this.gl.uniform4fv(this.colorLocation, color);
      this.gl.uniform2fv(this.scaleLocation, scale);
      this.gl.uniform2fv(this.translationLocation, translation);
      this.gl.drawArrays(mode, 0, 3);
    } else if (divisor === 3) {
      this.gl.vertexAttribPointer(
        this.positionLocation,
        2,
        this.gl.FLOAT,
        false,
        12,
        0,
      );
      this.gl.uniform2fv(this.scaleLocation, scale);
      this.gl.uniform2fv(this.translationLocation, translation);

      for (let i = 0; i < vertexAmount; i++) {
        if (vertices) {
          const alpha = vertices[i * 3 + 2];
          const alphaColor = [
            color[0] * alpha,
            color[1] * alpha,
            color[2] * alpha,
            1,
          ];
          this.gl.uniform4fv(this.colorLocation, alphaColor);
          this.gl.drawArrays(mode, i, 2);
        } else {
          console.warn("Vertices is null.");
        }
      }
    } else {
      this.gl.vertexAttribPointer(
        this.positionLocation,
        2,
        this.gl.FLOAT,
        false,
        0,
        0,
      );
      this.gl.uniform4fv(this.colorLocation, color);
      this.gl.uniform2fv(this.scaleLocation, scale);
      this.gl.uniform2fv(this.translationLocation, translation);
      this.gl.drawArrays(mode, 0, vertexAmount);
    }

    this.gl.disable(this.gl.BLEND);
  }

  /** Cache drawing for Positions */
  private drawPositionFromCache(data: {
    sun: [number, number, boolean];
    moon: [number, number, boolean];
  }) {
    const { sun, moon } = data;

    if (this.circleBuffer) {
      this.drawObject(
        this.circleBuffer,
        null,
        sun[2] ? [1.0, 1.0, 0.0, 1.0] : [0.8, 0.8, 0.0, 1.0],
        this.gl.TRIANGLE_FAN,
        [0.05, 0.05],
        [sun[0], sun[1]],
      );

      this.drawObject(
        this.circleBuffer,
        null,
        moon[2] ? [0.9, 0.9, 0.9, 1.0] : [0.7, 0.7, 0.7, 1.0],
        this.gl.TRIANGLE_FAN,
        [0.03, 0.03],
        [moon[0], moon[1]],
      );
    } else {
      console.warn("circleBuffer is null.");
    }
  }

  /** Cache drawing for Paths */
  private drawPathsFromCache(data: {
    sunPath: Float32Array;
    moonPath: Float32Array;
  }) {
    if (this.pathBuffer) {
      this.drawObject(
        this.pathBuffer,
        data.sunPath,
        [1.0, 0.8, 0.0, 1.0],
        this.gl.LINE_STRIP,
        [1, 1],
        [0, 0],
      );
      this.drawObject(
        this.pathBuffer,
        data.moonPath,
        [0.0, 0.0, 1.0, 1.0],
        this.gl.LINE_STRIP,
        [1, 1],
        [0, 0],
      );
    } else {
      console.warn("pathBuffer is null.");
    }
  }

  /** Helper functions to generate cache keys => 2 different key as position needs more info in key than path does */
  private generatePositionKey = (
    lat: number,
    lng: number,
    dateTime: Date,
    currentDirection: number,
  ) => {
    const day = String(dateTime.getDate()).padStart(2, "0");
    const month = String(dateTime.getMonth() + 1).padStart(2, "0");
    const year = String(dateTime.getFullYear());
    const hour = String(dateTime.getHours()).padStart(2, "0");
    const minute = String(dateTime.getMinutes()).padStart(2, "0");
    const key = `${lat}-${lng}-${year}-${month}-${day}-${hour}-${minute}-${currentDirection}`;
    return key;
  };

  private generatePathKey = (
    lat: number,
    lng: number,
    date: Date,
    currentDirection: number,
  ) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());
    const key = `${lat}-${lng}-${year}-${month}-${day}-${currentDirection}`;
    return key;
  };

  /** Update Sun/Moon Position when lat, lng, dateTime changes => inputs over search field, calendar and time slider */
  public updatePosition(
    lat: number,
    lng: number,
    dateTime: Date,
    currentDirection: number,
    elevation: number,
  ) {
    /**Memory management: clear cache when exceeding certain size in order to keep memory retrieval efficient + no infinite memory growth
     * Keeping lastKey and restoring it after cache is cleared in order to minimize unnecessary recalculations
     */
    if (this.positionCache.size > positionCacheSize) {
      const lastKey = this.currentPositionKey;
      if (lastKey) {
        const cachedData = this.positionCache.get(lastKey);
        console.log("Clearing position cache...");
        this.positionCache.clear();
        if (cachedData) this.positionCache.set(lastKey, cachedData);
      }
    }

    const key = this.generatePositionKey(lat, lng, dateTime, currentDirection);

    // Calculate if key not in cache
    if (!this.positionCache.has(key)) {
      const observer = new Astronomy.Observer(lat, lng, elevation);
      this.currentDirection = currentDirection;

      // Get current Sun and Moon position
      const [sunX, sunY, sunAboveHorizon] = this.calculatePosition(
        Astronomy.Body.Sun,
        observer,
        dateTime,
      );
      const [moonX, moonY, moonAboveHorizon] = this.calculatePosition(
        Astronomy.Body.Moon,
        observer,
        dateTime,
      );
      //Add position data to cache
      this.positionCache.set(key, {
        sun: [sunX, sunY, sunAboveHorizon],
        moon: [moonX, moonY, moonAboveHorizon],
      });
    }

    this.currentPositionKey = key;
  }

  /** Update Sun/Moon Path when lat, lng, date changes => inputs over search field and calendar */
  public updatePath(
    lat: number,
    lng: number,
    date: Date,
    currentDirection: number,
    elevation: number,
  ) {
    /**Memory management: clear cache when exceeding certain size in order to keep memory retrieval efficient + no infinite memory growth
     * Keeping lastKey and restoring it after cache is cleared in order to minimize unnecessary recalculations
     */
    if (this.pathCache.size > pathCacheSize) {
      const lastKey = this.currentPathKey;
      if (lastKey) {
        const cachedData = this.pathCache.get(lastKey);
        console.log("Clearing path cache...");
        this.pathCache.clear();
        if (cachedData) this.pathCache.set(lastKey, cachedData);
      }
    }

    const key = this.generatePathKey(lat, lng, date, currentDirection);

    // Calculate if key not in cache
    if (!this.pathCache.has(key)) {
      const observer = new Astronomy.Observer(lat, lng, elevation);
      this.currentDirection = currentDirection;

      //Calculate Sun and Moon Paths
      const sunPathData = this.calculatePath24h(
        Astronomy.Body.Sun,
        observer,
        date,
      );
      const moonPathData = this.calculatePath24h(
        Astronomy.Body.Moon,
        observer,
        date,
      );
      //Add path data to cache
      this.pathCache.set(key, {
        sunPath: sunPathData.pathVertices,
        moonPath: moonPathData.pathVertices,
      });
    }

    this.currentPathKey = key;
  }

  /**Render functions which are fast to access in order to keep main thread efficient
   * Rendering respectively drawing of celestial bodies is only executed when the data can be directly retrieved from cache
   */
  public renderPath() {
    if (!this.currentPathKey) return;
    const cachedData = this.pathCache.get(this.currentPathKey);
    if (cachedData) this.drawPathsFromCache(cachedData);
  }

  public renderPosition() {
    if (!this.currentPositionKey) return;
    const cachedData = this.positionCache.get(this.currentPositionKey);
    if (cachedData) {
      this.drawPositionFromCache(cachedData);
    }
  }

  //Tracing
  //Iterate over traces and draw intersection lines
  private drawIntersectionLine() {
    if (!this.lineBuffer) {
      console.warn("lineBuffer is null.");
      return;
    }

    /** 
    const intersectionLine = new Float32Array(4);
    for (const trace of traces) {
      intersectionLine[0] = trace.sun[0];
      intersectionLine[1] = trace.sun[1];
      intersectionLine[2] = trace.to[0];
      intersectionLine[3] = trace.to[1];
      this.drawObject(
        this.lineBuffer,
        intersectionLine,
        [1.0, 0.0, 0.0],
        this.gl.TRIANGLES,
        [1, 1],
        [0, 0],
      );
      intersectionLine[0] = trace.moon[0];
      intersectionLine[1] = trace.moon[1];
      intersectionLine[2] = trace.to[0];
      intersectionLine[3] = trace.to[1];
      this.drawObject(
        this.lineBuffer,
        intersectionLine,
        [0.0, 1.0, 0.0],
        this.gl.TRIANGLES,
        [1, 1],
        [0, 0],
      )    };*/
    const triangleVertices = new Float32Array([0.0, -0.25, -1, -1, 1, -1]);

    this.drawObject(
      this.lineBuffer,
      triangleVertices,
      [0.0, 1.0, 0.0, 0.1],
      this.gl.TRIANGLES,
      [1, 1],
      [0, 0],
    );
  }

  //Generate key for tracing cache
  private generateTracingKey = (lat: number, lng: number, date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());
    const key = `${lat}-${lng}-${year}-${month}-${day}`;
    return key;
  };

  //Calculate tracing lines for Sun over 24hour period, store 10 minute intervals, sunPosition and observer position
  private calculateTracingLines(observer: Astronomy.Observer, date: Date) {
    const traces: Trace[] = [];

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    for (let minutes = 0; minutes < 1440; minutes += tracingSamplingRate) {
      const tracingDate = new Date(startOfDay.getTime() + minutes * 60000);

      const sunPosition = this.calculatePosition(
        Astronomy.Body.Sun,
        observer,
        tracingDate,
      );

      const moonPosition = this.calculatePosition(
        Astronomy.Body.Moon,
        observer,
        tracingDate,
      );

      traces.push({
        date: tracingDate,
        sun: [sunPosition[0], sunPosition[1]],
        moon: [moonPosition[0], moonPosition[1]],
        to: [0, -0.5],
      });
      console.log("traces", traces);
    }

    return traces;
  }

  //When center or date changes, update tracing line with correct elevation for center
  public updateTracingLine(
    lat: number,
    lng: number,
    date: Date,
    elevation: number,
  ) {
    if (this.tracingCache.size > tracingCacheSize) {
      const lastKey = this.currentTracingKey;
      if (lastKey) {
        const cachedDate = this.tracingCache.get(lastKey);
        console.log("Clearing tracing cache...");
        this.tracingCache.clear();
        if (cachedDate) this.tracingCache.set(lastKey, cachedDate);
      }
    }

    const key = this.generateTracingKey(lat, lng, date);

    //cached data contains traces for 24h period for specific calendar date
    if (!this.tracingCache.has(key)) {
      const observer = new Astronomy.Observer(lat, lng, elevation);
      const traces = this.calculateTracingLines(observer, date);
      this.tracingCache.set(key, traces);
    }

    this.currentTracingKey = key;
  }

  //When time changes, get tracing line for specific time
  public getTraceForTime(time: Date) {
    if (!this.currentTracingKey) return;

    const cachedData = this.tracingCache.get(this.currentTracingKey);
    if (!cachedData) return;

    /** Find closest trace to the given time, if not found return [0, 0, 0, 0]*/
    this.currentTrace = cachedData.find((t) => {
      const traceTime = t.date;
      return (
        traceTime.getHours() === time.getHours() &&
        traceTime.getMinutes() === time.getMinutes()
      );
    });

    return new Float32Array([
      this.currentTrace?.sun[0] ?? 0,
      this.currentTrace?.sun[1] ?? 0,
      this.currentTrace?.moon[0] ?? 0,
      this.currentTrace?.moon[1] ?? 0,
      this.currentTrace?.to[0] ?? 0,
      this.currentTrace?.to[1] ?? 0,
    ]);
  }

  //Render tracing line 24h period when existing in cache
  public renderTracingLine() {
    if (!this.currentTracingKey || !this.currentTrace) return;
    if (this.currentTrace) this.drawIntersectionLine();
  }
}

export default CelestialBodies;
