#version 300 es
precision highp float;

layout(location = 0) in vec2 a_pos;

uniform mat4 u_viewProjection;

void main() {
    vec4 clip = u_viewProjection * vec4(a_pos, 0.0, 1.0);
    gl_Position = clip;
}
