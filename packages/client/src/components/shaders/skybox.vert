#version 300 es
in vec3 vPosition;

uniform mat4 uProjection;
uniform mat4 uView;

out vec3 TexCoord0;

void main() {
    gl_Position = uProjection * uView * vec4(vPosition, 1.0);
    TexCoord0 = vPosition;
}