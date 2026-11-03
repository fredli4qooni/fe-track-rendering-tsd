#version 300 es
/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in float a_distance;

uniform mat4 u_viewProjection;

out float v_distance;

void main() {
	v_distance = a_distance;
	gl_Position = u_viewProjection * vec4(a_position, 1.0);
}
