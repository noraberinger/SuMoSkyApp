#version 300 es
precision highp float;

in vec2 position;  // vec2 for Quad
in vec2 texcoord;  

uniform mat4 uMVP;

out vec2 vTexCoord;

void main() {
    gl_Position = uMVP * vec4(position, 0.0, 1.0);
    vTexCoord = texcoord;
}
