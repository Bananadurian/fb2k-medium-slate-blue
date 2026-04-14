/*
 * frag.glsl - Fragment shader implementation.
 *
 * Copyright (c) 2025 Jimmy Cassis
 * SPDX-License-Identifier: MPL-2.0
 */

#version 460

layout(location=1) uniform sampler2D tex;

layout(location=0) smooth in vec2 vs_tex_coord;
layout(location=0) out vec4 color;

void main()
{
    color = vec4(texture(tex, vs_tex_coord).rgb, 1.0);
}