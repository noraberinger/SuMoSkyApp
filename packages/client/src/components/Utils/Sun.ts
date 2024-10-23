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

    constructor(gl: WebGL2RenderingContext | WebGLRenderingContext) {
        this.gl = gl;
        this.textures = { sunTexture: null };
        this.shaderProgramInfo = twgl.createProgramInfo(this.gl, [sunVs, sunFs]);
        this.shaderProgram = this.shaderProgramInfo.program;
        this.bufferInfo = this.createQuadBuffer();
        //this.bufferInfo = this.createCircleBuffer(100);
        this.setupTextures();
    }

    /** Create a simple Quad */
    //TODO: instead of a Quad make a Circle such that Sun is actually round.
    private createQuadBuffer(): twgl.BufferInfo {
        const arrays = {
            position: { numComponents: 2, data: [-1, -1, 1, -1, -1, 1, 1, 1] },
            texcoord: { numComponents: 2, data: [0, 0, 1, 0, 0, 1, 1, 1] },
        };
        return twgl.createBufferInfoFromArrays(this.gl, arrays);
    }

    private createCircleBuffer(numSegments: number): twgl.BufferInfo {
        const positions = [];
        const texcoords = [];
        const center = [0, 0];

        positions.push(...center);
        texcoords.push(0.5, 0.5);

        for (let i = 0; i <= numSegments; i++) {
            const angle = (i / numSegments) * Math.PI * 2;
            const x = Math.cos(angle);
            const y = Math.sin(angle);
            positions.push(x, y);

            const texX = (x + 1) / 2;
            const texY = (y + 1) / 2;
            texcoords.push(texX, texY);
        }

        const arrays = {
            position: { numComponents: 2, data: positions},
            texcoord: { numComponents: 2, data: texcoords},
        };

        return twgl.createBufferInfoFromArrays(this.gl, arrays);
    }

    /** Create textures. */
    private setupTextures(): void {
        const sunUrl = '/textures/sun/sun.png';

        this.textures.sunTexture = twgl.createTexture(this.gl, {
            src: sunUrl,
            crossOrigin: "anonymous"
        });
    }

    /** Render using a blendFactor to blend from dayTexture to nightTexture according to the sliderValue. */
    public render(): void {
        this.gl.disable(this.gl.DEPTH_TEST);
        //this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        let mvp = twgl.m4.identity();
        const scaleFactor = 0.05;
        mvp = twgl.m4.scale(mvp, [scaleFactor, scaleFactor, 1], mvp);
        const translateX = -15;
        const translateY = 10;
        mvp = twgl.m4.translate(mvp, [translateX, translateY, 0]);

        this.gl.useProgram(this.shaderProgram);

        if (this.shaderProgram && this.textures) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.sunTexture);
            this.gl.uniform1i(this.gl.getUniformLocation(this.shaderProgram, 'uTextureSun'), 0);

            twgl.setUniforms(this.shaderProgramInfo, {
                uMVP: mvp,
            });

            twgl.setBuffersAndAttributes(this.gl, this.shaderProgramInfo, this.bufferInfo);
            twgl.drawBufferInfo(this.gl, this.bufferInfo, this.gl.TRIANGLE_STRIP);
        }
    }    
}

export default Sun;