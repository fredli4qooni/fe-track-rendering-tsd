#version 300 es
/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
layout(location = 0) in vec2 a_quadCorner;
layout(location = 1) in vec2 a_instancePosition;
layout(location = 2) in float a_instanceIconID;
layout(location = 3) in vec4 a_instanceColor;
layout(location = 4) in float a_instanceScale;
layout(location = 5) in float a_instanceID;

uniform mat4 u_viewProjection;
uniform vec2 u_viewportSize;
uniform float u_selectedID;
uniform float u_hoveredID;
uniform float u_highlightBoxSize;

out vec4 v_color;
out vec3 v_texCoord;
flat out int v_status;
out vec2 v_uv_geometry;
out float v_iconScale;
out float v_quadScale;
flat out int v_id;

void main() {
    v_color = a_instanceColor;
    v_id = int(a_instanceID);

    float currentID = a_instanceID;
    bool isSelected = abs(currentID - u_selectedID) < 0.1;
    bool isHovered = (!isSelected) && (abs(currentID - u_hoveredID) < 0.1);
    
    if (isSelected) v_status = 2;
    else if (isHovered) v_status = 1;
    else v_status = 0;

    float highlightScale = max(a_instanceScale, u_highlightBoxSize);
    float quadScale = v_status > 0 ? highlightScale : a_instanceScale;
    v_iconScale = a_instanceScale;
    v_quadScale = quadScale;

    v_uv_geometry = a_quadCorner + 0.5;
    vec2 uv = a_quadCorner + 0.5;
    uv.y = 1.0 - uv.y;
    v_texCoord = vec3(uv, a_instanceIconID);
    
    vec4 clipCenter = u_viewProjection * vec4(a_instancePosition, 0.0, 1.0);
    vec2 pixelOffset = a_quadCorner * quadScale;
    vec2 clipOffset = (pixelOffset / u_viewportSize) * 2.0;
    
    float passiveZ = -(a_instanceID / 20000.0) * 0.7; 

    float zDepth = passiveZ;

    if (v_status == 1) { 
        zDepth = -0.8; 
    } 
    else if (v_status == 2) { 
        zDepth = -0.9; 
    }

    gl_Position = vec4(clipCenter.xy + clipOffset, zDepth, 1.0);
}