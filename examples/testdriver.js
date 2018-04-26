// Example showing how you can convert a wireframe to a skinned model with triangles

var FSIZE = 4; // size of a vertex coordinate (32-bit float)
var VSHADER_SOURCE = null; // vertex shader program
var FSHADER_SOURCE = null; // fragment shader program

// called when page is loaded
function main() {
    // retrieve <canvas> element
    var canvas = document.getElementById('webgl');
    // get the rendering context for WebGL
    var gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }
    // load shader files
    loadFile("shader.vert", function(shader_src) { setShader(gl, gl.VERTEX_SHADER, shader_src); });
    loadFile("shader.frag", function(shader_src) { setShader(gl, gl.FRAGMENT_SHADER, shader_src); });
}

// set appropriate shader and start if both are loaded
function setShader(gl, shader, shader_src) {
    if (shader == gl.VERTEX_SHADER)
        VSHADER_SOURCE = shader_src;
    if (shader == gl.FRAGMENT_SHADER)
        FSHADER_SOURCE = shader_src;
    if (VSHADER_SOURCE && FSHADER_SOURCE)
        start(gl);
}

// called when shaders are done loading
function start(gl) {
    // initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }
    // initialize buffers
    var success = initVertexBuffer(gl);
    success = success && initIndexBuffer(gl);
    success = success && initAttributes(gl);  
    if (!success) {
        console.log('Failed to initialize buffers.');
        return;
    }
    // specify the color for clearing <canvas>
    gl.clearColor(0, 0, 0, 1);
    // clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);

    // draw a polygon wireframe (red)
    drawPolygonWireframe(gl, 9, 0.3, -0.5, -0.3, 1, 0, 0, 1);
    // draw a polygon filled in using TRIANGLES (uses drawElements) (green)
    drawPolygonTriangles1(gl, 9, 0.3, 0.5, -0.3, 0, 1, 0, 1);
    // draw a polygon filled in using TRIANGLES (uses drawArrays) (blue)
    drawPolygonTriangles2(gl, 9, 0.3, 0, 0.3, 0, 0, 1, 1);
}

// initialize vertex buffer
function initVertexBuffer(gl) {
    // create buffer object
    var vertex_buffer = gl.createBuffer();
    if (!vertex_buffer) {
        console.log("failed to create vertex buffer");
        return false;
    }
    // bind buffer objects to targets
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    return true;
}

// initialize index buffer
function initIndexBuffer(gl) {
    // create buffer object
    var index_buffer = gl.createBuffer();
    if (!index_buffer) {
        console.log("failed to create index buffer");
        return false;
    }
    // bind buffer objects to targets
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
    return true;
}

// set data in vertex buffer (given typed float32 array)
function setVertexBuffer(gl, vertices) {
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
}

// set data in index buffer (given typed uint16 array)
function setIndexBuffer(gl, indices) {
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
}

// initializes attributes
function initAttributes(gl) {
    // assign buffers and enable assignment
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
    if (a_Position < 0) {
        console.log("failed to get storage location of a_Position");
        return false;
    }
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 7, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.vertexAttribPointer(a_Color, 4, gl.FLOAT, false, FSIZE * 7, FSIZE * 3);
    gl.enableVertexAttribArray(a_Color);
    return true;
}

// draws an n-sided polygon wireframe with radius r centered at (c_x, c_y) with color (r, g, b, a)
function drawPolygonWireframe(gl, n, rad, c_x, c_y, r, g, b, a) {
    var vert = []; // vertex array
    var ind = []; // index array
    // angle (in radians) between sides
    var angle = (2 * Math.PI) / n; 
    // create triangles
    for (var i = 0; i < n; i++) {
        // calculate the vertex locations
        var x1 = (rad * Math.cos(angle * i)) + c_x;
        var y1 = (rad * Math.sin(angle * i)) + c_y;
        var x2 = (rad * Math.cos(angle * (i + 1))) + c_x;
        var y2 = (rad * Math.sin(angle * (i + 1))) + c_y;
        // calculate the per-surface color (all vertices on the same surface have the same color for Assignment 3)
        // for assignment 3, you will need to calculate surface normals.
        // in this example, we will shade based on position (namely, the average of the corners of the triangle)
        var col = shadeRightwards((c_x + x1 + x2)/2, (c_y + y1 + y2)/3, r, g, b, a);
        // center vertex
        vert.push(c_x); 
        vert.push(c_y); 
        vert.push(0);
        vert.push(col[0]);
        vert.push(col[1]);
        vert.push(col[2]);
        vert.push(col[3]);
        // first outer vertex
        vert.push(x1);
        vert.push(y1);
        vert.push(0);
        vert.push(col[0]);
        vert.push(col[1]);
        vert.push(col[2]);
        vert.push(col[3]);
        // second outer vertex
        vert.push(x2);
        vert.push(y2);
        vert.push(0);
        vert.push(col[0]);
        vert.push(col[1]);
        vert.push(col[2]);
        vert.push(col[3]);
        // connect vertices
        ind.push(i * 3); // start at center
        ind.push((i * 3) + 1); // go to first outer vertex
        ind.push((i * 3) + 2); // go to second outer vertex
        ind.push(i * 3); // go back to center
    }
    // set buffers
    setVertexBuffer(gl, new Float32Array(vert));
    setIndexBuffer(gl, new Uint16Array(ind));
    // draw polygon
    gl.drawElements(gl.LINE_STRIP, ind.length, gl.UNSIGNED_SHORT, 0);    
}

// draws an n-sided polygon with filled triangles with radius r centered at (c_x, c_y) with color (r, g, b, a)
// uses drawElements
function drawPolygonTriangles1(gl, n, rad, c_x, c_y, r, g, b, a) {
    var vert = []; // vertex array
    var ind = []; // index array
    // angle (in radians) between sides
    var angle = (2 * Math.PI) / n; 
    // create triangles
    for (var i = 0; i < n; i++) {
        // calculate the vertex locations
        var x1 = (rad * Math.cos(angle * i)) + c_x;
        var y1 = (rad * Math.sin(angle * i)) + c_y;
        var x2 = (rad * Math.cos(angle * (i + 1))) + c_x;
        var y2 = (rad * Math.sin(angle * (i + 1))) + c_y;
        // calculate the per-surface color (all vertices on the same surface have the same color for Assignment 3)
        // for assignment 3, you will need to calculate surface normals.
        // in this example, we will shade based on position (namely, the average of the corners of the triangle)
        var col = shadeRightwards((c_x + x1 + x2)/2, (c_y + y1 + y2)/3, r, g, b, a);
        // center vertex
        vert.push(c_x); 
        vert.push(c_y); 
        vert.push(0);
        vert.push(col[0]);
        vert.push(col[1]);
        vert.push(col[2]);
        vert.push(col[3]);
        // first outer vertex
        vert.push(x1);
        vert.push(y1);
        vert.push(0);
        vert.push(col[0]);
        vert.push(col[1]);
        vert.push(col[2]);
        vert.push(col[3]);
        // second outer vertex
        vert.push(x2);
        vert.push(y2);
        vert.push(0);
        vert.push(col[0]);
        vert.push(col[1]);
        vert.push(col[2]);
        vert.push(col[3]);
        // connect vertices
        ind.push(i * 3); // start at center
        ind.push((i * 3) + 1); // go to first outer vertex
        ind.push((i * 3) + 2); // go to second outer vertex
    }
    // set buffers
    setVertexBuffer(gl, new Float32Array(vert));
    setIndexBuffer(gl, new Uint16Array(ind));
    // draw polygon
    gl.drawElements(gl.TRIANGLES, ind.length, gl.UNSIGNED_SHORT, 0);    
}

// draws an n-sided polygon with filled triangles with radius r centered at (c_x, c_y) with color (r, g, b, a)
// uses drawArrays (functionally same as drawElements)
function drawPolygonTriangles2(gl, n, rad, c_x, c_y, r, g, b, a) {
    var vert = []; // vertex array
    // angle (in radians) between sides
    var angle = (2 * Math.PI) / n; 
    // create triangles
    for (var i = 0; i < n; i++) {
                // calculate the vertex locations
        var x1 = (rad * Math.cos(angle * i)) + c_x;
        var y1 = (rad * Math.sin(angle * i)) + c_y;
        var x2 = (rad * Math.cos(angle * (i + 1))) + c_x;
        var y2 = (rad * Math.sin(angle * (i + 1))) + c_y;
        // calculate the per-surface color (all vertices on the same surface have the same color for Assignment 3)
        // for assignment 3, you will need to calculate surface normals.
        // in this example, we will shade based on position (namely, the average of the corners of the triangle)
        var col = shadeRightwards((c_x + x1 + x2)/2, (c_y + y1 + y2)/3, r, g, b, a);
        // center vertex
        vert.push(c_x); 
        vert.push(c_y); 
        vert.push(0);
        vert.push(col[0]);
        vert.push(col[1]);
        vert.push(col[2]);
        vert.push(col[3]);
        // first outer vertex
        vert.push(x1);
        vert.push(y1);
        vert.push(0);
        vert.push(col[0]);
        vert.push(col[1]);
        vert.push(col[2]);
        vert.push(col[3]);
        // second outer vertex
        vert.push(x2);
        vert.push(y2);
        vert.push(0);
        vert.push(col[0]);
        vert.push(col[1]);
        vert.push(col[2]);
        vert.push(col[3]);
    }
    // set buffers
    setVertexBuffer(gl, new Float32Array(vert));
    // draw polygon
    gl.drawArrays(gl.TRIANGLES, 0, vert.length/7);    
}

// example shading algorithm: make slightly darker the farther right you go
//   takes in as arguments the location of the point and the original color
//   returns a javascript array of size 4 with new rgba components
function shadeRightwards(x, y, r, g, b, a) {
    var col = [r, g, b, a]; // shaded color
    var ratio = (1 - ((x + 1) / 2)); // measure of how far right (normalized)
    for (j = 0; j < 3; j++)
        col[j] = col[j] * ratio;
    return col;
}
