#version 300 es
precision highp float;

in vec2 position;
uniform vec2 translation;
uniform vec2 scale;

void main() {
    vec2 scaled = position * scale;
    vec2 translated = scaled + translation;
    gl_Position = vec4(translated, 0.0, 1.0);
}
