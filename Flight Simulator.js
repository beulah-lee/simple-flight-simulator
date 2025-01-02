var gl;     // The WebGL context
var canvas; // The HTML5 Canvas
var shaderProgram; //The GLSL shader program 

var myTerrain;

var modelViewMatrix = glMatrix.mat4.create();
var projectionMatrix = glMatrix.mat4.create();
var normalMatrix = glMatrix.mat3.create();

// Material material color/intensity for Phong reflection
var kAmbient = [227/255, 191/255, 76/255];
var kDiffuse = [227/255, 191/255, 76/255];
var kSpecular = [227/255, 191/255, 76/255];
var shininess = 2;

// Light parameters
var lightPosition = [0, 2, 2]; // Light position in view coordinates
var ambientLightColor = [0.1, 0.1, 0.1];
var diffuseLightColor = [1, 1, 1];
var specularLightColor = [1, 1, 1];

var kEdgeBlack = [0.0, 0.0, 0.0]; // Edge color for black wireframe
var kEdgeWhite = [0.7, 0.7, 0.7]; // Edge color for white wireframe

//Camera Orientation
var camPosition = glMatrix.vec3.create();        // Camera's current position
var camOrientation = glMatrix.quat.create();     // Camera's current orientation
var camInitialDir = glMatrix.vec3.create();      // Camera's initial view direction  
var camSpeed = 0.0005;                           // Camera's current speed in the forward direction
var initcamSpeed = 0.0005;

glMatrix.vec3.set(camPosition, 0, -1.5, 0.5);
glMatrix.vec3.set(camInitialDir, 0, 3, -1);

var keys = {};

function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

/////////////// SET UP //////////////////////////
function startup() {
  canvas = document.getElementById("glCanvas");
  gl = createGLContext(canvas);

  document.onkeydown = keyDown;
  document.onkeyup = keyUp;

  setupShaders();

  myTerrain = new Terrain(16, -1, 1, -1, 1);
  myTerrain.setupBuffers(shaderProgram);

  // Set the background color to sky blue
  gl.clearColor(0.82, 0.93, 0.99, 1.0);

  gl.enable(gl.DEPTH_TEST);
  requestAnimationFrame(animate);
}

function createGLContext(canvas) {
  var context = null;
  context = canvas.getContext("webgl2");
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
    
  if (!shaderScript) {
    return null;
  }
    
  var shaderSource = shaderScript.text;
  
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
  
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader; 
}

function setupShaders() {
  // Compile the shaders' source code
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  // Link the shaders together into a program
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.locations = {};
  shaderProgram.locations.vertexPosition =
    gl.getAttribLocation(shaderProgram, "vertexPosition");
  shaderProgram.locations.vertexNormal =
    gl.getAttribLocation(shaderProgram, "vertexNormal");

  shaderProgram.locations.modelViewMatrix =
    gl.getUniformLocation(shaderProgram, "modelViewMatrix");
  shaderProgram.locations.projectionMatrix =
    gl.getUniformLocation(shaderProgram, "projectionMatrix");
  shaderProgram.locations.normalMatrix =
    gl.getUniformLocation(shaderProgram, "normalMatrix");

  shaderProgram.locations.kAmbient =
    gl.getUniformLocation(shaderProgram, "kAmbient");
  shaderProgram.locations.kDiffuse =
    gl.getUniformLocation(shaderProgram, "kDiffuse");
  shaderProgram.locations.kSpecular =
    gl.getUniformLocation(shaderProgram, "kSpecular");
  shaderProgram.locations.shininess =
    gl.getUniformLocation(shaderProgram, "shininess");
  
  shaderProgram.locations.lightPosition =
    gl.getUniformLocation(shaderProgram, "lightPosition");
  shaderProgram.locations.ambientLightColor =
    gl.getUniformLocation(shaderProgram, "ambientLightColor");
  shaderProgram.locations.diffuseLightColor =
  gl.getUniformLocation(shaderProgram, "diffuseLightColor");
  shaderProgram.locations.specularLightColor =
  gl.getUniformLocation(shaderProgram, "specularLightColor");

  shaderProgram.locations.minZ =
    gl.getUniformLocation(shaderProgram, "minZ");
  shaderProgram.locations.maxZ =
    gl.getUniformLocation(shaderProgram, "maxZ");

  shaderProgram.locations.fog =
    gl.getUniformLocation(shaderProgram, "fog");
}

/////////////// RENDER TERRAIN //////////////////////////
function draw() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Generate the projection matrix using perspective projection
  const near = 0.1;
  const far = 200.0;
  glMatrix.mat4.perspective(projectionMatrix, degToRad(45), 
                            gl.viewportWidth / gl.viewportHeight,
                            near, far);
  
  positionChanges();
  updateView();

  setMatrixUniforms();

  setLightUniforms(ambientLightColor, diffuseLightColor, specularLightColor,
                   lightPosition);
  
  // Draw the triangles and/or the wireframe based on the render selection
  if (document.getElementById("polygon").checked) { 
    var minZ = myTerrain.getMinElevation();
    var maxZ = myTerrain.getMaxElevation();
    gl.uniform1f(shaderProgram.locations.minZ, minZ);
    gl.uniform1f(shaderProgram.locations.maxZ, maxZ);
    if(document.getElementById("fog").checked == true){
      gl.uniform1i(shaderProgram.locations.fog, true);    
    }
    else{
      gl.uniform1i(shaderProgram.locations.fog, false);
    }
    setMaterialUniforms(kAmbient, kDiffuse, kSpecular, shininess);
    myTerrain.drawTriangles();
  }
  else if (document.getElementById("wirepoly").checked) {
    var minZ = myTerrain.getMinElevation();
    var maxZ = myTerrain.getMaxElevation();
    gl.uniform1f(shaderProgram.locations.minZ, minZ);
    gl.uniform1f(shaderProgram.locations.maxZ, maxZ);
    if(document.getElementById("fog").checked == true){
      gl.uniform1i(shaderProgram.locations.fog, 1);    
    }
    else{
      gl.uniform1i(shaderProgram.locations.fog, 0);
    }
    setMaterialUniforms(kAmbient, kDiffuse, kSpecular, shininess); 
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1, 1);
    myTerrain.drawTriangles();
    gl.disable(gl.POLYGON_OFFSET_FILL);
    setMaterialUniforms(kEdgeBlack, kEdgeBlack, kEdgeBlack, shininess);
    myTerrain.drawEdges();
  }
  else if (document.getElementById("wireframe").checked) {
    setMaterialUniforms(kEdgeBlack, kEdgeBlack, kEdgeBlack, shininess);
    myTerrain.drawEdges();
  }
}

function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.locations.modelViewMatrix, false,
                      modelViewMatrix);
  gl.uniformMatrix4fv(shaderProgram.locations.projectionMatrix, false,
                      projectionMatrix);

  // Transform the normals by the inverse-transpose of the Model/View matrix
  glMatrix.mat3.fromMat4(normalMatrix,modelViewMatrix);
  glMatrix.mat3.transpose(normalMatrix,normalMatrix);
  glMatrix.mat3.invert(normalMatrix,normalMatrix);

  gl.uniformMatrix3fv(shaderProgram.locations.normalMatrix, false,
                      normalMatrix);
}

function setMaterialUniforms(a, d, s, alpha) {
  gl.uniform3fv(shaderProgram.locations.kAmbient, a);
  gl.uniform3fv(shaderProgram.locations.kDiffuse, d);
  gl.uniform3fv(shaderProgram.locations.kSpecular, s);
  gl.uniform1f(shaderProgram.locations.shininess, alpha);
}

function setLightUniforms(a, d, s, loc) {
  gl.uniform3fv(shaderProgram.locations.ambientLightColor, a);
  gl.uniform3fv(shaderProgram.locations.diffuseLightColor, d);
  gl.uniform3fv(shaderProgram.locations.specularLightColor, s);
  gl.uniform3fv(shaderProgram.locations.lightPosition, loc);
}

/////////////// ANIMATION FOR GEOMETRY VIEW //////////////////////////
 function animate(currentTime) {

  var eulerX = 0;   // associate pitch as rotation around X
  var eulerY = 0;   // yaw
  var eulerZ = 0;   // associate roll as rotation around Z

  if (keys["="]) {    // increase the airplane’s speed
    camSpeed += 0.0005;
  }
  if (keys["-"]) {    // decrease the airplane’s speed
    camSpeed -= 0.0005;
  }
  if (keys["ArrowLeft"]) {    // left key makes the plane roll to its left
    eulerZ -= 0.1;
  }
  if (keys["ArrowRight"]) {    // right key makes the plane roll to its right
    eulerZ += 0.1;
  }
  if (keys["ArrowUp"]) {    // up key cause the airplane to pitch up
    eulerX += 0.1;
  }
  if (keys["ArrowDown"]) {    // down key cause the airplane to pitch down
    eulerX -= 0.1;
  }
  if (keys["a"]) {          // a key causes the plane to yaw up
    eulerY += 1;
  }
  if (keys["d"]) {        // d key causes the plane to yaw down
    eulerY -= 1;
  }  
  if (keys["Escape"]) {    // reset the current view to the initial viewpoint and direction
    glMatrix.vec3.set(camPosition, 0, -1.5, 0.5);
    glMatrix.vec3.set(camInitialDir, 0, 3, -1);
    camSpeed = initcamSpeed;
    
  }
  var orientationDelta = glMatrix.quat.create();
  glMatrix.quat.fromEuler(orientationDelta, eulerX, eulerY, eulerZ);

  // Calculate the new camOrientation
  glMatrix.quat.multiply(camOrientation, camOrientation, orientationDelta);

  draw();
  requestAnimationFrame(animate);
}

function positionChanges(){
  // Find the current forward direction by transforming the camInitialDir by camOrientation
  var forwardDirection = glMatrix.vec3.create();
  glMatrix.vec3.transformQuat(forwardDirection, camInitialDir, camOrientation);
  
  // Set forwardDirection to unit length
  var nforwardDirection = glMatrix.vec3.create();
  glMatrix.vec3.normalize(nforwardDirection, forwardDirection);

  // Set deltaPosition to the forwardDirection scaled to a length of camSpeed
  var deltaPosition = glMatrix.vec3.create();
  glMatrix.vec3.scale(deltaPosition, forwardDirection, camSpeed);

  glMatrix.vec3.add(camPosition,camPosition,deltaPosition);
}

function updateView(){
  var eye = glMatrix.vec3.create();
  var center = glMatrix.vec3.create();
  var up = glMatrix.vec3.create();

  glMatrix.vec3.copy(eye, camPosition);

  var upinit = glMatrix.vec3.fromValues(0, 1, 0);
  glMatrix.vec3.transformQuat(up, upinit, camOrientation);

  // Transform camInitialDir by camOrientation to generate the current view direction
  var currView = glMatrix.vec3.create();
  glMatrix.vec3.transformQuat(currView, camInitialDir, camOrientation);
  glMatrix.vec3.normalize(currView, currView);

  // Compute center as the sum of camPosition and the current view direction
  glMatrix.vec3.add(center, camPosition, currView);

  glMatrix.mat4.lookAt(modelViewMatrix, eye, center, up);
}

/////////////// USER KEY CODE //////////////////////////
function keyDown(event){
  console.log("Key down ", event.key, " code ", event.code);
  if (event.key == "ArrowUp" || event.key == "ArrowDown" || event.key == "ArrowLeft" ||   event.key == "ArrowRight" || 
      event.key == "Escape" || event.key == "a" || event.key == "d" || event.key == "-" || event.key == "=") {
    event.preventDefault();
  }
  keys[event.key] = true;
}

function keyUp(event){
  console.log("Key up ", event.key, " code ", event.code);
  keys[event.key] = false;
}

