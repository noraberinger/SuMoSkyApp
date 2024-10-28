/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';
import * as twgl from 'twgl.js';
import { convertLatLngToCoords, convertDateTime, calculateSunTimes } from './Calc';
import L, { LatLngExpression } from 'leaflet';
import { act } from 'react';

//TODO find out why ts doesn't recognize import of shader
const shadedFs = require('../shaders/skyQuadBlended.frag');
const shadedVs = require('../shaders/skyQuadBlended.vert');

class SkyQuadBlended {
    private gl: WebGL2RenderingContext | WebGLRenderingContext;
    private textures: { dayTexture: WebGLTexture | null; nightTexture: WebGLTexture | null; sunsetTexture: WebGLTexture | null; sunriseTexture: WebGLTexture | null };
    private shaderProgramInfo: twgl.ProgramInfo;
    private shaderProgram: WebGLProgram | null;
    private bufferInfo: twgl.BufferInfo;
    private lightningPhase: number;
    private dayPhase: number;

    constructor(gl: WebGL2RenderingContext | WebGLRenderingContext, date: Date, time: number, center:  L.LatLngExpression | undefined) {
        this.gl = gl;
        this.textures = { dayTexture: null, nightTexture: null, sunsetTexture: null, sunriseTexture: null };
        this.setupTextures();
        this.shaderProgramInfo = twgl.createProgramInfo(this.gl, [shadedVs, shadedFs]);
        this.shaderProgram = this.shaderProgramInfo.program;
        this.bufferInfo = this.createQuadBuffer();
        this.clamp(0, 0, 0);
        this.lightningPhase = 0;
        this.dayPhase = 0;
        this.syncDateTime(date, time, center);
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
        const sunsetTextureUrl = '/textures/sunrise.jpg';
        const sunriseTextureUrl = '/textures/layered.jpg';
        
        this.textures.dayTexture = twgl.createTexture(this.gl, {
            src: dayTextureUrl,
        });

        this.textures.nightTexture = twgl.createTexture(this.gl, {
            src: nightTextureUrl,
        });

        this.textures.sunsetTexture = twgl.createTexture(this.gl, {
            src: sunsetTextureUrl,
        });

        this.textures.sunriseTexture = twgl.createTexture(this.gl, {
            src: sunriseTextureUrl,
        });
    }

    /** Helper function to ensure clamping of the blendFactor */
    private clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }
    
    public syncDateTime(date: Date, time: number, center: L.LatLngExpression | undefined) : void {
        if (center) {
            const actualTime = convertDateTime(date, time);
            const { lat, lng } = convertLatLngToCoords(center);
            const sunTimes = calculateSunTimes(lat, lng, date);

            const sunsetHour = sunTimes.sunset.getHours();
            const sunriseHour = sunTimes.sunrise.getHours();
            const currentHour = actualTime.getHours();

            const totalHoursDay = sunsetHour - sunriseHour;
            const hoursSinceSunrise = currentHour - sunriseHour;

            if (currentHour == sunriseHour) {
                this.lightningPhase = 0.5;
                this.dayPhase = 0.7;
            } else if (currentHour < sunriseHour || currentHour > sunsetHour) {
                this.lightningPhase = 0.0;
                this.dayPhase = 0.0;
            } else if (currentHour === sunsetHour) {
                this.lightningPhase = 0.75;
                this.dayPhase = 0.0;
            } else {
                this.lightningPhase = 1.0;
                if (currentHour == 12) {
                    this.dayPhase = 1.0;
                } else if (currentHour < 12) {
                    this.dayPhase = 0.5 + (hoursSinceSunrise / totalHoursDay) * 0.5;
                } else {
                    this.dayPhase = 1.0 - (hoursSinceSunrise / totalHoursDay) * 0.2;
                }
            }
        }   

        this.lightningPhase = this.clamp(this.lightningPhase, 0.0, 1.0);
        this.dayPhase = this.clamp(this.dayPhase, 0.0, 1.0);
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
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.sunsetTexture);
            this.gl.uniform1i(this.gl.getUniformLocation(this.shaderProgram, 'uTextureSunset'), 2);

            this.gl.activeTexture(this.gl.TEXTURE3);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.sunriseTexture);
            this.gl.uniform1i(this.gl.getUniformLocation(this.shaderProgram, 'uTextureSunrise'), 3);
        
            this.gl.uniform1f(this.gl.getUniformLocation(this.shaderProgram, 'uLightningPhase'), this.lightningPhase);

            this.gl.uniform1f(this.gl.getUniformLocation(this.shaderProgram, 'uDayPhase'), this.dayPhase);

            twgl.setUniforms(this.shaderProgramInfo, { uMVP: mvp });

            twgl.setBuffersAndAttributes(this.gl, this.shaderProgramInfo, this.bufferInfo);
            twgl.drawBufferInfo(this.gl, this.bufferInfo, this.gl.TRIANGLE_STRIP);
        }
    }
}

export default SkyQuadBlended;

