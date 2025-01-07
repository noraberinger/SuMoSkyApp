precision highp float;

attribute vec3 position;
attribute vec4 color;
varying vec4 vColor;
uniform mat4 viewProjection;

void main() {
    vColor = color;
    vec4 worldPos = vec4(position, 1.0);
    vec4 clipPos = viewProjection * worldPos;
    gl_Position = clipPos;
}