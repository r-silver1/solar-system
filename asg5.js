//Modules have the advantage that they can easily import other modules they need. That saves us from having to manually load extra scripts they are dependent on (link)
import * as THREE from './build/three.module.js';
import {OBJLoader2} from "./examples/jsm/loaders/OBJLoader2.js";
import {MTLLoader} from "./examples/jsm/loaders/MTLLoader.js";
import {MtlObjBridge} from "./examples/jsm/loaders/obj2/bridge/MtlObjBridge.js";
import {OrbitControls} from "./examples/jsm/controls/OrbitControls.js";

let g_scene,  g_renderer, WIDTH, HEIGHT;
let g_shapes = [];
let textures = [];

//container: global pointer to div element holding animation; g_controls: orbit controls
let g_container;

//directional light
let g_lightSphere;
//point light and helper
let g_point, g_helper;
//spot light (flashlight) and helper)
let g_spot, g_SpotHelper;

//for shapes
let g_plane;
//box size for custom object
let g_boxSize, g_boxCenter;
//global radius of frame box
let g_rad;
//skybox, offsets: debris field vectors from asteroid center
let g_skyBox, g_offsets;
//planet array
let g_sphere = [];
//initial animation angle (not using time);
let g_aniTheta = 90;

//cameras
let g_cameraHelper, g_camera, g_freeCam, g_freeCamControls, g_controls;
//initial camera choice is perspective camera
let g_camChoice = 0;

let g_axis = new THREE.Vector3(0,1, 0);



//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~initialize enviro~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//initialize threeJS environment, basically everything except initializing objects or drawing
function initEnviro(){
    pushRender();
    windowSize();
    initScene();
    initCameras();
    initFog();
    initLight();
}

//enable auto resizing windows and canvas
function windowSize(){
    //get width and height of div element containing script https://stackoverflow.com/a/47592003/10432596
    //not using a canvas element in the same way/place as tutorials, makes it easier to use CSS imo
    WIDTH = document.getElementById('threeAni').clientWidth;
    HEIGHT = document.getElementById('threeAni').clientHeight;
    g_renderer.setSize(WIDTH, HEIGHT);

    //add event listener for window resize to update perspective and g_renderer (with changed w/h/aspect) (treehouse code)
    window.addEventListener('resize', function(){
        HEIGHT = document.getElementById('threeAni').clientHeight;
        WIDTH = document.getElementById('threeAni').clientWidth;
        g_renderer.setSize(WIDTH, HEIGHT);
        g_camera.aspect = WIDTH/HEIGHT;
        //needed to actually update g_camera
        g_camera.updateProjectionMatrix();
    });
}

function pushRender(){
    //create webglrenderer, can use GPU to render
    //add antialias, true? https://blog.teamtreehouse.com/the-beginners-guide-to-three-js
    //log. depth buffer: help prevent z fighting https://threejsfundamentals.org/threejs/lessons/threejs-cameras.html
    g_renderer = new THREE.WebGLRenderer({antialias:true, logarithmicDepthBuffer: true});
    //enable shadow map
    g_renderer.shadowMap.enabled = true;
    //append to document: treehouse; append to div: https://stackoverflow.com/a/17507839/10432596
    //div element named threeAni in index.html
    g_container = document.getElementById('threeAni');
    document.body.appendChild(g_container);
    g_container.appendChild(g_renderer.domElement);
    //https://threejs.org/docs/#api/en/math/Color
    g_renderer.setClearColor(new THREE.Color("rgb(100, 100, 100)"), 1);
}


function initScene(){
    //make a g_scene
    g_scene = new THREE.Scene();
}

function initCameras(){
    //create perspectiveCamera with fov, aspect, near, far
    g_camera = new THREE.PerspectiveCamera(100, WIDTH/HEIGHT, .1, 500);
    g_camera.position.x = 1;
    g_camera.position.y = 1;
    g_camera.position.z = 3;
    //set controls, but will be updated when custom asteroid object loaded
    g_controls = new OrbitControls(g_camera, g_container);
    g_controls.target.set(0, 0, 0);
    //actually update controls
    g_controls.update();

    //multiple camera tutorial https://stemkoski.github.io/Three.js/Multiple-Cameras.html
    //need to have super long far to see whole solar system
    g_freeCam = new THREE.PerspectiveCamera(100, WIDTH/HEIGHT, .1, 19000);
    let freeCamPos = new THREE.Vector3(-1000, 1000, -1000);
    g_freeCam.position.copy(freeCamPos);
    g_freeCamControls = new OrbitControls(g_freeCam, g_container);
    g_freeCamControls.enabled = false;
    g_freeCamControls.target.set(100, 0, 0);
    g_freeCamControls.update();
}

//fog: helps cover up edges of skybox, fade to dark grey/black
function initFog() {
    //init fog https://threejsfundamentals.org/threejs/lessons/threejs-fog.html
    const colFog = '#0b0b0b';
    const nearFog = 750;
    const farFog = 11000;
    g_scene.fog = new THREE.Fog(colFog, nearFog, farFog);
    g_scene.background = new THREE.Color('#070707');
}

//sunspots: spotlights for sun (location of directional light) to help it appear to be glowing like normal
//one of the tutorials said we could put a mesh over a light helper but after a lot of googling I could not find out
//how to do that. They shine with a specified near/far/angle/pos so they hit the sun but planets' orbits don't cross
function initSunSpots(){
    let sunSpotDec = 1;
    let sunSpotDist = 1000;
    let sunSpotIntense = 20.0;
    let sunSpotTheta = 15;
    let sunSpotHigh = new THREE.SpotLight('#FFFFFF', sunSpotIntense);
    g_scene.add(sunSpotHigh);
    sunSpotHigh.distance = sunSpotDist;
    sunSpotHigh.position.set(0, sunSpotDist, 0);
    sunSpotHigh.decay = sunSpotDec;
    sunSpotHigh.target.position.set(0,-sunSpotDist*.1,0);
    g_scene.add(sunSpotHigh.target);
    sunSpotHigh.angle = THREE.MathUtils.degToRad(sunSpotTheta);
    let ssH_help = new THREE.SpotLightHelper(sunSpotHigh);
    ssH_help.name = "ssH_help";
    ssH_help.visible = false;
    g_scene.add(ssH_help);

    let sunSpotLow = new THREE.SpotLight('#FFFFFF', sunSpotIntense);
    g_scene.add(sunSpotLow);
    sunSpotLow.distance = sunSpotDist;
    sunSpotLow.position.set(0, -sunSpotDist, 0);
    sunSpotLow.decay = sunSpotDec;
    sunSpotLow.target.position.set(0,-sunSpotDist*.1,0);
    g_scene.add(sunSpotLow.target);
    sunSpotLow.angle = THREE.MathUtils.degToRad(sunSpotTheta);
    let ssL_help = new THREE.SpotLightHelper(sunSpotLow);
    ssL_help.name = "ssL_help";
    ssL_help.visible = false;
    g_scene.add(ssL_help);

    let sunSpotLeft = new THREE.SpotLight('#FFFFFF', sunSpotIntense);
    g_scene.add(sunSpotLeft);
    sunSpotLeft.distance = sunSpotDist;
    sunSpotLeft.position.set(sunSpotDist, 0, 0);
    sunSpotLeft.decay = sunSpotDec;
    sunSpotLeft.target.position.set(-sunSpotDist*.1,0,0);
    g_scene.add(sunSpotLeft.target);
    sunSpotLeft.angle = THREE.MathUtils.degToRad(sunSpotTheta);
    let ssLef_help = new THREE.SpotLightHelper(sunSpotLeft);
    ssLef_help.name = "ssLef_help";
    ssLef_help.visible = false;
    g_scene.add(ssLef_help);

    let sunSpotRight = new THREE.SpotLight('#FFFFFF', sunSpotIntense);
    g_scene.add(sunSpotRight);
    sunSpotRight.distance = sunSpotDist;
    sunSpotRight.position.set(-sunSpotDist, 0, 0);
    sunSpotRight.decay = sunSpotDec;
    sunSpotRight.target.position.set(sunSpotDist*.1,0,0);
    g_scene.add(sunSpotRight.target);
    sunSpotRight.angle = THREE.MathUtils.degToRad(sunSpotTheta);
    let ssRi_help = new THREE.SpotLightHelper(sunSpotRight);
    ssRi_help.name = "ssRi_help";
    ssRi_help.visible = false;
    g_scene.add(ssRi_help);
}

//initialize ambient, diffuse and spot lighting
function initLight(){
    //ambient light
    //https://threejsfundamentals.org/threejs/lessons/threejs-lights.html
    const colorAmb = 0xFFFFFF;
    const intensityAmb = .9;
    const ambLight = new THREE.AmbientLight(colorAmb, intensityAmb);
    g_scene.add(ambLight);

    //point light (sun)
    const colorPt = 0xFFFFFF;
    const intensityPt = 1.5;
    g_point = new THREE.PointLight(colorPt, intensityPt, 5000, 1.0);
    g_point.position.set(0, 0, 0);
    g_scene.add(g_point);
    //helper for point light: press h and then c and scroll into sun to see
    g_helper = new THREE.PointLightHelper(g_point, 10);
    g_helper.visible = false;
    g_scene.add(g_helper);
    //casts shadows on planets
    //grading note: could not get the objects to cast shadows, not sure why
    g_point.castShadow = true;
    //adjust the near and far for shadows
    g_point.shadow.camera.far = 15000;
    g_cameraHelper = new THREE.CameraHelper(g_point.shadow.camera);
    g_cameraHelper.name = "shadHelp";
    g_cameraHelper.visible = false;
    g_scene.add(g_cameraHelper);

    //spotlight: flashlight emanating from asteroid chase camera
    //yellow light
    const colorSpot = 0xffffa7;
    const intensitySpot = .4;
    g_spot = new THREE.SpotLight(colorSpot, intensitySpot);

    g_scene.add(g_spot);
    let setBack = 1.5;
    g_spot.position.set(setBack*g_camera.position.x, setBack*g_camera.position.y, setBack*g_camera.position.z);
    g_spot.angle = THREE.MathUtils.degToRad(7);
    //inner cone: percentage difference from outer, set by penumbra; diffuse cone
    g_spot.penumbra = .5;
    //this target will change once moon object is initiated
    g_scene.add(g_spot.target);
    g_spot.target.position.set(0,0,0);
    //spot light helper initiated with keypress 'h'
    g_SpotHelper = new THREE.SpotLightHelper(g_spot);
    g_SpotHelper.visible = false;
    g_scene.add(g_SpotHelper);

    //initialize spot lighting around sn
    initSunSpots();

    //initialize "sun" shape
    let lightGeo = new THREE.SphereGeometry(250);
    //adjust opacity and which side shining to make it look moe "sun-like"
    // let lightCol = new THREE.MeshPhongMaterial({color: 0xe7c21e, transparent: true, opacity: .01, side: THREE.BackSide});
    let lightCol = new THREE.MeshPhongMaterial({color: 0xe7c21e, transparent: true, opacity: .95, side: THREE.BackSide});
    g_lightSphere = new THREE.Mesh(lightGeo, lightCol);
    //sun doesn't get affected by fog or cast shadow
    g_lightSphere.fog = false;
    g_lightSphere.castShadow = false;
    g_scene.add(g_lightSphere);
    //redundant since point light is at origin but making sure sun it on light
    g_lightSphere.position.x = g_point.position.x;
    g_lightSphere.position.y = g_point.position.y;
    g_lightSphere.position.z = g_point.position.z;
}

//use loading manager https://threejsfundamentals.org/threejs/lessons/threejs-textures.html#wait1
function initTextures(){
    const loader = new THREE.TextureLoader();
    //crate
    textures[0] = new THREE.MeshPhongMaterial({map: loader.load('./textures/crate_texture.jpg')});
    //floor
    textures[1] = new THREE.MeshPhongMaterial({map: loader.load('./textures/floorTexjep_bigger.jpg')});
    //walls
    textures[2] = new THREE.MeshPhongMaterial({map: loader.load('./textures/walltex_done1.jpg')});
    textures[3] = new THREE.MeshLambertMaterial({map: loader.load('./textures/sky.png'), side: THREE.BackSide});
    //planet textures: http://planetpixelemporium.com/index.php
    //jupiter:
    textures[4] = new THREE.MeshLambertMaterial({map: loader.load('./textures/jupitermap.jpg'),});
    //mars:
    textures[5] = new THREE.MeshLambertMaterial({map: loader.load('./textures/marsmap1k.jpg'),});
    textures[6] = new THREE.MeshLambertMaterial({map: loader.load('./textures/earthmap1k.jpg'),});
    textures[7] = new THREE.MeshLambertMaterial({map: loader.load('./textures/mercurymap.jpg'),});
    textures[8] = new THREE.MeshLambertMaterial({map: loader.load('./textures/venusmap.jpg'),});
    textures[9] = new THREE.MeshLambertMaterial({map: loader.load('./textures/saturnmap.jpg'),});
    textures[10] = new THREE.MeshLambertMaterial({map: loader.load('./textures/uranusmap.jpg'),});
    textures[11] = new THREE.MeshLambertMaterial({map: loader.load('./textures/neptunemap.jpg'),});
    textures[12] = new THREE.MeshLambertMaterial({map: loader.load('./textures/plutomap1k.jpg'),});


}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~initialize shapes~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

//draw x, y, z axes when h is pressed
//https://threejs.org/docs/#manual/en/introduction/Drawing-lines
function drawAxes(){
    //draw x, y, z axis
    //red for x axis
    const xMat = new THREE.LineBasicMaterial({color: 0xe31100});
    const pointX = [];
    pointX.push(new THREE.Vector3(-10000,0,0));
    pointX.push(new THREE.Vector3(10000,0,0));
    const xGeo = new THREE.BufferGeometry().setFromPoints(pointX);
    const xAx = new THREE.Line(xGeo, xMat);
    xAx.name = 'xAx';
    g_scene.add(xAx);

    //blue for y axis
    const yMat = new THREE.LineBasicMaterial({color: 0x1c1fa4});
    const pointY = [];
    pointY.push(new THREE.Vector3(0, -10000, 0));
    pointY.push(new THREE.Vector3(0, 10000, 0));
    const yGeo = new THREE.BufferGeometry().setFromPoints(pointY);
    const yAx = new THREE.Line(yGeo, yMat);
    yAx.name = 'yAx';
    g_scene.add(yAx);

    //green for z axis
    const zMat = new THREE.LineBasicMaterial({color: 0x1cb93a});
    const pointZ = [];
    pointZ.push(new THREE.Vector3(0, 0, -10000));
    pointZ.push(new THREE.Vector3(0, 0, 10000));
    const zGeo = new THREE.BufferGeometry().setFromPoints(pointZ);
    const zAx = new THREE.Line(zGeo, zMat);
    zAx.name = 'zAx';
    g_scene.add(zAx);

    //init to invisible
    xAx.visible = yAx.visible = zAx.visible = false;
}

//draw a big projection screen to better see shadows when h pressed
function initPlane(){
    let planeGeo = new THREE.PlaneBufferGeometry(10000,10000);
    let mat = new THREE.MeshPhongMaterial({color: '#aaa897', side: THREE.DoubleSide});
    g_plane = new THREE.Mesh(planeGeo, mat);
    g_plane.visible = false;
    g_plane.receiveShadow = true;
    g_plane.position.z = -8000;
    g_scene.add(g_plane);
    drawAxes();
}

//when custom object loaded, take it and the box around it and adjust camera to show object at good scale
//used to load asteroid and show chase cam in correct position, similar logic used in animate
//taken directly from https://threejsfundamentals.org/threejs/lessons/threejs-load-obj.html
function frameArea(sizeFit, boxSize, boxCenter, camera){
    g_boxSize = boxSize;
    g_boxCenter = boxCenter;
    //calculate distance needed from g_camera to center of loaded object, then point at object center
    //use size of box needed to view and angle to calculate distance, then move g_camera
    //get unit vector: current g_camera position to object center
    const direction = (new THREE.Vector3()).subVectors(camera.position, boxCenter);
    //move g_camera "distance" units away in that direction
    camera.position.copy(direction.multiplyScalar(-.05).add(boxCenter));
    camera.position.y += 10;
    //pick near and far values that will fit box
    camera.near = boxSize/100;
    camera.far = boxSize * 300;
    camera.updateProjectionMatrix();
    //point g_camera at box center
    camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);
}

function initCustomObj(){

    //load mtl for moon
    const mtlLoader = new MTLLoader();
    // moon texture: from google poly https://poly.google.com/view/9OPocAqXM0u
    mtlLoader.load('./models/1226 Moon.mtl', (mtlParseResult) =>{
        const objLoader = new OBJLoader2();
        const materials = MtlObjBridge.addMaterialsFromMtlLoader(mtlParseResult);
        objLoader.addMaterials(materials);
        objLoader.load('./models/1226_Moon.obj', (asteroid)=>{
            //https://threejs.org/docs/#api/en/core/Object3D.scale
            //https://bl.ocks.org/duhaime/8c2be958e71ea1814e8c11f95592a3a4
            asteroid.name = "moon";
            asteroid.castShadow = true;

            //if adjust scale need to adjust rotation to fix
            asteroid.scale.x = .9;
            asteroid.scale.y = .9;
            asteroid.scale.z = .9;
            g_scene.add(asteroid);

            //logic for resizing view area
            //box containing g_scene
            let box = new THREE.Box3().setFromObject(asteroid);
            let boxCenter = box.getCenter(new THREE.Vector3());

            //snap asteroid to origin
            asteroid.position.x = -boxCenter.x;
            asteroid.position.y = -boxCenter.y;
            asteroid.position.z = -boxCenter.z;
            //move asteroid to initial rotation point
            let boxSize = box.getSize(new THREE.Vector3()).length();
            asteroid.position.x = -15*boxSize;
            asteroid.position.z = -15*boxSize;

            //redo box view
            box = new THREE.Box3().setFromObject(asteroid);
            boxSize = box.getSize(new THREE.Vector3()).length();
            boxCenter = box.getCenter(new THREE.Vector3());

            //set g_camera: frame g_scene using our box
            frameArea(boxSize*1.1, boxSize, boxCenter, g_camera);

        });
    });

    //todo: initialize position of shuttle in same way new debris cubes initialized, make things easier for orbiting ship?
    //space shuttle https://www.cgtrader.com/items/869754/download-page
    mtlLoader.load('./models/shuttle.mtl', (mtlParseResult) =>{
        const objLoader = new OBJLoader2();
        const materials = MtlObjBridge.addMaterialsFromMtlLoader(mtlParseResult);
        objLoader.addMaterials(materials);
        objLoader.load('./models/shuttle.obj', (shuttle)=>{
            //https://threejs.org/docs/#api/en/core/Object3D.scale
            //https://bl.ocks.org/duhaime/8c2be958e71ea1814e8c11f95592a3a4
            shuttle.name = "shuttle";

            //if adjust scale need to adjust rotation to fix
            shuttle.scale.x = 5;
            shuttle.scale.y = 5;
            shuttle.scale.z = 5;

            //as if object shadows were working anyways
            shuttle.castShadow = true;
            shuttle.position.copy(g_boxCenter.multiplyScalar(1.1));
            g_scene.add(shuttle);

            //snap shuttle to origin
            shuttle.position.x = g_boxCenter.x;
            shuttle.position.y = g_boxCenter.y;
            shuttle.position.z = g_boxCenter.z;
            shuttle.position.multiplyScalar(1.0);

            //because I couldn't get async or loaders to work correctly, hacking it by putting calls to create objects (relative to moon) and animate after objects loaded
            waitObj();
            // requestAnimationFrame(animate);
        });
    });

}


//make new mesh with inputed geometry vertices, color and position
function makeInstance(geometry, material, verts){
    //initialize shape with geometry and material (color or texture)
    const shape = new THREE.Mesh(geometry, material);
    shape.castShadow = true;
    shape.receiveShadow = true;
    //add to g_scene to be rendered
    g_scene.add(shape);
    //set position of shape
    shape.position.x = verts[0];
    shape.position.y = verts[1];
    shape.position.z = verts[2];
    return shape;
}

//this is sloppy, but basically I couldn't get any loading managers or async functions to wait for object load in correct way.
//I got it eventually to the point that it would sort of work, but about half the time it wouldn't work correctly and break the program
//for this reason I hacked together a solution where when the last custom object is initialized and then this function waitObj and animate are called.
//still has some problems but less buggy
function waitObj(){
    // let color_a = 0x9699e0;
    // const material_a = new THREE.MeshPhongMaterial({color: color_a});

    //set how far g_point shines relative to frame box size
    g_point.distance = 150*g_boxSize;

    //skybox
    //basically make the skybox 100 times bigger than frame box
    // let coordScale = 100;
    let coordScale = 140;
    // const sphereGeo = new THREE.SphereGeometry(.5*coordScale*g_boxSize, 32, 32);
    const sphereGeo = new THREE.BoxGeometry(coordScale*g_boxSize, coordScale*g_boxSize, coordScale*g_boxSize);
    sphereGeo.name = "skyBox";
    g_skyBox = new THREE.Mesh(sphereGeo, textures[3]);
    g_scene.add(g_skyBox);

    //now that moon is loaded we can generate a debris field around it
    const geometry = new THREE.BoxGeometry(4, 4, 4);
    //define how far out from the asteroid boxes should orbit based on frame size
    g_rad = g_boxSize*.5;
    let pos = [g_rad-1, 1, -.5];
    //store random coord offsets from asteroid center
    g_offsets = [];
    for(let i = 0; i<100; i+=1){
        //generate two random angles between 45 and 90, essentially limiting the range in randomness for orbit offset in horz and vert directions
        //necessary to reduce how often boxes collide with asteroid/look more like a debris field... we're not really orbiting just spinning around y axis
        //so necessary
        let horzAngle = 45 + Math.random()*45;
        let vertAngle = 45 + Math.random()*45;
        //make a random direction vector from these angles
        let ranVec = new THREE.Vector3(Math.cos(horzAngle), Math.sin(vertAngle), Math.sin(horzAngle),);
        ranVec.normalize();
        ranVec.multiplyScalar(g_rad*2);
        g_offsets.push(ranVec.x);
        g_offsets.push(ranVec.y);
        g_offsets.push(ranVec.z);
        //generate random g_shapes
        let tweakedGeo = geometry;
        tweakedGeo.x *= Math.random();
        tweakedGeo.y *= Math.random();
        tweakedGeo.z *- Math.random();
        let shapePush = makeInstance(tweakedGeo, textures[Math.floor(Math.random()*3)], pos);
        g_shapes.push(shapePush);
    }
    //create planets

    let mercuryGeo = new THREE.SphereGeometry(40, 32, 32);
    let mercury = new THREE.Mesh(mercuryGeo, textures[7]);
    mercury.name = "mercury";
    mercury.castShadow = true;
    mercury.receiveShadow = true;
    mercury.fog = false;
    mercury.position.copy(g_lightSphere.position);
    g_scene.add(mercury);
    g_sphere.push(mercury);

    let venusGeo = new THREE.SphereGeometry(60, 32, 32);
    let venus = new THREE.Mesh(venusGeo, textures[8]);
    venus.name = "venus";
    venus.castShadow = true;
    venus.receiveShadow = true;
    venus.fog = false;
    venus.position.copy(g_lightSphere.position);
    g_scene.add(venus);
    g_sphere.push(venus);

    let earthGeo = new THREE.SphereGeometry(200, 32, 32);
    let earth = new THREE.Mesh(earthGeo, textures[6]);
    earth.name = "earth";
    earth.castShadow = true;
    earth.receiveShadow = true;
    earth.fog = false;
    // earth.position.x = -700;
    // earth.position.z = -700;
    earth.position.copy(g_lightSphere.position);
    g_scene.add(earth);
    g_sphere.push(earth);

    let marsGeo = new THREE.SphereGeometry(150, 32, 32);
    let mars = new THREE.Mesh(marsGeo, textures[5]);
    // mars.position.copy(g_lightSphere.position);
    mars.name = "mars";
    mars.castShadow = true;
    mars.receiveShadow = true;
    mars.fog = false;
    // mars.position.x = -1000;
    // mars.position.z = -1000;
    mars.position.copy(g_lightSphere.position);
    g_scene.add(mars);
    g_sphere.push(mars);

    let jupiterGeo = new THREE.SphereGeometry(300, 32, 32);
    //jupiter
    let jupiter = new THREE.Mesh(jupiterGeo, textures[4]);
    jupiter.name = "jupiter";
    jupiter.castShadow = true;
    jupiter.receiveShadow = true;
    jupiter.fog = false;
    // jupiter.position.z = -2600;
    // jupiter.position.x = 0;
    jupiter.position.copy(g_lightSphere.position);
    g_scene.add(jupiter);
    g_sphere.push(jupiter);

    let saturnGeo = new THREE.SphereGeometry(260, 32, 32);
    let saturn = new THREE.Mesh(saturnGeo, textures[9]);
    saturn.name = "saturn";
    saturn.castShadow = true;
    saturn.receiveShadow = true;
    saturn.fog = false;
    saturn.position.copy(g_lightSphere.position);
    g_scene.add(saturn);
    g_sphere.push(saturn);

    let uranusGeo = new THREE.SphereGeometry(200, 32, 32);
    let uranus = new THREE.Mesh(uranusGeo, textures[10]);
    uranus.name = "uranus";
    uranus.castShadow = true;
    uranus.receiveShadow = true;
    uranus.fog = false;
    uranus.position.copy(g_lightSphere.position);
    g_scene.add(uranus);
    g_sphere.push(uranus);

    let neptuneGeo = new THREE.SphereGeometry(200, 32, 32);
    let neptune = new THREE.Mesh(neptuneGeo, textures[11]);
    neptune.name = "neptune";
    neptune.castShadow = true;
    neptune.receiveShadow = true;
    neptune.fog = false;
    neptune.position.copy(g_lightSphere.position);
    g_scene.add(neptune);
    g_sphere.push(neptune);

    let plutoGeo = new THREE.SphereGeometry(40, 32, 32);
    let pluto = new THREE.Mesh(plutoGeo, textures[12]);
    pluto.name = "pluto";
    pluto.castShadow = true;
    pluto.receiveShadow = true;
    pluto.fog = false;
    pluto.position.copy(g_lightSphere.position);
    g_scene.add(pluto);
    g_sphere.push(pluto);


    //not that everything is loaded call animate
    requestAnimationFrame(animate);
}

function initShapes(){
    initPlane();
    initTextures();
    initCustomObj();
}



//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~input~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
function toggleHelpers(){
    if(g_SpotHelper.visible){
        g_SpotHelper.visible = false;
    }else{
        g_SpotHelper.visible = true;
    }
    if(g_helper.visible){
        g_helper.visible = false;
    }else{
        g_helper.visible = true;
    }
    if(g_cameraHelper.visible){
        g_cameraHelper.visible = false;
    }else{
        g_cameraHelper.visible = true;
    }
    if(g_plane.visible == true){
        g_plane.visible = false;
    }else{
        g_plane.visible = true;
    }

    let xAx = g_scene.getObjectByName("xAx");
    let yAx = g_scene.getObjectByName("yAx");
    let zAx = g_scene.getObjectByName("zAx");
    //if one axis visible then all visible
    if(xAx.visible){
        xAx.visible = false;
        yAx.visible = false;
        zAx.visible = false;
    }else{
        xAx.visible = true;
        yAx.visible = true;
        zAx.visible = true;
    }
    let ssH = g_scene.getObjectByName("ssH_help");
    let ssL = g_scene.getObjectByName("ssL_help");
    let ssLef = g_scene.getObjectByName("ssLef_help");
    let ssRi = g_scene.getObjectByName("ssRi_help");
    if(ssH.visible == true){
        ssH.visible = false;
        ssL.visible = false;
        ssLef.visible = false;
        ssRi.visible = false;
    }else{
        ssH.visible = true;
        ssL.visible = true;
        ssLef.visible = true;
        ssRi.visible = true;
    }

}

//lifted from my assignment 4, but keycode deprecated https://dev.to/taufik_nurrohman/bringing-keyboardevent-key-and-keyboardevent-keycode-altogether-for-the-best-keyboard-interaction-experience-jlf#:~:text=Long%20story%20short%2C%20the%20KeyboardEvent,that%20we%20are%20currently%20using.
function keydown(ev){
    switch(ev.key){
        case 'f':
            console.log(`F for respects`);
            //toggle lights with "visible", property object3d https://discourse.threejs.org/t/best-way-to-turn-off-a-light/2075/4
            if(g_spot.visible){
                g_spot.visible = false;
            }else{
                g_spot.visible = true;
            }
            break;
        case 'h':
            //disable/enable helpers
            toggleHelpers();
            break;
        case 'c':
            //set global cam choice for use in animation pass to renderer as well as set correct controls enabled
            if(g_camChoice == 0){
                g_camChoice = 1;
                g_controls.enabled = false;
                g_controls.update();
                g_freeCamControls.enabled = true;
            }else{
                g_camChoice = 0;
                g_controls.enabled = true;
                g_controls.update();
                g_freeCamControls.enabled = false;
                g_freeCamControls.update();
            };
            break;

    }
}

function UIhelper(){
    document.onkeydown = function(ev){
        keydown(ev);
    }
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~animation~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

function animate(time){
    //increment animation angle, since not using time; we wanted to ensure an initial starting angle
    g_aniTheta+=.01;

    //convert time to milliseconds
    time=g_aniTheta;
    //speed of rotation
    let orbSpeed = .8;
    //used for spinning shapes around their axis of rotation
    let orbX = Math.cos(time*orbSpeed)*g_rad;
    let orbY = -Math.sin(time*orbSpeed)*g_rad;

    //access defined element for animation https://stackoverflow.com/a/19427037
    let moonObj = g_scene.getObjectByName("moon");
    let shuttleObj = g_scene.getObjectByName("shuttle");
    let mercuryObj = g_scene.getObjectByName("mercury");
    let venusObj = g_scene.getObjectByName("venus");
    let earthObj = g_scene.getObjectByName("earth");
    let marsObj = g_scene.getObjectByName("mars");
    let jupiterObj = g_scene.getObjectByName("jupiter");
    let saturnObj = g_scene.getObjectByName("saturn");
    let uranusObj = g_scene.getObjectByName("uranus");
    let neptuneObj = g_scene.getObjectByName("neptune");
    let plutoObj = g_scene.getObjectByName("pluto");

    //sun rotation
    g_lightSphere.rotation.y = -.1*time*orbSpeed;

    //todo: after change structure of calls might be able to get rid of these conditionals for checking if shapes defined
    if(moonObj){
        let posOffset = 30;
        moonObj.rotation.y = time*orbSpeed;
        moonObj.position.x -= posOffset*Math.cos(time);
        moonObj.position.z -= posOffset*Math.sin(time);

        if(jupiterObj && earthObj && marsObj && mercuryObj && venusObj) {

            //mercury
            mercuryObj.rotation.y = time*orbSpeed;
            mercuryObj.position.x = 750*Math.cos(-30+.4*time);
            mercuryObj.position.z = 750*Math.sin(-30+.4*time);

            //venus
            venusObj.rotation.y = time*orbSpeed;
            venusObj.position.x = 1250*Math.cos(-5+.6*time);
            venusObj.position.z = 1250*Math.sin(-5+.6*time);

            //earth
            let planBoff = posOffset * .7;
            earthObj.rotation.y = time*orbSpeed;
            // earthObj.position.x -= planBoff * Math.cos(time);
            // earthObj.position.z -= planBoff * Math.sin(time);
            earthObj.position.x = 2000*Math.cos(.8*time);
            earthObj.position.z = 2000*Math.sin(.8*time);

            let timeC = 195 + time;
            //mars
            let planCoff = posOffset * .95;
            marsObj.rotation.y = timeC*orbSpeed;
            // marsObj.position.x -= planCoff * Math.cos(timeC);
            // marsObj.position.z -= planCoff * Math.sin(timeC);
            marsObj.position.x = 3000*Math.cos(30+1.0*time);
            marsObj.position.z = 3000*Math.sin(30+1.0*time);

            //jupiter
            let planAoff = posOffset * 1.2;
            let timeA = 45.0 + time;
            jupiterObj.rotation.y = timeA*orbSpeed;
            // jupiterObj.position.x -= planAoff * Math.cos(timeA);
            // jupiterObj.position.z -= planAoff * Math.sin(timeA);
            jupiterObj.position.x = 4200*Math.cos(45+1.3*time);
            jupiterObj.position.z = 4200*Math.sin(45+1.3*time);

            saturnObj.rotation.y = time*orbSpeed;
            saturnObj.position.x = 5000*Math.cos(60+1.4*time);
            saturnObj.position.z = 5000*Math.sin(60+1.4*time);

            uranusObj.rotation.y = time*orbSpeed;
            uranusObj.position.x = 5500*Math.cos(70+1.5*time);
            uranusObj.position.z = 5500*Math.sin(70+1.5*time);

            neptuneObj.rotation.y = time*orbSpeed;
            neptuneObj.position.x = 6000*Math.cos(80+1.6*time);
            neptuneObj.position.z = 6000*Math.sin(80+1.6*time);

            plutoObj.rotation.y = time*orbSpeed;
            plutoObj.position.x = 6500*Math.cos(85+1.7*time);
            plutoObj.position.z = 6500*Math.sin(85+1.7*time);

        }

        //reframe moon at new location with box to position chase cam and debris
        let box_an = new THREE.Box3().setFromObject(moonObj);
        let boxSize_an = box_an.getSize(new THREE.Vector3()).length();
        let boxCenter_an = box_an.getCenter(new THREE.Vector3());

        //rotate g_camera with moon
        g_camera.position.x -= posOffset*Math.cos(time);
        g_camera.position.z -= posOffset*Math.sin(time);

        //pick near and far values that will fit box
        g_camera.near = boxSize_an/100;
        g_camera.far = boxSize_an * 100;
        g_camera.updateProjectionMatrix();

        //update spotlight
        g_spot.target.position.set(boxCenter_an.x, boxCenter_an.y, boxCenter_an.z);
        g_spot.position.set(g_camera.position.x, g_camera.position.y, g_camera.position.z);
        g_SpotHelper.update();

        g_controls.maxDistance = boxSize_an * 10;
        g_controls.target.copy(boxCenter_an);
        g_controls.update();

        //update debris field
        //ndx: index
        g_shapes.forEach((cube, ndx) => {
            const speed = 1 + ndx * .1;
            const rot = time * speed;

            cube.position.x = moonObj.position.x + orbX +  g_offsets[ndx+0];
            cube.position.z = moonObj.position.z + orbY + g_offsets[ndx+1];
            cube.position.y = moonObj.position.y + g_offsets[ndx+2];

            let dirDebris = (new THREE.Vector3()).subVectors(cube.position, boxCenter_an);

            // ///https://stackoverflow.com/a/10747728/10432596
            dirDebris.applyAxisAngle(g_axis, time*orbSpeed);
            cube.position.x = moonObj.position.x + dirDebris.x;
            cube.position.z = moonObj.position.z + dirDebris.z;

            cube.rotation.x = rot;
            cube.rotation.y = rot;
        });

        if(shuttleObj){
            shuttleObj.position.x -= posOffset*Math.cos(time);
            shuttleObj.position.z -= posOffset*Math.sin(time);
        }

        //todo: this line needed?
        //update global moon box variable
        g_boxCenter = boxCenter_an;
    }

    g_helper.update();
    g_cameraHelper.update();
    if(g_camChoice == 0){
        g_renderer.render(g_scene, g_camera);
    }else{
        g_renderer.render(g_scene, g_freeCam);
    }
    requestAnimationFrame(animate);
}


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~main~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

function main(){
    //all threejs scene, globals
    initEnviro();
    //shapes/custom objects/textures globals and init animation
    initShapes();
    //input
    UIhelper();
}
main();
