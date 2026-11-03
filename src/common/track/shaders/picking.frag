#version 300 es
/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
precision mediump float;

in vec4 v_color;
in vec3 v_texCoord;
flat in int v_status;
in vec2 v_uv_geometry;

flat in int v_id;

out vec4 fragColor;

void main() {
    int i = v_id + 1;

    fragColor = vec4(
        float((i >> 0) & 0xFF) / 255.0,
        float((i >> 8) & 0xFF) / 255.0,
        float((i >> 16) & 0xFF) / 255.0,
        1.0
    );
}