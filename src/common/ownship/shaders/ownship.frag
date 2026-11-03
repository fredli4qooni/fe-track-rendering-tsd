#version 300 es
precision mediump float;

in vec2 v_uv;
uniform sampler2D u_texture;
uniform float u_opacity;

out vec4 outColor;

void main() {
    vec4 tex = texture(u_texture, v_uv);
    outColor = vec4(tex.rgb, tex.a * u_opacity);
}
