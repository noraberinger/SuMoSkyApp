'use strict';
import * as twgl from 'twgl.js';
const moonFs = require('../shaders/moon.frag');
const moonVs = require('../shaders/moon.vert');

class Moon {
    private gl: WebGL2RenderingContext | WebGLRenderingContext;
    private textures: { moonTexture: WebGLTexture | null };
    private shaderProgramInfo: twgl.ProgramInfo;
    private shaderProgram: WebGLProgram | null;
    private bufferInfo: twgl.BufferInfo;

    constructor(gl: WebGL2RenderingContext | WebGLRenderingContext) {
        this.gl = gl;
        this.textures = { moonTexture: null };
        this.shaderProgramInfo = twgl.createProgramInfo(this.gl, [moonVs, moonFs]);
        this.shaderProgram = this.shaderProgramInfo.program;
        this.bufferInfo = this.createQuadBuffer();
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
        const moonUrl = '/textures/moon.png';

        this.textures.moonTexture = twgl.createTexture(this.gl, {
            src: moonUrl,
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
        const translateX = 15;
        const translateY = 10;
        mvp = twgl.m4.translate(mvp, [translateX, translateY, 0]);

        this.gl.useProgram(this.shaderProgram);

        if (this.shaderProgram && this.textures) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.moonTexture);
            this.gl.uniform1i(this.gl.getUniformLocation(this.shaderProgram, 'uTextureMoon'), 0);

            twgl.setUniforms(this.shaderProgramInfo, {
                uMVP: mvp,
            });

            twgl.setBuffersAndAttributes(this.gl, this.shaderProgramInfo, this.bufferInfo);
            twgl.drawBufferInfo(this.gl, this.bufferInfo, this.gl.TRIANGLE_STRIP);
        }
    }    
}

export default Moon;