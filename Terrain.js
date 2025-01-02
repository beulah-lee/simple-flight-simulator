class Terrain {   
    constructor(div, minX, maxX, minY, maxY) {
        this.div = div;
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
        
        this.positionData = [];
        this.normalData = [];
        this.faceData = [];
        this.edgeData = [];
        console.log("Terrain: Allocated buffers");
        
        this.generateTriangles();
        console.log("Terrain: Generated triangles");
        
        this.generateLines();
        console.log("Terrain: Generated lines");

        this.shapeTerrain();
        console.log("Terrain: Sculpted terrain");

        this.calculateNormals();
        console.log("Terrain: Generated normals");
    }
    
    setVertex(v, i) {
        this.positionData[i*3]=v[0];
        this.positionData[i*3 + 1]=v[1];
        this.positionData[i*3 + 2]=v[2];
    }
    
    getVertex(v, i) {
        v[0]=this.positionData[i*3];
        v[1]=this.positionData[i*3 + 1];
        v[2]=this.positionData[i*3 + 2];
    }

    generateTriangles() {
        var deltaX=(this.maxX-this.minX)/this.div;
        var deltaY=(this.maxY-this.minY)/this.div;
        
        for(var i=0;i<=this.div;i++){
           for(var j=0;j<=this.div;j++){ 
               this.positionData.push(this.minX+deltaX*j);
               this.positionData.push(this.minY+deltaY*i);
               this.positionData.push(0);
           }
        }
    
        for(var i=0;i<this.div;i++){
            for(var j=0;j<this.div;j++){ 
                var coordin = i*(this.div+1)+j;

                // Triangle 1
                this.faceData.push(coordin);
                this.faceData.push(coordin+1);
                this.faceData.push(coordin+(this.div+1));
                // Triangle 2
                this.faceData.push(coordin+1);
                this.faceData.push(coordin+(this.div+2));
                this.faceData.push(coordin+(this.div+1));
            }
         }
    
        this.numVertices = this.positionData.length/3;
        this.numFaces = this.faceData.length/3;
    
    }

    shapeTerrain() {
    var delta = 0.01;
    var H = 0.001;
        for(var i=0; i<2000; i++){
            var p = glMatrix.vec3.create();
            glMatrix.vec3.set(p, Math.random()*(this.maxX-this.minX), Math.random()*(this.maxX-this.minX), 0);
            var n = glMatrix.vec3.create();
            glMatrix.vec3.random(n);
            n[2] = 0;

            // Raise and Lower Vertices
            for(var j=0; j<this.numVertices; j++){ 
                var b = glMatrix.vec3.create();
                this.getVertex(b, j);

                // (b-p)*n
                var bp = glMatrix.vec3.create();
                glMatrix.vec3.subtract(bp, b, p);
                
                if(glMatrix.vec3.dot(bp, n) < 0){  
                    b[2] -= delta; 
                }
                else{
                    b[2] += delta; 
                }

                this.setVertex(b,j);  
            }
            delta = delta/Math.pow(2,H);
        }

    }

    calculateNormals() {
        var NArray = [];
        for(var i=0; i<this.numVertices; i++){
            NArray.push(0);
            NArray.push(0);
            NArray.push(0);
        } 
       
        // Iterate over all triangles T=[v1,v2,v3] with vi in CCW order
        for(var i=0; i<this.numFaces; i++){ 
            var vect = [];
            for(var j=0; j<3; j++){
                var vert = glMatrix.vec3.create();
                this.getVertex(vert, this.faceData[3*i+j]);
                vect.push(vert);
            }

            var cross1 = glMatrix.vec3.create();
            var cross2 = glMatrix.vec3.create();
            var norm = glMatrix.vec3.create();

            // Compute normal N for T using N = (v2-v1)X(v3-v1) 
            glMatrix.vec3.subtract(cross1, vect[1], vect[0]);
            glMatrix.vec3.subtract(cross2, vect[2], vect[0]);
            glMatrix.vec3.cross(norm, cross1, cross2);

            // NArray[v1]=(Narray[v1]+N)
            NArray[3*this.faceData[3*i]] += norm[0];
            NArray[3*this.faceData[3*i]+1] += norm[1];
            NArray[3*this.faceData[3*i]+2] += norm[2];  

            NArray[3*this.faceData[3*i+1]] += norm[0];
            NArray[3*this.faceData[3*i+1]+1] += norm[1];
            NArray[3*this.faceData[3*i+1]+2] += norm[2];  
            
            NArray[3*this.faceData[3*i+2]] += norm[0];
            NArray[3*this.faceData[3*i+2]+1] += norm[1];
            NArray[3*this.faceData[3*i+2]+2] += norm[2];  
        }

        // Normalize each normal in Narray to unit length
        for (var i=0; i<this.numVertices; i++) {
            var narrayTemp = glMatrix.vec3.fromValues(NArray[3*i], NArray[3*i+1], NArray[3*i+2]);
            var normalized = glMatrix.vec3.create();
            glMatrix.vec3.normalize(normalized, narrayTemp);
            this.normalData[3*i] = normalized[0];
            this.normalData[3*i+1] = normalized[1];
            this.normalData[3*i+2] = normalized[2];
        }

    }

    getMinElevation(){
        var minZ = 0;
        for(var i = 0; i<this.numVertices; i++){
            var arr = [0, 0, 0];
            this.getVertex(arr, i);
            if(arr[2] < minZ){
                minZ = arr[2];
            }
        }
        return minZ;
    }

    getMaxElevation(){
        var maxZ = 0;
        for(var i = 0; i<this.numVertices; i++){
            var arr = [0, 0, 0];
            this.getVertex(arr, i);
            if(arr[2] > maxZ){
                maxZ = arr[2];
            }
        }
        return maxZ;
    }

    generateLines() {
        for (var f = 0; f < this.faceData.length/3; f++) {
            var fid = f*3;
            this.edgeData.push(this.faceData[fid]);
            this.edgeData.push(this.faceData[fid+1]);
            
            this.edgeData.push(this.faceData[fid+1]);
            this.edgeData.push(this.faceData[fid+2]);
            
            this.edgeData.push(this.faceData[fid+2]);
            this.edgeData.push(this.faceData[fid]);
        }
    }

    setupBuffers(shaderProgram) {
        this.vertexArrayObject = gl.createVertexArray();
        gl.bindVertexArray(this.vertexArrayObject);

        this.vertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);      
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positionData),
                      gl.STATIC_DRAW);
        this.vertexPositionBuffer.itemSize = 3;
        this.vertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.vertexPositionBuffer.numItems, " vertices.");

        gl.vertexAttribPointer(shaderProgram.locations.vertexPosition,
                               this.vertexPositionBuffer.itemSize, gl.FLOAT, 
                               false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.locations.vertexPosition);
    
        this.vertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normalData),
                      gl.STATIC_DRAW);
        this.vertexNormalBuffer.itemSize = 3;
        this.vertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.vertexNormalBuffer.numItems, " normals.");

        gl.vertexAttribPointer(shaderProgram.locations.vertexNormal,
                               this.vertexNormalBuffer.itemSize, gl.FLOAT, 
                               false, 0, 0);
        gl.enableVertexAttribArray(shaderProgram.locations.vertexNormal);
    
        this.triangleIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.faceData),
                      gl.STATIC_DRAW);
        this.triangleIndexBuffer.itemSize = 1;
        this.triangleIndexBuffer.numItems = this.faceData.length;
        console.log("Loaded ", this.triangleIndexBuffer.numItems, " triangles.");
    
        this.edgeIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.edgeData),
                      gl.STATIC_DRAW);
        this.edgeIndexBuffer.itemSize = 1;
        this.edgeIndexBuffer.numItems = this.edgeData.length;
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }
    
    drawTriangles() {
        gl.bindVertexArray(this.vertexArrayObject);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.triangleIndexBuffer.numItems,
                        gl.UNSIGNED_INT,0);
    }

    drawEdges() {
        gl.bindVertexArray(this.vertexArrayObject);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeIndexBuffer);
        gl.drawElements(gl.LINES, this.edgeIndexBuffer.numItems,
                        gl.UNSIGNED_INT,0);   
    }

    // For Debugging
    printBuffers() {
        for (var i = 0; i < this.numVertices; i++) {
            console.log("v ", this.positionData[i*3], " ", 
                              this.positionData[i*3 + 1], " ",
                              this.positionData[i*3 + 2], " ");
        }
        for (var i = 0; i < this.numVertices; i++) {
            console.log("n ", this.normalData[i*3], " ", 
                              this.normalData[i*3 + 1], " ",
                              this.normalData[i*3 + 2], " ");
        }
        for (var i = 0; i < this.numFaces; i++) {
            console.log("f ", this.faceData[i*3], " ", 
                              this.faceData[i*3 + 1], " ",
                              this.faceData[i*3 + 2], " ");
        }  
    }

}
