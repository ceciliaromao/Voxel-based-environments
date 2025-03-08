import * as THREE from 'three';
import GUI from '../libs/util/dat.gui.module.js'
import {ARjs}    from  '../libs/AR/ar.js';
import {TeapotGeometry} from '../build/jsm/geometries/TeapotGeometry.js';
import { initDefaultSpotlight,
         initRenderer,
         createGroundPlaneXZ} from "../libs/util/util.js";

const FACTOR = 60;
const VX = 10;
// init scene and camera
let scene, camera, renderer;
let shadowMapType = THREE.VSMShadowMap;
renderer = initRenderer();
   renderer.setClearColor(new THREE.Color('lightgrey'), 0)   
scene	= new THREE.Scene();
camera = new THREE.Camera();
   scene.add(camera);
//initDefaultSpotlight(scene, new THREE.Vector3(-5, 5, 0), 5); // Use default light

let TEXTURES_PATHS = [
   "assets/textures/stone_bricks.png",
   "assets/textures/blue_ice.png",
   "assets/textures/deepslate_bricks.png",
   "assets/textures/oak_planks.png"
];

let TEMPLE_PARTS = [
   "templeBottom",
   "templeTable",
   "templeMid",
   "templeTop"
]

// Set AR Stuff
let AR = {
   source: null,
   context: null,
}
setARStuff();

window.addEventListener('resize', function(){ onResize() })

//----------------------------------------------------------------------------
// Adding object to the scene
let voxels = [];
let sceneObjects = {
   teapot: null,
   cube: null,
   torus: null,
   plane: null,
}

createPlane();
await createTemple();


scene.add(sceneObjects.plane);


voxels.forEach( voxel => {
   scene.add(voxel);
})

scene.add(createSpotLight());


//createInterface();

//----------------------------------------------------------------------------
// Render the whole thing on the page
render();

function render()
{
   updateAR();      
   //animateObject();
   requestAnimationFrame(render);
   renderer.render(scene, camera) // Render scene
}

function updateAR()
{
   if(AR.source)
   {
      if( AR.source.ready === false )	return
      AR.context.update( AR.source.domElement )
      scene.visible = camera.visible   
   }
}

async function getTextures(){
    return new Promise(async (resolve) => {
         let textureLoader = new THREE.TextureLoader();
         let textures = [];
         TEXTURES_PATHS.forEach(path => {
            textures.push(textureLoader.load(path));
         })
         resolve(textures);
    })
}

function createInstancedMesh(coordinates, material, templePart){
   let geometry = new THREE.BoxGeometry(VX/FACTOR, VX/FACTOR, VX/FACTOR);
   let instancedMesh = new THREE.InstancedMesh(geometry, material, coordinates.length);

   let matrix = new THREE.Matrix4();
   coordinates.forEach((e, index) => {
      let { x, y, z } = e;
      x = x/FACTOR;
      y = y/FACTOR;
      z = z/FACTOR;
      console.log([x, y, z]);
      matrix.makeTranslation(x, y, z);
      instancedMesh.setMatrixAt(index, matrix);
   })
   instancedMesh.castShadow = true;
   //instancedMesh.receiveShadow = true;
   sceneObjects[templePart] = instancedMesh;
}

function splitTemple(array) {
   let splitted = [[], [], [], []];

   array.forEach(e => {
       const { y, x, z } = e;
       if (y === 5) {
           splitted[0].push(e);
       } else if (y > 5 && y < 55) {
           if (x >= -5 && x <= 5 && z >= -5 && z <= 5) {
               splitted[1].push(e);
           } else {
               splitted[2].push(e);
           }
       } else {
           splitted[3].push(e);
       }
   })

   return splitted;
}

function createTemple() {
    return new Promise((resolve, reject) => {
        let path = `assets/templo_divino.json`;
        fetch(path)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ao buscar o arquivo: ${response.statusText}`);
                }
                return response.text();
            })
            .then(async data => {
               let dataJson = JSON.parse(data);
               let geometry = new THREE.BoxGeometry(VX/FACTOR, VX/FACTOR, VX/FACTOR);
               let textures = await getTextures();
               let meshCoordinates = splitTemple(dataJson.map(e => e = e.pos));

               for (let i = 0; i < meshCoordinates.length; i++){
                  meshCoordinates[i] = meshCoordinates[i].map(e => e = new THREE.Vector3(e.x/FACTOR, e.y/FACTOR, e.z/FACTOR));
                  for(let coordinate of meshCoordinates[i]){
                     let material = new THREE.MeshBasicMaterial({ map: textures[i] });
                     voxels.push(new THREE.Mesh(
                        geometry,
                        material
                     ))
                     let len = voxels.length;
                     voxels[len-1].position.copy(coordinate);
                     voxels[len-1].castShadow = true;
                     voxels[len-1].receiveShadow = true;
                  }
               }
               resolve();
            })
            .catch(error => {
                console.error('Erro:', error);
                reject(error);
            });
    })
}

function animateObject()
{
   sceneObjects.torus.rotation.x += Math.PI*0.01
}

function createTeapot()
{
	var textureLoader = new THREE.TextureLoader();
	var glass  = textureLoader.load('../assets/textures/granite.png');
      glass.mapping = THREE.EquirectangularReflectionMapping; // Reflection as default
      glass.encoding = THREE.SRGBColorSpace;

	// Create the main object (teapot)
	var geometry = new TeapotGeometry(0.5);
	var material = new THREE.MeshPhongMaterial({
      color:"rgb(255,255,255)", 
      envMap:glass, 
      refractionRatio: 0.95 });
      material.side = THREE.DoubleSide;
	var obj = new THREE.Mesh(geometry, material);
	  obj.position.set(0.0, 0.5, 0.0);
   obj.visible = false;

   sceneObjects.teapot = obj;
}

function createPlane(){
   let plane = createGroundPlaneXZ(4, 4);
   plane.material.transparent = true;
   plane.material.opacity = 1;

   sceneObjects.plane = plane;

}

function createVoxel(){
   let geometry = new THREE.BoxGeometry(1, 1, 1);
   let material = new THREE.MeshBasicMaterial({ color: "red" });
   let voxel = new THREE.Mesh(geometry, material);
   voxel.castShadow = true;
   voxel.translateY(0.5);

   sceneObjects.voxel = voxel;
}

function createSpotLight(){
   let position = new THREE.Vector3(-5, 5, 0);
   let spotlightColor = 'rgb(255,255,255)';
   let spotlight = new THREE.SpotLight(spotlightColor, 10);
   spotlight.position.copy(position);
   //spotlight.angle = THREE.MathUtils.degToRad(40);
   spotlight.castShadow = true;
   //spotlight.target = sceneObjects.voxel;

   return spotlight;
}

function createCubeKnot()
{
	var geometry	= new THREE.BoxGeometry(1,1,1);
	var material	= new THREE.MeshNormalMaterial({
		transparent : true,
		opacity: 0.5,
		side: THREE.DoubleSide
	});
	var mesh	= new THREE.Mesh( geometry, material );
	mesh.position.y	= geometry.parameters.height/2

   sceneObjects.cube = mesh;

	var geometry	= new THREE.TorusKnotGeometry(0.25,0.1,64,16);
	var material	= new THREE.MeshNormalMaterial();
	var mesh	= new THREE.Mesh( geometry, material );
	mesh.position.y	= 0.5
   
   sceneObjects.torus = mesh;
}

function createInterface()
{
   // controls which object should be rendered
   var firstObject = true;

   var controls = new function ()
   {
      this.onChangeObject = function(){
      //    firstObject = !firstObject;
      //    if(firstObject) {
      //       sceneObjects.teapot.visible = false;
      //       sceneObjects.cube.visible = true;            
      //       sceneObjects.torus.visible = true;                        
      //    }
      //    else {
      //       sceneObjects.teapot.visible = true;
      //       sceneObjects.cube.visible = false;            
      //       sceneObjects.torus.visible = false;                        
      //    }
      };
   };
   // GUI interface
   var gui = new GUI();
   gui.add(controls, 'onChangeObject').name("Change Object");
}

function onResize(){
	AR.source.onResizeElement()
	AR.source.copyElementSizeTo(renderer.domElement)
	if( AR.context.arController !== null ){
		AR.source.copyElementSizeTo(AR.context.arController.canvas)
	}
}

function setARStuff()
{
   //----------------------------------------------------------------------------
   // Handle arToolkitSource
   // More info: https://ar-js-org.github.io/AR.js-Docs/marker-based/
   AR.source = new ARjs.Source({	
      // to read from a video
      sourceType : 'video',
      sourceUrl : './assets/AR/kanjiScene.mp4'

      // to read from the webcam
      //sourceType : 'webcam',
   
      // to read from an image
      // sourceType : 'image',
      // sourceUrl : '../assets/AR/kanjiScene.jpg',
   
   })
   
   AR.source.init(function onReady(){
      setTimeout(() => {
         onResize()
      }, 100);
   })
   
   //----------------------------------------------------------------------------
   // initialize arToolkitContext
   AR.context = new ARjs.Context({
      cameraParametersUrl: '../libs/AR/data/camera_para.dat',
      detectionMode: 'mono',
   })
   
   // initialize it
   AR.context.init(function onCompleted(){
      camera.projectionMatrix.copy( AR.context.getProjectionMatrix() );
   })
   
   //----------------------------------------------------------------------------
   // Create a ArMarkerControls
   let markerControls;
   markerControls = new ARjs.MarkerControls(AR.context, camera, {	
      type : 'pattern',
      patternUrl : '../libs/AR/data/patt.kanji',
      changeMatrixMode: 'cameraTransformMatrix' // as we controls the camera, set changeMatrixMode: 'cameraTransformMatrix'
   })
   // as we do changeMatrixMode: 'cameraTransformMatrix', start with invisible scene
   scene.visible = false   
}