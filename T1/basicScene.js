import * as THREE from  'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import {initRenderer, 
        initCamera,
        initDefaultBasicLight,
        setDefaultMaterial,
        InfoBox,
        onWindowResize,
        createGroundPlaneXZ} from "../libs/util/util.js";
import KeyboardState from '../libs/util/KeyboardState.js';
import GUI from '../libs/util/dat.gui.module.js'
import Voxel from './voxel.js'
import { Material } from '../build/three.module.js';

const VX = 10;

let scene, renderer, camera, material, light, orbit, keyboard, newStructure; // Initial variables
scene = new THREE.Scene();    // Create main scene
renderer = initRenderer();    // Init a basic renderer
//camera = initCamera(new THREE.Vector3(0, 15, 30)); // Init camera in this position
material = setDefaultMaterial(); // create a basic material
light = initDefaultBasicLight(scene); // Create a basic light to illuminate the scene
let myCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
myCamera.position.set(50, 75, 100);
orbit = new OrbitControls( myCamera, renderer.domElement ); // Enable mouse rotation, pan, zoom etc.
keyboard = new KeyboardState();


let myMaterial = setDefaultMaterial();
let myVoxel = new Voxel({x: 0, y: 0, z: 0}, myMaterial, true);
myVoxel.changeSize(1.05);
myVoxel.place(scene);

myVoxel.getObject().add(myCamera);

// Listen window size changes
window.addEventListener( 'resize', function(){onWindowResize(myCamera, renderer)}, false );

// Show axes (parameter is size of each axis)
let axesHelper = new THREE.AxesHelper( 12 );
scene.add( axesHelper );

let data = {
  x: 10,
  y: 35,
  z: 60
};

const grid = {
  array: [], // Array com as camadas do grid
  opacity: 0.3, // Opacidade das camadas
  buildGrid: function() // Criação do grid
  {
    this.array = []; // Reseta o array (Caso necessário)
    for (let i = 0; i < 10; i++){
      let grid = new THREE.GridHelper(10 * VX, VX);
      grid.translateY(i * VX);
      if (i !== 0){
        grid.material.transparent = true;
        grid.material.opacity = this.opacity;
      }
      this.array.push(grid);
      scene.add(grid);
    }
  },
  updateGrid: function() // Atualiza a opacidade das camadas do grid
  {
    this.array.forEach((gridLayer) => {gridLayer.material.opacity = this.opacity})
  }
}

grid.buildGrid();
buildInterface();
showInformation();
render();

function render()
{
  updateCamera(myCamera, myVoxel.getObject())
  requestAnimationFrame(render);
  keyboardUpdate();
  renderer.render(scene, myCamera) // Render scene
}

function keyboardUpdate() {

  keyboard.update();
  if (keyboard.down("P")) saveStructure(data, "arqTeste"); 
  if (keyboard.down("I")) newStructure = loadStructure();
  if (keyboard.down("U")) showNewStructure(newStructure);
  if (keyboard.down("D")) myVoxel.pushOnX();
  if (keyboard.down("A")) myVoxel.pullOnX();
}

function showInformation()
{
  var controls = new InfoBox();
  controls.add("Use P para salvar, I para carregar e U para mostrar objeto carregado");
  controls.show();
}

// Contrói a GUI
function buildInterface()
{     
  let gui = new GUI();
  let folder = gui.addFolder("Grid");
    folder.open();
    folder.add(grid, 'opacity', 0, 1).onChange(function () {grid.updateGrid();});
}


function saveStructure(data, defaultFilename = "data.json"){
  const blob =  new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = defaultFilename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function loadStructure(){
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".json";

  fileInput.onchange = () => {
    const file = fileInput.files[0];
    if (!file){
      console.error("Nenhum arquivo selecionado.");
      return;
    }

    const fileUrl = URL.createObjectURL(file);

    fetch(fileUrl)
      .then((response) => {
        if (!response.ok){
          throw new Error(`Não foi possível abrir arquivo: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Loaded object: ", data);
      })
      .catch((error) => {
        console.error("Error loading file: ", error);
      })
      .finally(() => {
        URL.revokeObjectURL(fileUrl);
      });
  }

  fileInput.click();
  return data;
}

function showNewStructure(structure){
  if (!structure){
    console.log("Nenhuma estrutura carregda.")
  } else {
    console.log(structure);
  }
}

function getPosition(pos){
  return new THREE.Vector3(pos.x*VX + VX/2, pos.y*VX + VX/2, pos.z*VX + VX/2);
}

function updateCamera(camera, object){
  camera.lookAt(object.position);
}

// function colocaVoxel(){

//   posicao = pegaPosicaoDoHighlight();

//   if(!checaPosicao(posicao)) return;

//   new voxel.posicao = posicao;
//   scene.add(voxel);
//   minhaMatrix3d[pos.x][pos.y][pos.z] = voxel;

// }

// function checaPosicao(posicao){


// }

// let minhaMatrix3d = [[[]]];

// for (let i = 0; i < 10; i++){
//   for (let j = 0; j < 10; i++){
//     for (let k = 0; k < 10; i++){
//       minhaMatrix3d[i][j][k] = null;
//     }
//   }
// }

// {
//   pos: {x: 1, y: 1, z: 1},
//   existe: true,
//   material: material
// }