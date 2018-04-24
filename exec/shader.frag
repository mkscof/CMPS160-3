// this is the fragment shader: it is called for each fragment (i.e. a pixel)

#ifdef GL_ES
precision mediump float;
#endif

// varying variables are passed from the vertex shader to the fragment shader, and are interpolated
varying vec4 v_Color;

void main() {
  gl_FragColor = v_Color;
}
