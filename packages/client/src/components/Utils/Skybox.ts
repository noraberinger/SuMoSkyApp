'use strict';
import * as twgl from 'twgl.js';
const m4 = twgl.m4;
import Camera from 'terrender-core/src/Utils/Camera';
const skyFs = require('../shaders/skybox.frag');
const skyVs = require('../shaders/skybox.vert');


class Skybox {
    private gl: WebGL2RenderingContext | WebGLRenderingContext;
    private camera: Camera;
    private vertexBuffer: WebGLBuffer | null;
    private indexBuffer: WebGLBuffer | null;
    private cubemapDayTexture: WebGLTexture | null;
    private shaderProgramInfo: twgl.ProgramInfo;
    private shaderProgram: WebGLProgram | null;

    constructor(gl: WebGL2RenderingContext | WebGLRenderingContext, camera: Camera) {
        this.gl = gl;
        this.camera = camera;
        this.vertexBuffer = this.initBuffers();
        this.indexBuffer = this.initIndexBuffer();
        this.cubemapDayTexture = this.loadDayCubemap();
        this.shaderProgramInfo = twgl.createProgramInfo(this.gl, [skyVs, skyFs]);
        this.shaderProgram = this.shaderProgramInfo.program;
    }

    /** @returns vertexBuffer object
     *  Creates Float32Array for vertex data, uploads vertex data to GPU.
     */
    private initBuffers(): WebGLBuffer | null {
        const positions = new Float32Array([
            -1.0, -1.0, -1.0,	// index 0
			-1.0, -1.0, 1.0,
			-1.0, 1.0, 1.0,
			-1.0, 1.0, -1.0,

			1.0, 1.0, 1.0,		// index 4
			1.0, -1.0, 1.0,
			1.0, -1.0, -1.0,
			1.0, 1.0, -1.0,

			-1.0, -1.0, -1.0,	// index 8
			1.0, -1.0, -1.0,
			1.0, -1.0, 1.0,
			-1.0, -1.0, 1.0,

			1.0, 1.0, 1.0,		// index 12
			1.0, 1.0, -1.0,
			-1.0, 1.0, -1.0,
			-1.0, 1.0, 1.0,

			-1.0, -1.0, -1.0,	// index 16
			-1.0, 1.0, -1.0,
			1.0, 1.0, -1.0,
			1.0, -1.0, -1.0,

			1.0, 1.0, 1.0,		// index 20
			-1.0, 1.0, 1.0,
			-1.0, -1.0, 1.0,
			1.0, -1.0, 1.0 
        ]);
        
        const vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

        return vertexBuffer;

    }

    /** @returns indexBuffer object
     *  Creating Uint16Array for indexing the vertices => order in which to draw them.
     *  Creating index data, upload index data to GPU.
    */
    private initIndexBuffer(): WebGLBuffer | null {
        const faces = new Uint16Array([
            0, 1, 2, 2, 3, 0, 
            4, 5, 6, 6, 7, 4, 
            8, 9, 10, 10, 11, 8, 
            12, 13, 14, 14, 15, 12, 
            16, 17, 18, 18, 19, 16,
            20, 21, 22, 22, 23, 20
        ]);

        const indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, faces, this.gl.STATIC_DRAW);

        return indexBuffer;
    }

    /** @returns cubemap
     *  Define faces, each with image url (texture).
     *  Creating WebGL texture and binding it as cubemap.
     *  Creating an image for each face, upload image date to GPU.
     *  Configure texture filtering and wrapping.
     */
    private loadDayCubemap(): WebGLTexture | null {
        const dayTextureUrl = 'http://localhost:3000/assets/cloudy2.jpg';
        //const nightTextureUrl = 'http://localhost:3000/assets/skybox_back.png';

        const faces = [
            { target: this.gl.TEXTURE_CUBE_MAP_POSITIVE_X, url: dayTextureUrl },
            { target: this.gl.TEXTURE_CUBE_MAP_NEGATIVE_X, url: dayTextureUrl },
            { target: this.gl.TEXTURE_CUBE_MAP_POSITIVE_Y, url: dayTextureUrl },
            { target: this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, url: dayTextureUrl },
            { target: this.gl.TEXTURE_CUBE_MAP_POSITIVE_Z, url: dayTextureUrl },
            { target: this.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, url: dayTextureUrl },
        ];

        const dayCubemap = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, dayCubemap);

        let facesLoaded = 0;

        faces.forEach((face) => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.src = face.url;
        
            image.onload = () => {
                this.gl.texImage2D(face.target, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
                facesLoaded++;

                if (facesLoaded === faces.length) {
                    this.gl.texImage2D(face.target, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
                    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
                    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
                    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                    this.gl.texParameteri(this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
                }
            };

            image.onerror = () => {
                console.error(`Failed to load texture image from ${face.url}`);
            };
        });

        return dayCubemap;
    }      

    /** Disabling depth test => skybox should always render behing terrender.
     *  Clear color buffer as prep.
     *  Bind shader program, index and vertex buffer.
     *  Get attribute setup for vertex position data.
     *  Get uniform location for view and projection matrices of camera, upload to GPU.
     *  Bind texture and set as uniform.
     *  Drawing using drawElements.
     *  Finally, re-enable depth test.
     */
    public render(isNight: boolean): void {
        this.gl.disable(this.gl.DEPTH_TEST);
        //this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.gl.useProgram(this.shaderProgram);  

        if (this.shaderProgram) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
            const positionLocation = this.gl.getAttribLocation(this.shaderProgram, 'vPosition');
            this.gl.enableVertexAttribArray(positionLocation);
            this.gl.vertexAttribPointer(positionLocation, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            
            this.camera.calculateMatrices();

            if (this.camera.viewMatrix && this.camera.projectionMatrix) {
                let viewNoTranslation = m4.copy(this.camera.viewMatrix);
                viewNoTranslation[12] = 0; 
                viewNoTranslation[13] = 0;
                viewNoTranslation[14] = 0;

                const projectionLocation = this.gl.getUniformLocation(this.shaderProgram, 'uProjection');
                const viewLocation = this.gl.getUniformLocation(this.shaderProgram, 'uView');
                const textureLocation = this.gl.getUniformLocation(this.shaderProgram, 'uSkybox');

                this.gl.uniformMatrix4fv(projectionLocation, false, this.camera.projectionMatrix);
                this.gl.uniformMatrix4fv(viewLocation, false, viewNoTranslation);

                this.gl.activeTexture(this.gl.TEXTURE0);
                this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.cubemapDayTexture);
                this.gl.uniform1i(textureLocation, 0);
            } else {
                console.error('viewMatrix or projectionMatrix is undefined.');
                return;
            }
            
            console.log('Drawing sky');
            this.gl.drawElements(this.gl.TRIANGLES, 36, this.gl.UNSIGNED_SHORT, 0);
            //this.gl.enable(this.gl.DEPTH_TEST);
        }
    }
}

export default Skybox;

