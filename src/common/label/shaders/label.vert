#version 300 es
layout(location = 0) in vec2 a_pos;
layout(location = 1) in vec4 a_instanceUVRect; 
layout(location = 2) in float a_entityID;    
layout(location = 3) in vec2 a_charOffset;   
layout(location = 4) in vec2 a_pixelSize;

uniform mat4 u_viewProjection;
uniform vec2 u_viewportSize;
uniform sampler2D u_dataTexture;
uniform float u_dataTextureSize; 
uniform float u_selectedID;
uniform float u_hoveredID;

out vec2 v_uv;
flat out float v_isSelected;
flat out float v_isHovered;

void main() {
    vec2 flippedPos = vec2(a_pos.x, 1.0 - a_pos.y);
    v_uv = a_instanceUVRect.xy + (flippedPos * a_instanceUVRect.zw);

    if (abs(a_entityID - u_selectedID) < 0.1) {
        v_isSelected = 1.0;
    } else {
        v_isSelected = 0.0;
    }

    if (abs(a_entityID - u_hoveredID) < 0.1) {
        v_isHovered = 1.0;
    } else {
        v_isHovered = 0.0;
    }

    int id = int(a_entityID);
    int texWidth = int(u_dataTextureSize);
    vec4 unitData = texelFetch(u_dataTexture, ivec2(id % texWidth, id / texWidth), 0);
    
    vec4 clipCenter = u_viewProjection * vec4(unitData.xy, 0.0, 1.0);
    
    vec2 vertexPixelSize = a_pos * a_pixelSize;
    vec2 pixelOffset = a_charOffset + vertexPixelSize;
    vec2 clipOffset = (pixelOffset / u_viewportSize) * 2.0 * clipCenter.w;
    
    float passiveZ = -(a_entityID / 20000.0) * 0.7;

    float zDepth = passiveZ;
    
    bool isSel = abs(a_entityID - u_selectedID) < 0.1;
    bool isHov = abs(a_entityID - u_hoveredID) < 0.1;

    if (isHov) {
        zDepth = -0.8;
    } else if (isSel) {
        zDepth = -0.9;
    }

    zDepth -= 0.0001;

    gl_Position = vec4(clipCenter.xy + clipOffset, zDepth, clipCenter.w);
}