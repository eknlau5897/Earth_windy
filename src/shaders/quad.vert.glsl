precision mediump float;

attribute vec2 a_pos; // 0 to 1 (normalized texture coordinates)
uniform vec2 u_offset; // [-114.17, -22.35]
uniform float u_zoom;   // 400.0

void main() {
    // Step 1: Convert 0-1 range to actual degrees (-180 to 180, -90 to 90)
    vec2 degrees = vec2(a_pos.x * 360.0 - 180.0, a_pos.y * 180.0 - 90.0);

    // Step 2: Apply the offset (center on HK) and multiply by zoom
    // We divide by 180 to keep the result within the WebGL clip space (-1 to 1)
    vec2 ndcPos = (degrees + u_offset) * (u_zoom / 180.0);

    gl_Position = vec4(ndcPos, 0.0, 1.0);
}
