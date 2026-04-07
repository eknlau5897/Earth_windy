precision highp float;

uniform sampler2D u_particles;
uniform sampler2D u_wind;
uniform vec2 u_wind_res;
uniform vec2 u_wind_min; // [uMin, vMin] from JSON
uniform vec2 u_wind_max; // [uMax, vMax] from JSON
uniform float u_rand_seed;
uniform float u_speed_factor;
uniform float u_drop_rate;
uniform float u_drop_rate_bump;
uniform vec4 u_bbox;     // [minLon, minLat, maxLon, maxLat] from JSON

varying vec2 v_tex_pos;

const vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);
float rand(const vec2 co) {
    float t = dot(rand_constants.xy, co);
    return fract(sin(t) * (rand_constants.z + t));
}

// Bilinear filtering remains the same, but uv is now relative to your BBOX
vec2 lookup_wind(const vec2 uv) {
    vec2 px = 1.0 / u_wind_res;
    vec2 vc = (floor(uv * u_wind_res)) * px;
    vec2 f = fract(uv * u_wind_res);
    vec2 tl = texture2D(u_wind, vc).rg;
    vec2 tr = texture2D(u_wind, vc + vec2(px.x, 0)).rg;
    vec2 bl = texture2D(u_wind, vc + vec2(0, px.y)).rg;
    vec2 br = texture2D(u_wind, vc + px).rg;
    
    // Mix the raw 0-1 values from the texture
    vec2 raw_wind = mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);
    
    // SCALE by your dynamic uMin/uMax here
    return mix(u_wind_min, u_wind_max, raw_wind);
}

void main() {
    vec4 color = texture2D(u_particles, v_tex_pos);
    
    // 1. Decode particle position (0.0 to 1.0 within the BBOX)
    vec2 pos = vec2(
        color.r / 255.0 + color.b,
        color.g / 255.0 + color.a);

    // 2. Calculate current Latitude for Mercator distortion
    // Interpolate between BBOX minLat and maxLat
    float current_lat = mix(u_bbox.y, u_bbox.w, pos.y);
    
    // 3. Lookup actual wind speed (m/s)
    // 'pos' works directly as UV because our texture IS the BBOX
    vec2 velocity = lookup_wind(pos);
    float speed_t = length(velocity) / length(u_wind_max);

    // 4. Mercator Distortion Correction
    // cos(lat) compensates for horizontal stretching at high latitudes
    float distortion = cos(radians(current_lat));
    
    // Convert m/s to a coordinate offset (approximate)
    // Note: 0.0001 is a base scale, u_speed_factor handles the rest
    vec2 offset = vec2(velocity.x / distortion, -velocity.y) * 0.0001 * u_speed_factor;

    // 5. Movement & Boundary Check
    vec2 next_pos = pos + offset;

    // If particle leaves the BBOX, we force a "drop" (respawn)
    float is_outside = step(1.0, next_pos.x) + step(next_pos.x, 0.0) + 
                       step(1.0, next_pos.y) + step(next_pos.y, 0.0);

    // 6. Particle Reset Logic
    vec2 seed = (pos + v_tex_pos) * u_rand_seed;
    float drop_rate = u_drop_rate + speed_t * u_drop_rate_bump;
    
    // Reset if: random roll < drop_rate OR particle is outside BBOX
    float reset = step(rand(seed), drop_rate) + step(0.5, is_outside);
    
    vec2 random_pos = vec2(rand(seed + 1.3), rand(seed + 2.1));
    pos = mix(next_pos, random_pos, clamp(reset, 0.0, 1.0));

    // 7. Encode back to RGBA
    gl_FragColor = vec4(
        fract(pos * 255.0),
        floor(pos * 255.0) / 255.0);
}
