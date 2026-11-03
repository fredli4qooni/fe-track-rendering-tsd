#version 300 es
/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
precision highp float;

in float v_distance;

uniform vec3 u_color;
uniform float u_dashSize;
uniform float u_gapSize;

out vec4 fragColor;

void main() {
	float patternLength = u_dashSize + u_gapSize;
	float patternPos = mod(v_distance, patternLength);
	if (patternPos > u_dashSize) {
		discard;
	}
	fragColor = vec4(u_color, 1.0);
}
