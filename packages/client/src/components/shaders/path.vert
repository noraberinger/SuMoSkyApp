#version 300 es
precision highp float; 

in vec3 position;
out vec4 vColor;

uniform vec4 uColor;
uniform mat4 uMVP;

void main() {
    gl_Position = uMVP * vec4(position, 1.0);
    vColor = uColor;
}