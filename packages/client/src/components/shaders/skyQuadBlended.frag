#version 300 es
precision highp float;

in vec2 vTexCoord; // Texture coordinates from vertex shader
out vec4 fragColor;

uniform sampler2D uTextureDay;   
uniform sampler2D uTextureNight; 
uniform sampler2D uTextureSunset; 
uniform sampler2D uTextureSunrise;
uniform float uLightningPhase; // Phase of the day 0.0 = night, 1.0 = day, 0.5 = sunrise, 0.75 = sunset
uniform float uDayPhase;

void main() {
    //Sampling of Textures:
    vec4 colorDay = texture(uTextureDay, vTexCoord);   
    vec4 colorNight = texture(uTextureNight, vTexCoord); 
    vec4 colorSunset = texture(uTextureSunset, vTexCoord);
    vec4 colorSunrise = texture(uTextureSunrise, vTexCoord);

    float brightnessFactor;
    brightnessFactor = smoothstep(0.0, 1.0, uDayPhase);  
    colorDay.rgb *= brightnessFactor;

    if (uLightningPhase == 0.5) {
        fragColor = colorSunrise;
    } else if (uLightningPhase == 1.0) {
        fragColor = colorDay;
    } else if (uLightningPhase == 0.75) {
        colorSunset.rgb *= 0.75;
        fragColor = colorSunset;
    } else if (uLightningPhase == 0.0) {
        fragColor = colorNight;
    }
}



