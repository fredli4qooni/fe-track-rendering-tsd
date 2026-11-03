#version 300 es
precision highp float;

layout(location = 0) in vec2 a_pos;

uniform mat4 u_viewProjection;
uniform vec2 u_center;
uniform float u_size;

out vec2 v_uv;

void main() {
    vec2 pos = u_center + a_pos * u_size;
    vec4 clip = u_viewProjection * vec4(pos, 0.0, 1.0);
    v_uv = a_pos + vec2(0.5);
    v_uv.y = 1.0 - v_uv.y;
    gl_Position = clip;
}
