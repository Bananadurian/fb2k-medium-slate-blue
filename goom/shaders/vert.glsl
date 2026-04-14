/*
 * vert.glsl - Fragment shader implementation.
 *
 * Copyright (c) 2025 Jimmy Cassis
 * SPDX-License-Identifier: MPL-2.0
 */

#version 460

layout(location=0) uniform mat4 u_projModelMat;

layout(location=0) in vec2 in_position;
layout(location=1) in vec2 in_tex_coord;
layout(location=0) smooth out vec2 vs_tex_coord;

void main()
{
    gl_Position = u_projModelMat * vec4(in_position.x, in_position.y, 0.0, 1.0); 
    vs_tex_coord = in_tex_coord;
}