/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';
import * as twgl from 'twgl.js';
const sunFs = require('../shaders/sun.frag');
const sunVs = require('../shaders/sun.vert');

class Sun {
    private gl: WebGL2RenderingContext | WebGLRenderingContext;
    private textures: { sunTexture: WebGLTexture | null };
    private shaderProgramInfo: twgl.ProgramInfo;
    private shaderProgram: WebGLProgram | null;
    private bufferInfo: twgl.BufferInfo;
    private position: { x: number; y: number; z: number };
    private radius: number

    constructor(gl: WebGL2RenderingContext | WebGLRenderingContext, positionSun: {azimuth: number; altitude: number; }) {
        this.gl = gl;
        this.textures = { sunTexture: null };
        this.shaderProgramInfo = twgl.createProgramInfo(this.gl, [sunVs, sunFs]);
        this.shaderProgram = this.shaderProgramInfo.program;
        this.bufferInfo = this.createQuadBuffer();
        this.radius = 2;
        this.position = this.initialPosition(positionSun);
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
        const sunUrl = '/textures/sun/sun.png';

        this.textures.sunTexture = twgl.createTexture(this.gl, {
            src: sunUrl,
        });
    }

    //TODO: Radius
    public initialPosition(positionSun: {azimuth: number; altitude: number}) : {x: number, y: number, z: number} {
        const x = this.radius * Math.cos(positionSun.altitude) * Math.sin(positionSun.azimuth);
        const y = this.radius * Math.sin(positionSun.altitude);
        const z = this.radius* Math.cos(positionSun.altitude) * Math.cos(positionSun.azimuth);
        return {x, y, z};
    }

    public updatePosition(x: number, y: number, z: number) : void {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
    }

    public animate(positionSun: {azimuth: number; altitude: number}) {
        const x = this.radius * Math.cos(positionSun.altitude) * Math.sin(positionSun.azimuth);
        const y = this.radius * Math.sin(positionSun.altitude);
        const z = this.radius* Math.cos(positionSun.altitude) * Math.cos(positionSun.azimuth);
        this.updatePosition(x, y, z);
        this.render();
    };

    /** Render using a blendFactor to blend from dayTexture to nightTexture according to the sliderValue. */
    public render(): void {
        this.gl.disable(this.gl.DEPTH_TEST);
        //this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        let mvp = twgl.m4.identity();
        const scaleFactor = 0.05;
        mvp = twgl.m4.scale(mvp, [scaleFactor, scaleFactor, 1], mvp);
        mvp = twgl.m4.translate(mvp, [this.position.x, this.position.y, this.position.z]);

        this.gl.useProgram(this.shaderProgram);

        if (this.shaderProgram && this.textures) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.sunTexture);
            this.gl.uniform1i(this.gl.getUniformLocation(this.shaderProgram, 'uTextureSun'), 0);

            twgl.setUniforms(this.shaderProgramInfo, { uMVP: mvp });

            twgl.setBuffersAndAttributes(this.gl, this.shaderProgramInfo, this.bufferInfo);
            twgl.drawBufferInfo(this.gl, this.bufferInfo, this.gl.TRIANGLE_STRIP);
        }
    }    
}

export default Sun;