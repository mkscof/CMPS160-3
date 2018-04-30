var FSIZE = (new Float32Array()).BYTES_PER_ELEMENT; // size of a vertex coordinate (32-bit float)
// Vertex shader program
var VSHADER_SOURCE = null;

var FSHADER_SOURCE = null; // fragment shader program

var g_points = []; // array of mouse presses
var done = 0;
var dN = 0; //controls if normals are drawn or not
//Light values
var lightx = 1;
var lighty = 1;
var lightz = 1;

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

    var nbutton = document.getElementById("normals");
    nbutton.onclick = function(ev){ drawNormals(ev, gl, canvas, g_points); };

    //Move points up and to the right
    // var moveButton = document.getElementById("move");
    // moveButton.onmousedown = function(ev){ move(ev, gl, canvas, a_Position); };
    // nbutton.onclick = function(ev){ drawNormals2(ev, gl, canvas, g_points); };
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
    gl.clearColor(.9, .9, .9, 1);
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
    var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
    if (a_Position < 0 || a_PointSize < 0 || a_Color < 0) {
    	console.log("failed to get storage location of attribute");
    	return false;
    }
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 7, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.vertexAttribPointer(a_Color, 4, gl.FLOAT, false, FSIZE * 7, FSIZE * 3);
    gl.enableVertexAttribArray(a_Color);
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
   // drawPolyline(gl);
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
    
    // Clear canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Draw polyline
    var len = g_points.length / 3;
    var newArr = new Float32Array(g_points);

    // Pass the position of a point to a_Position variable
    gl.bufferData(gl.ARRAY_BUFFER, newArr, gl.STATIC_DRAW);

    if(len > 3){
        // Draw
        gl.drawArrays(gl.POINTS, 0, len);
        gl.drawArrays(gl.LINE_STRIP, 0, len);
    }
    
    // If user right clicks, finish polyline and draw cylinder
    if (ev.button == 2) {
    	done = 1;
        // Clear canvas
    	gl.clear(gl.COLOR_BUFFER_BIT);
    	drawCylinder(gl, 0, 1, 0, 1);
    	// Remove click handle	
    	// canvas.onmousedown = null; 
    }
}

// function rubberband(ev, gl, canvas, a_Position){
//   if(done){
//       return;
//   }
//   var xPos = ev.clientX;
//   var yPos = ev.clientY;
//   var rect = ev.target.getBoundingClientRect();

//   xPos = ((xPos - rect.left) - canvas.width/2)/(canvas.width/2);
//   yPos = (canvas.height/2 - (yPos - rect.top))/(canvas.height/2);

//   // Clear <canvas>
//   gl.clear(gl.COLOR_BUFFER_BIT);

//   g_points.push(xPos);
//   g_points.push(yPos);
//   g_points.push(0);

//   var len = g_points.length / 3;
//   var newArr = new Float32Array(g_points);

//   // Pass the position of a point to a_Position variable
//   gl.bufferData(gl.ARRAY_BUFFER, newArr, gl.STATIC_DRAW);

//   //Draw
//   gl.vertexAttrib3f(a_Position, newArr[newArr.length - 3], newArr[newArr.length - 2], 0.0, 0.0);
//   // gl.drawArrays(gl.POINTS, 0, len);
//   gl.drawArrays(gl.LINE_STRIP, 0, len);

//   g_points.pop();
//   g_points.pop();
//   g_points.pop();
// }

// // Draws the polyline based on clicked points
// function drawPolyline(gl) {
//     // Set vertices
//     setVertexBuffer(gl, new Float32Array(g_points));
//     var n = Math.floor(g_points.length/3);
//     // Set indices (just an array of the numbers 0 to (n-1), which connects them one by one)
//     var ind = [];
//     for (i = 0; i < n; i++){
//        ind.push(i);
//     }
//     setIndexBuffer(gl, new Uint16Array(ind));
//     // Draw points and lines
//     // gl.drawElements(gl.POINTS, n, gl.UNSIGNED_SHORT, 0);
//     // gl.drawArrays(gl.LINE_STRIP, 0, n);
//     gl.drawElements(gl.LINE_STRIP, n, gl.UNSIGNED_SHORT, 0);  
// }

//Draws cylinders from clicked points
function drawCylinder(gl, r, g, b, a){
    var n = Math.floor((g_points.length / 3));
    var vert = [];
    var ind = [];
    var inc1 = 1;
    var inc2 = 37 ; //distance to next circle wireframe
    //More than one click made
    if(n > 1){
        for(i = 0; i < n; i++){
            var polygon = drawRotatedPolygonWireframe(gl, 12, .2, g_points[i*3], g_points[(i*3)+1], g_points[(i*3)+2], r, g, b, a);
            var pVert = polygon[0];
            //var iVert = polygon[1];
            for(p = 0; p < pVert.length; p++){
                vert.push(pVert[p]);
            }

           if(i > 0){
                // var col = shadeRightwards((c_x + x1 + x2)/2, (c_y + y1 + y2)/3, r, g, b, a);
                //7 lines per face on the cylinder
                for(y = 0; y < 12; y++){
                    if(y < 11){
                        ind.push(inc1+(y*3));
                        ind.push(inc2+(y*3));
                        ind.push(inc1+(y*3)+1);
                        ind.push(inc2+(y*3)+1);
                        ind.push(inc2+(y*3));
                        ind.push(inc1+(y*3)+1);
                       /*ind.push(inc2+(y*3)+1); //to make x's
                        ind.push(inc1+(y*3));
                        ind.push(inc1+(y*3)+1);*/
                    }
                    else{
                        ind.push(inc1+(y*3));
                        ind.push(inc2+(y*3));
                        ind.push(inc1);
                        ind.push(inc2);
                        ind.push(inc2+(y*3));
                        ind.push(inc1);
                       /* ind.push(inc2); //to make x's
                        ind.push(inc1+(y*3));
                        ind.push(inc1);*/
                        
                    }
                }
                inc1 = inc2
                inc2 += 36;
            }
        }
    }

    setVertexBuffer(gl, new Float32Array(vert));
    var len = ind.length;
    // Set indices
    setIndexBuffer(gl, new Uint16Array(ind));
    // Draw
    gl.drawElements(gl.TRIANGLES, ind.length, gl.UNSIGNED_SHORT, 0);
   // gl.drawElements(gl.LINE_STRIP, len, gl.UNSIGNED_SHORT, 0);
    // Reset vertices and indices
    var vert = [];
    var ind = [];
}

// draws an n-sided polygon wireframe with radius r centered at (c_x, c_y)
// polygon starts within xy-plane, and is rotated along y axis rot degrees
// Taken from hints in example code
function drawRotatedPolygonWireframe(gl, n, rad, c_x, c_y, c_z, r, g, b, a) {
    var vert = []; // vertex array
    var ind = []; // index array
    var rot = 30;
    // angle (in radians) between sides
    var angle = (2 * Math.PI) / n;
    // angle of rotation in radians
    rot = (rot/180) * Math.PI;
    // create triangles
    for (var i = 0; i < n; i++) {
        // calculate the vertex locations at the origin
        var x1 = (Math.cos(rot) * (rad * Math.cos(angle * i)));
        var y1 = (rad * Math.sin(angle * i));
        var z1 = (Math.sin(rot) * (rad * Math.sin(angle * i)));
        var j = i + 1;
        var x2 = (Math.cos(rot) * (rad * Math.cos(angle * j)));
        var y2 = (rad * Math.sin(angle * j));
        var z2 = (Math.sin(rot) * (rad * Math.sin(angle * j)));

        //Rotate around y-axis
        var rotY = Math.PI;;
        x1 = x1*(Math.cos(rotY * rot)) - z1*(Math.sin(rotY * rot));
        z1 = x1*(Math.sin(rotY * rot)) + z1*(Math.cos(rotY * rot));
        x2 = x2*(Math.cos(rotY * rot)) - z2*(Math.sin(rotY * rot));
        z2 = x2*(Math.sin(rotY * rot)) + z2*(Math.cos(rotY * rot));

        //Rotate around z-axis
        // var rotZ =  Math.PI;;
        // x1 = x1*(Math.cos(rotZ * rot)) + y1*(Math.sin(rotZ * rot));
        // y1 = -x1*(Math.sin(rotZ * rot)) + y1*(Math.cos(rotZ * rot));
        // x2 = x2*(Math.cos(rotZ * rot)) + y2*(Math.sin(rotZ * rot));
        // y2 = -x2*(Math.sin(rotZ * rot)) + y2*(Math.cos(rotZ * rot));

        //Translate to clicked point
        x1 += c_x;
        y1 += c_y;
        x2 += c_x;
        y2 += c_y;
        z1 += c_z;
        z2 += c_z;

        // Calculate normal
        // Two vectors for cross product
        var vect1 = [x1, y1, z1];
        var mag1 = Math.sqrt((x1*x1)+(y1*y1)+(z1*z1));
        var vect2 = [x2, y2, z2];
        var mag2 = Math.sqrt((x2*x2)+(y2*y2)+(z2*z2));
        //Calculate center point
        var center = [(2/3)*(((x1 + x2)/2) + c_x), (2/3)*(((y1 + y2)/2) + c_y), (2/3)*(((z1 + z2)/2) + c_z)];
        var magc = Math.sqrt((center[0]*center[0])+(center[1]*center[1])+(center[2]*center[2]))

        //Normalize
        for(k = 0; k < 3; k++){
            vect1[k] = vect1[k]/mag1;
            vect2[k] = vect2[k]/mag2;
            //center[k] = center[k]/magc;
        }

        var norm = cross(vect1, vect2);
        //Aesthetics
        // var crossed = [(crossed[0] * .1), (crossed[1] * .1), (crossed[2] * .1)];

        for(j = 0; j < 3; j++){
            norm[j] -= center[j];

        }
       // console.log(norm);

        //Shade based on position, need to change to based on normal
        var col = lightCalc(norm[0], norm[1], norm[2]);
        console.log("lightC");
        console.log(col);
        var col = shadeRightwards((c_x + x1 + x2)/2, (c_y + y1 + y2)/3, r, g, b, a);
        console.log("shadeR");
        console.log(col);
        
        // center vertex
        vert.push(c_x); 
        vert.push(c_y); 
        vert.push(c_z);
        vert.push(col[0]);
        vert.push(col[1]);
        vert.push(col[2]);
        vert.push(col[3]);
        // first outer vertex
        vert.push(x1);
        vert.push(y1);
        vert.push(z1);
        vert.push(col[0]);
        vert.push(col[1]);
        vert.push(col[2]);
        vert.push(col[3]);
        // second outer vertex
        vert.push(x2);
        vert.push(y2);
        vert.push(z2);
        vert.push(col[0]);
        vert.push(col[1]);
        vert.push(col[2]);
        vert.push(col[3]);
        //

        // connect vertices
        ind.push(i * 3); // start at center
        ind.push((i * 3) + 1); // go to first outer vertex
        ind.push((i * 3) + 2); // go to second outer vertex
        //ind.push(i * 3); // go back to center
    }
    // set buffers
    setVertexBuffer(gl, new Float32Array(vert));
    setIndexBuffer(gl, new Uint16Array(ind));
    // draw polygon
    gl.drawElements(gl.TRIANGLES, vert.length/7, gl.UNSIGNED_SHORT, 0);
    //gl.drawElements(gl.LINE_STRIP, ind.length, gl.UNSIGNED_SHORT, 0);

    return [vert, ind];
}

function shadeRightwards(x, y, r, g, b, a) {
    var col = [r, g, b, a]; // shaded color
    var ratio = (1 - ((x + 1) / 2)); // measure of how far right (normalized)
    for (j = 0; j < 3; j++)
        col[j] = col[j] * ratio;
    return col;
}

function lightCalc(nx, ny, nz){
    //Ld = kd I max(0, n • V)
    //col = I
    //Global white light variables
    var white = [lightx, lighty, lightz, 1];
    //kd = kd --> green
    var kd = [0, 1, 0];
    //mult = col * kd
    white[0] = white[0]*kd[0];
    white[1] = white[1]*kd[1];
    white[2] = white[2]*kd[2];
    //dot = n • V
    var dot = (1*nx)+(1*ny)+(1*nz);
    // console.log(dot);
    for(i = 0; i < 3; i++){
        white[i] = white[i] * dot;
        if(white[i] < 0){
            white[i] = 0;
        }
        if(white[i] > 1){
            white[i] = 1;
        }
    }
    return white;
}

// //Gets axis of rotation
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

function drawNormals(ev, gl, canvas){
    var n = g_points.length / 3;
    var crossed = []

    for(i = 0; i < n; i++){
        var vect1 = new Vector3([g_points[i+6]-g_points[i+3], g_points[i+7]-g_points[i+1], g_points[i+6]-g_points[i+2]]);
        var vect2 = new Vector3([g_points[i+5]-g_points[i+2], g_points[i+4]-g_points[i+1], g_points[i+3]-g_points[i+2]]);
        vect1.normalize();
        vect2.normalize();

        var crossed = cross(vect1, vect2);
        var crossed = [(crossed[0] * .1), (crossed[1] * .1), (crossed[2] * .1)];
        var center = [(g_points[i] + g_points[i+3] + g_points[i+6])/3, (g_points[i+1] + g_points[i+4] + g_points[i+7])/3, 0]
        var normal = [];

        normal.push(center[0]);
        normal.push(center[1]);
        normal.push(center[2]);
        normal.push(crossed[0]);
        normal.push(crossed[1]);
        normal.push(crossed[2]);
    }
    setVertexBuffer(gl, new Float32Array(normal));
    if(dN == 0){
        gl.drawArrays(gl.LINE_STRIP, 0, normal.length);
        dN = 1;
    }
    else{
        dN = 0;
    }
}

function cross(vect1, vect2){
    var crossX = (vect1[1]*vect2[2]) - (vect1[2]*vect2[1]);
    var crossY = -1 * ((vect1[0]*vect2[2]) - (vect1[2]*vect2[0]));
    var crossZ = (vect1[0]*vect2[1]) - (vect1[1]*vect2[0]);

    var crossed = [crossX, crossY, crossZ];
    return crossed;
}

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
