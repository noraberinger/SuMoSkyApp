#version 300 es
precision highp float;

in vec3 TexCoord0;
uniform samplerCube uSkybox;

out vec4 FragColor;

void main() {
    FragColor = texture(uSkybox, TexCoord0);
    //FragColor = vec4(FragColor, 1);
}