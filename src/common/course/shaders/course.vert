#version 300 es
layout(location = 0) in float a_linePos;

uniform mat4 u_viewProjection;
uniform sampler2D u_dataTexture; 
uniform float u_dataTextureSize;
uniform float u_length;
uniform float u_bearing;

void main() {
    int id = gl_InstanceID;
    int texWidth = int(u_dataTextureSize);
    
    vec4 data = texelFetch(u_dataTexture, ivec2(id % texWidth, id / texWidth), 0);

    if (data.w < 0.5) {
        gl_Position = vec4(-2.0, -2.0, 0.0, 1.0); 
        return;
    }

    vec2 origin = data.xy;
    float courseRad = data.z;

    float visualAngle = courseRad - u_bearing;

    vec2 direction = vec2(sin(visualAngle), -cos(visualAngle));

    vec2 currentPos = origin + (direction * u_length * a_linePos);

    gl_Position = u_viewProjection * vec4(currentPos, 0.0, 1.0);
}