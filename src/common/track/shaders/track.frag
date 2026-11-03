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
in float v_iconScale;
in float v_quadScale;

flat in int v_id; 

uniform mediump sampler2DArray u_textureArray;
uniform float u_hoverOverlayIconID;
uniform float u_selectedOverlayIconID;
uniform float u_highlightBorderRadius;
uniform float u_highlightBorderWidth;
uniform vec4 u_highlightColorHover;
uniform vec4 u_highlightColorSelected;
uniform float u_hoverStrokeType;
uniform float u_selectedStrokeType;
uniform vec2 u_hoverDashParams;
uniform vec2 u_selectedDashParams;

out vec4 fragColor;

void main() {
    float safeIconScale = max(v_iconScale, 0.0001);
    float safeQuadScale = max(v_quadScale, 0.0001);
    vec2 centeredCorner = v_uv_geometry - 0.5;
    float scaleRatio = safeQuadScale / safeIconScale;
    bool expandedQuad = scaleRatio > 1.0001;
    vec2 scaledCorner = centeredCorner * scaleRatio;
    vec2 sampleUV = vec2(scaledCorner.x + 0.5, 0.5 - scaledCorner.y);
    bool insideIcon = all(greaterThanEqual(sampleUV, vec2(0.0))) &&
        all(lessThanEqual(sampleUV, vec2(1.0)));
    if (!expandedQuad) {
        sampleUV = v_texCoord.xy;
        insideIcon = true;
    }

    vec4 texColor = vec4(0.0);
    if (insideIcon) {
        texColor = texture(u_textureArray, vec3(sampleUV, v_texCoord.z));
    }
    vec4 overlayColor = vec4(0.0);
    float overlayIconID = -1.0;
    if (v_status == 2) {
        overlayIconID = u_selectedOverlayIconID;
    } else if (v_status == 1) {
        overlayIconID = u_hoverOverlayIconID;
    }
    if (overlayIconID >= 0.0 && insideIcon) {
        overlayColor = texture(u_textureArray, vec3(sampleUV, overlayIconID));
    }
    vec4 finalColor = mix(texColor, overlayColor, overlayColor.a) * v_color;

    if (v_status > 0) {
        float halfExtent = safeQuadScale * 0.5;
        float radius = min(u_highlightBorderRadius, halfExtent);
        vec2 innerExtent = vec2(max(halfExtent - radius, 0.0));
        vec2 localPx = centeredCorner * safeQuadScale;
        vec2 q = abs(localPx) - innerExtent;
        vec2 maxQ = max(q, 0.0);
        float dist = length(maxQ) + min(max(q.x, q.y), 0.0) - radius;
        float halfBorder = u_highlightBorderWidth * 0.5;
        float borderMask = 1.0 - smoothstep(halfBorder, halfBorder + 1.0, abs(dist));

        float strokeType = v_status == 2 ? u_selectedStrokeType : u_hoverStrokeType;
        vec2 dashParams = v_status == 2 ? u_selectedDashParams : u_hoverDashParams;
        vec4 strokeColor = v_status == 2 ? u_highlightColorSelected : u_highlightColorHover;

        if (strokeType > 0.5) {
            float dashLength = max(dashParams.x, 0.001);
            float dashGap = max(dashParams.y, 0.001);
            float dashPeriod = dashLength + dashGap;
            vec2 absLocal = abs(localPx);
            bool horizontalEdge = absLocal.y >= absLocal.x;
            float dashCoord = horizontalEdge ? (localPx.x + halfExtent) : (localPx.y + halfExtent);
            float edgeOffset = horizontalEdge
                ? (localPx.y < 0.0 ? dashLength * 0.5 : 0.0)
                : (localPx.x < 0.0 ? dashLength * 0.5 : dashLength);
            float dashPhase = mod(max(dashCoord + edgeOffset, 0.0), dashPeriod);
            float dashMask = dashPhase < dashLength ? 1.0 : 0.0;
            borderMask *= dashMask;
        }

        borderMask = clamp(borderMask, 0.0, 1.0);
        if (borderMask > 0.001) {
            finalColor = mix(finalColor, strokeColor, borderMask);
        }
    }
    
    if (finalColor.a < 0.1) discard;
    fragColor = finalColor;
}