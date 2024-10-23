#version 300 es
precision highp float;

in vec2 vTexCoord; // Texture coordinates from vertex shader
out vec4 fragColor;

uniform sampler2D uTextureDay;   
uniform sampler2D uTextureNight; 
uniform sampler2D uTextureSunsetSunrise; 
uniform float uBlendFactor; // Blending factor (0.0 = night, 1.0 = day, 0.5 = sunset/sunrise)

void main() {
    //Sampling of Textures:
    vec4 colorDay = texture(uTextureDay, vTexCoord);   
    vec4 colorNight = texture(uTextureNight, vTexCoord); 
    vec4 colorSunsetSunrise = texture(uTextureSunsetSunrise, vTexCoord);

    if (uBlendFactor == 0.5) {
        fragColor = colorSunsetSunrise;
    } else {
        fragColor = mix(colorNight, colorDay, uBlendFactor);
    }
}



