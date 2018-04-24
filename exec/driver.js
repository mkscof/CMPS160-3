// drawing a single quad (rectangular polygon) with two triangles

var FSIZE = (new Float32Array()).BYTES_PER_ELEMENT; // size of a vertex coordinate (32-bit float)
var VSHADER_SOURCE = null; // vertex shader program
var FSHADER_SOURCE = null; // fragment shader program

var g_points = []; // array of mouse presses

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
    // load shader files (calls 'setShader' when done loading)
    loadFile("shader.vert", function(shader_src) {
	setShader(gl, canvas, gl.VERTEX_SHADER, shader_src); });
    loadFile("shader.frag", function(shader_src) {
	setShader(gl, canvas, gl.FRAGMENT_SHADER, shader_src); });
}

// set appropriate shader and start if both are loaded
function setShader(gl, canvas, shader, shader_src) {
    if (shader == gl.VERTEX_SHADER)
	   VSHADER_SOURCE = shader_src;
    if (shader == gl.FRAGMENT_SHADER)
	   FSHADER_SOURCE = shader_src;
    if (VSHADER_SOURCE && FSHADER_SOURCE)
	   start(gl, canvas);
}

// called by 'setShader' when shaders are done loading
function start(gl, canvas) {
    // initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    	console.log('Failed to intialize shaders.');
    	return;
    }
    // initialize buffers/attributes/uniforms
    var success = initVertexBuffer(gl);
    success = success && initIndexBuffer(gl);
    success = success && initAttributes(gl);
    success = success && initUniforms(gl);
    // check success
    if (!success) {
    	console.log('Failed to initialize buffers.');
    	return;
    }
    // specify the color for clearing <canvas>
    gl.clearColor(0, 0, 0, 1);
    // clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Register function event handlers
    canvas.onmousedown = function(ev){ click(ev, gl, canvas); };
    window.onkeypress = function(ev){ keypress(ev, gl); };
    document.getElementById('update_screen').onclick = function(){ updateScreen(canvas, gl); };
    document.getElementById('save_canvas').onclick = function(){ saveCanvas(); };
    document.getElementById('reset_canvas').onclick = function(){ resetCanvas(canvas, gl); };
    // setup SOR object reading/writing
    setupIOSOR("fileinput"); 
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
    // assign buffer to a_Position and enable assignment
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    var a_PointSize = gl.getAttribLocation(gl.program, 'a_PointSize');
    if (a_Position < 0 || a_PointSize < 0) {
    	console.log("failed to get storage location of attribute");
    	return false;
    }
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 3, 0);
    gl.enableVertexAttribArray(a_Position);
    // gl.vertexAttribPointer(a_PointSize, 1, gl.FLOAT, false, FSIZE * 4, FSIZE * 3);
    // gl.enableVertexAttribArray(a_PointSize);
    return true;
}

// uniform variable locations: made global for easy access and modification
var u_Invert; // invert colors globally (int (used as bool))
var u_Flip;   // flip all vertices over specified 2D dir (within xy-plane z=0) (int (used as bool))
var u_FlipDir; // direction to flip points over origin (float vec2)

// initializes uniforms
function initUniforms(gl) {
    u_Invert = gl.getUniformLocation(gl.program, 'u_Invert');
    u_Flip = gl.getUniformLocation(gl.program, 'u_Flip');
    u_FlipDir = gl.getUniformLocation(gl.program, 'u_FlipDir');
    if (!u_Invert || !u_Flip) {
    	console.log("failed to get storage location of uniform");
    	return false;
    }
    // set default values
    gl.uniform1i(u_Invert, 0); // no invert
    gl.uniform1i(u_Flip, 0); // no flip 
    gl.uniform2f(u_FlipDir, 1, 1); // diagonal
    return true;
}

// Called when user presses a key
function keypress(ev, gl) {
    if (ev.which == "q".charCodeAt(0)) gl.uniform1i(u_Invert, 0); // Set invert variable to false
    if (ev.which == "w".charCodeAt(0)) gl.uniform1i(u_Invert, 1); // Set invert variable to true
    if (ev.which == "a".charCodeAt(0)) gl.uniform1i(u_Flip, 0); // Set flip variable to false
    if (ev.which == "s".charCodeAt(0)) gl.uniform1i(u_Flip, 1); // Set flip variable to true
    // Clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Draw polyline
    drawPolyline(gl);
    drawCylinder(gl);
}

// Called when user clicks on canvas
function click(ev, gl, canvas) {
    var x = ev.clientX; // x coordinate of a mouse pointer
    var y = ev.clientY; // y coordinate of a mouse pointer
    var rect = ev.target.getBoundingClientRect();
    x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
    y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
    // Store the vertex information to g_points array
    g_points.push(x); // x-coordinate
    g_points.push(y); // y-coordinate
    g_points.push(0); // z-coordinate is 0; polyline lines in xy-plane z=0
    //g_points.push(g_points.length); // point size; make size increase with number of points
    
    // Clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Draw polyline
    drawPolyline(gl);
    
    // If user right clicks, finish polyline and draw cylinder
    if (ev.button == 2) {
    	// Clear canvas
    	gl.clear(gl.COLOR_BUFFER_BIT);
    	/* PUT CODE TO GENERATE VERTICES/INDICES OF CYLINDER AND DRAW HERE */
    	drawCylinder(gl);
        //drawRectangles(gl); // EXAMPLE: Generates rectangles whose corners are connected
    	// drawPolyline(gl); // EXAMPLE: Draw polyline
    	// Remove click handle	
    	// canvas.onmousedown = null; 
    }
}

// Draws the polyline based on clicked points
function drawPolyline(gl) {
    // Set vertices
    setVertexBuffer(gl, new Float32Array(g_points));
    var n = Math.floor(g_points.length/3);
    // Set indices (just an array of the numbers 0 to (n-1), which connects them one by one)
    var ind = [];
    for (i = 0; i < n; ++i)
	ind.push(i);
    setIndexBuffer(gl, new Uint16Array(ind));
    // Draw points and lines
    //gl.drawElements(gl.POINTS, n, gl.UNSIGNED_SHORT, 0);
    gl.drawElements(gl.LINE_STRIP, n, gl.UNSIGNED_SHORT, 0);
}

//Draws cylinders from clicked points
function drawCylinder(gl){
    var n = Math.floor((g_points.length / 3)) - 1;
    var vert = [];
    var ind = [];
    var inc1 =1;
    var inc2 =37;
    //More than one click made
    if(n > 1){
        for(i = 0; i < n; i++){
            var polygon = drawRotatedPolygonWireframe(gl, vert, ind, .2, g_points[i*3], g_points[(i*3)+1], 30);
            var pVert = polygon[0];
            //var iVert = polygon[1];
            for(p = 0; p < pVert.length; p++){
                vert.push(pVert[p]);
            }
           //  console.log(vert.length);
           //  console.log(JSON.stringify(vert));
           //  console.log(JSON.stringify(ind));
           // console.log(n);
           if(i>0){
                //7 lines per face on the cylinder
                for(y = 0; y < 12; y++){
                    if(y < 11){
                        ind.push(inc1+(y*3));
                        ind.push(inc2+(y*3));
                        ind.push(inc1+(y*3)+1);
                       /*ind.push(inc2+(y*3)+1); //if you wanted to make x"s not sure
                        ind.push(inc1+(y*3));
                        ind.push(inc1+(y*3)+1);*/
                    }
                    else{
                        ind.push(inc1+(y*3));
                        ind.push(inc2+(y*3));
                        ind.push(inc1);
                       /* ind.push(inc2); //if you wanted to make x's not sure
                        ind.push(inc1+(y*3));
                        ind.push(inc1);*/
                        
                    }
                }
                inc1=inc2;
                inc2+=36;
            }
        }
        console.log(ind.length);
    }

    setVertexBuffer(gl, new Float32Array(vert));
    var len = ind.length;
    // Set indices
    setIndexBuffer(gl, new Uint16Array(ind));
    // Draw rectangle
    gl.drawElements(gl.LINE_STRIP, len, gl.UNSIGNED_SHORT, 0);
    // Reset vertices and indices
    var vert = [];
    var ind = [];
}

// draws an n-sided polygon wireframe with radius r centered at (c_x, c_y)
// polygon starts within xy-plane, and is rotated along y axis rot degrees
// Taken from hints in example code
function drawRotatedPolygonWireframe(gl, vert, ind, rad, c_x, c_y, rot) {
    var vert = []; // vertex array
    var ind = []; // index array
    // angle (in radians) between sides
    var angle = (2 * Math.PI) / 12;
    // angle of rotation in radians
    rot = (rot/180) * Math.PI;
    // create triangles
    for (var i = 0; i < 12; i++) {
        // calculate the vertex locations
        var x1 = (Math.cos(rot) * (rad * Math.cos(angle * i))) + c_x;
        var y1 = (rad * Math.sin(angle * i)) + c_y;
        var z1 = (Math.sin(rot) * (rad * Math.sin(angle * i)));
        var j = i + 1;
        var x2 = (Math.cos(rot) * (rad * Math.cos(angle * j))) + c_x;
        var y2 = (rad * Math.sin(angle * j)) + c_y;
        var z2 = (Math.sin(rot) * (rad * Math.sin(angle * j)));
        // center vertex
        vert.push(c_x); 
        vert.push(c_y); 
        vert.push(0);
        // first outer vertex
        vert.push(x1);
        vert.push(y1);
        vert.push(z1);
        // second outer vertex
        vert.push(x2);
        vert.push(y2);
        vert.push(z2);
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

    return [vert, ind];
}
//Gets axis of rotation
// function getAxis(gl, x1, y1, z1, x2, y2, z2){
//     var yFinal = -1.0 / (y2 - y1);
//     var xFinal = -1.0 / (x2 - x1);
//     var vector = [];

//     //Push origin
//     vector.push(x1);
//     vector.push(y1);
//     vector.push(0.0);
//     //Push perpendicular coordinates
//     vector.push(xFinal);
//     vector.push(yFinal);
//     vector.push(0.0);

//     //vector.normalize();

//     return vector;
// }

// // Draws connected rectangles between clicked points
//     var n = g_points.length - 1; // Number of rectangles
//     var vert = [];
//     var ind = [];
//     // Draw each individual rectangle separately
//     /* NOTE: You can also draw them all at once (single call to 'drawElements') if you want */
//     for (i = 0; i < n; ++i) {
//     	// First corner of rectangle
//     	vert.push(g_points[i*4]); // x coord
//     	vert.push(g_points[i*4 + 1]); // y coord
//     	vert.push(0); // z coord
//     	vert.push(1); // Point size
//     	ind.push(0);
//     	// Second corner of rectangle
//     	vert.push(g_points[i*4]);
//     	vert.push(g_points[(i+1)*4 + 1]);
//     	vert.push(0);
//     	vert.push(1);
//     	ind.push(1);
//     	// Third corner of rectangle
//     	vert.push(g_points[(i+1)*4]);
//     	vert.push(g_points[(i+1)*4 + 1]);
//     	vert.push(0);
//     	vert.push(1);
//     	ind.push(2);
//     	// Fourth corner of rectangle
//     	vert.push(g_points[(i+1)*4]);
//     	vert.push(g_points[i*4 + 1]);
//     	vert.push(0);
//     	vert.push(1);
//     	ind.push(3);
//     	// Connect First corner again to wrap lines around
//     	ind.push(0);
//     	// Set vertices
//     	setVertexBuffer(gl, new Float32Array(vert));
//     	var n = ind.length;
//     	// Set indices
//     	setIndexBuffer(gl, new Uint16Array(ind));
//      	// Draw rectangle
//     	gl.drawElements(gl.LINE_STRIP, n, gl.UNSIGNED_SHORT, 0);
//     	// Reset vertices and indices
//     	vert = [];
//     	ind = [];
//     }
// }

// loads SOR file and draws object
function updateScreen(canvas, gl) {
    canvas.onmousedown = null; // disable mouse
    var sor = readFile();      // get SOR from file
    setVertexBuffer(gl, new Float32Array(sor.vertices));
    setIndexBuffer(gl, new Uint16Array(sor.indexes));
    // clear canvas    
    gl.clear(gl.COLOR_BUFFER_BIT); 
    // draw model
    gl.drawElements(gl.POINTS, sor.indexes.length, gl.UNSIGNED_SHORT, 0);
    gl.drawElements(gl.LINE_STRIP, sor.indexes.length, gl.UNSIGNED_SHORT, 0);
}

// saves polyline displayed on canvas to file
function saveCanvas() {
    var sor = new SOR();
    sor.objName = "model";
    sor.vertices = g_points;
    sor.indexes = [];
    for (i = 0; i < g_points.length/3; i++)
	sor.indexes.push(i);
    console.log(sor.indexes);
    saveFile(sor);
}

// clears canvas and allows for drawing new cylinders
function resetCanvas(canvas, gl) {
    canvas.onmousedown = function(ev){ click(ev, gl, canvas); };
    g_points = [];
    gl.clear(gl.COLOR_BUFFER_BIT);
}
