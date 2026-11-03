#version 300 es
precision mediump float;

uniform sampler2D u_fontAtlas;

uniform vec3 u_color;
uniform vec3 u_colorSelected;
uniform vec3 u_colorHover;

uniform vec3 u_outlineColor;
uniform float u_outlineWidth;

in vec2 v_uv;
flat in float v_isSelected;
flat in float v_isHovered;

out vec4 outColor;

float median(float r, float g, float b) { return max(min(r, g), min(max(r, g), b)); }

void main() {
    ivec2 texSize = textureSize(u_fontAtlas, 0);
    vec2 sz = vec2(float(texSize.x), float(texSize.y));
    float pxRange = 4.0; 
    
    float dx = sz.x * length(vec2(dFdx(v_uv.x), dFdy(v_uv.x)));
    float dy = sz.y * length(vec2(dFdx(v_uv.y), dFdy(v_uv.y)));
    float toPixels = pxRange * inversesqrt(dx * dx + dy * dy);
    
    vec3 msd = texture(u_fontAtlas, v_uv).rgb;
    float sd = median(msd.r, msd.g, msd.b);
    
    float sigDist = sd - 0.5;
    float pxDist = sigDist * toPixels;
    float textOpacity = smoothstep(-0.5, 0.5, pxDist);

    float outlineSigDist = sd - (0.5 - u_outlineWidth);
    float outlinePxDist = outlineSigDist * toPixels;
    float outlineOpacity = smoothstep(-0.5, 0.5, outlinePxDist);

    if (outlineOpacity < 0.01) discard;

    vec3 coreColor = u_color;
    if (v_isHovered > 0.5) {
        coreColor = u_colorHover;
    }
    if (v_isSelected > 0.5) {
        coreColor = u_colorSelected; 
    }

    vec3 finalColor = mix(u_outlineColor, coreColor, textOpacity);

    outColor = vec4(finalColor, outlineOpacity);
}