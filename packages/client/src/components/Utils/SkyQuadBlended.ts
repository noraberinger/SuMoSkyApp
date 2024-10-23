'use strict';
import * as twgl from 'twgl.js';
import SunCalc from 'suncalc';
import { convertDateTime } from './Calc';
const shadedFs = require('../shaders/skyQuadBlended.frag');
const shadedVs = require('../shaders/skyQuadBlended.vert');

class SkyQuadBlended {
    private gl: WebGL2RenderingContext | WebGLRenderingContext;
    private textures: { dayTexture: WebGLTexture | null; nightTexture: WebGLTexture | null; sunsetSunriseTexture: WebGLTexture | null };
    private shaderProgramInfo: twgl.ProgramInfo;
    private shaderProgram: WebGLProgram | null;
    private bufferInfo: twgl.BufferInfo;
    private blendFactor: number;

    constructor(gl: WebGL2RenderingContext | WebGLRenderingContext) {
        this.gl = gl;
        this.textures = { dayTexture: null, nightTexture: null, sunsetSunriseTexture: null };
        this.shaderProgramInfo = twgl.createProgramInfo(this.gl, [shadedVs, shadedFs]);
        this.shaderProgram = this.shaderProgramInfo.program;
        this.bufferInfo = this.createQuadBuffer();
        this.setupTextures();
        this.clamp(0, 0, 0);
        this.blendFactor = 0.0;
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
        const dayTextureUrl = '/textures/cloudy2.jpg';
        const nightTextureUrl = '/textures/pleiades_cube.jpeg';
        const sunsetSunriseTextureUrl = '/textures/layered.jpg';

        this.textures.dayTexture = twgl.createTexture(this.gl, {
            src: dayTextureUrl,
        });

        this.textures.nightTexture = twgl.createTexture(this.gl, {
            src: nightTextureUrl,
        });

        this.textures.sunsetSunriseTexture = twgl.createTexture(this.gl, {
            src: sunsetSunriseTextureUrl,
        });
    }

    /** Helper function to ensure clamping of the blendFactor */
    private clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }
    
    public syncDateTime(date: Date, time: number) : void {
        const actualTime = convertDateTime(date, time);

        const isNight = actualTime.getHours() > 18 ||  actualTime.getHours() < 6;
        let blendFactor= 0.0;

        if (isNight) {
            blendFactor = 0.5;
        } else {
            blendFactor = (time - 6) / 12;
        }
        this.blendFactor = this.clamp(blendFactor, 0.0, 1.0);
    }

    /** Render using a blendFactor to blend from dayTexture to nightTexture according to the sliderValue. */
    public render(): void {
        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        const mvp = twgl.m4.identity();

        this.gl.useProgram(this.shaderProgram);
    
        if (this.shaderProgram && this.textures) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.dayTexture);
            this.gl.uniform1i(this.gl.getUniformLocation(this.shaderProgram, 'uTextureDay'), 0);
        
            this.gl.activeTexture(this.gl.TEXTURE1);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.nightTexture);
            this.gl.uniform1i(this.gl.getUniformLocation(this.shaderProgram, 'uTextureNight'), 1);

            this.gl.activeTexture(this.gl.TEXTURE2);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.sunsetSunriseTexture);
            this.gl.uniform1i(this.gl.getUniformLocation(this.shaderProgram, 'uTextureSunsetSunrise'), 2);
        
            this.gl.uniform1f(this.gl.getUniformLocation(this.shaderProgram, 'uBlendFactor'), this.blendFactor);

            twgl.setUniforms(this.shaderProgramInfo, {
                uMVP: mvp,
            });

            twgl.setBuffersAndAttributes(this.gl, this.shaderProgramInfo, this.bufferInfo);
            twgl.drawBufferInfo(this.gl, this.bufferInfo, this.gl.TRIANGLE_STRIP);
        }
    }
}

export default SkyQuadBlended;

