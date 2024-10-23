#version 300 es
precision highp float;

in vec2 vTexCoord;
out vec4 fragColor;

uniform sampler2D uTextureSun;   

void main() {
    vec2 center = vec2(0.5, 0.5);
    float radius = 0.5;
    float dist = distance(vTexCoord, center);

    if (dist > radius) {
        discard;
    }

    //Texture sampling:
    vec4 colorSun = texture(uTextureSun, vTexCoord);   

    fragColor = colorSun;

}