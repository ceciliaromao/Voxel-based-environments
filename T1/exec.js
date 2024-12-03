import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import {PointerLockControls} from '../build/jsm/controls/PointerLockControls.js';
import {
    initRenderer,
    initCamera,
    initDefaultBasicLight,
    setDefaultMaterial,
    InfoBox,
    onWindowResize,
    createGroundPlaneXZ
} from "../libs/util/util.js";
import KeyboardState from '../libs/util/KeyboardState.js';
import GUI from '../libs/util/dat.gui.module.js'
import Voxel, { MATERIALS } from './voxel.js'
import { Material, Vector2, Vector3 } from '../build/three.module.js';

const VX = 10;
const SPEED = 2;
const FLY_FACTOR = .5;

let scene, renderer, camera, light, orbit, keyboard, newStructure, voxelColors, materialsIndex = 0, gui; // Initial variables
scene = new THREE.Scene();    // Create main scene
renderer = initRenderer();    // Init a basic renderer
light = initDefaultBasicLight(scene); // Create a basic light to illuminate the scene
const orbitCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
orbitCamera.position.set(150, 225, 300);
orbit = new OrbitControls(orbitCamera, renderer.domElement); // Enable mouse rotation, pan, zoom etc.
camera = orbitCamera;
keyboard = new KeyboardState();
voxelColors = [
  'greenyellow',
  'darkgoldenrod',
  'darkgreen'
]

/* CONSTRUCAO CAMERA PRIMEIRA PESSOA  <<<< EM CONSTRUÇÃO !!!! >>>>>
 TODO: 
    1. adicionar delta (clock) para o cálculo da movimentação ser mais legível
    2. alterar a informação de controle ao mudar de camera
    3. retirar os eventos de click do mouse
*/

const FPCamera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );
FPCamera.position.set(0, 50, 0);
const FPControls = new PointerLockControls(FPCamera, renderer.domElement);
const FPMovement = {
    moveForward: function () {
        FPControls.moveForward(SPEED)
    },
    moveBackward: function () {
        FPControls.moveForward(-SPEED)
    },
    moveRight: function () {
        FPControls.moveRight(SPEED)
    },
    moveLeft: function () {
        FPControls.moveRight(-SPEED)
    },
    moveUp: function () {
        FPControls.getObject().position.y += SPEED * FLY_FACTOR;
    },
    moveDown: function () {
        FPControls.getObject().position.y -= SPEED * FLY_FACTOR;
    }
}

scene.add(FPControls.getObject());

/* FIM CONSTRUCAO CAMERA PRIMEIRA PESSOA */

// let { materials, lineMaterials } = initMaterials(voxelColors);

// Criando o plano para compor a cena
let groundPlane = createGroundPlaneXZ(350, 350, 40, 40); // width, height, resolutionW, resolutionH
scene.add(groundPlane);

// Listen window size changes
window.addEventListener('resize', function () { onWindowResize(camera, renderer) }, false);

// Show axes (parameter is size of each axis)
let axesHelper = new THREE.AxesHelper(12);
scene.add(axesHelper);


let boxGeometry = new THREE.BoxGeometry(VX, VX, VX);
const map = {
    land: [],
    factor: 12,
    xoff: 0,
    zoff: 0,
    divisor1: -.1,
    divisor2: .5,
    create: function () {
        for (let x = this.xoff; x <= this.xoff + 35; x++) {
            let line = '|';
            for (let z = this.zoff; z <= this.zoff + 35; z++) {
                let y = noise.perlin2(x/this.factor, z/this.factor);
                let color = null;
                let colort = null;
                if (y >= -1 && y < this.divisor1) {
                    y = 1;
                    color = 'lightgreen';
                    colort = '\x1b[32m';
                } else if (y >= this.divisor1 && y < this.divisor2) {
                    y = 2;
                    color = 'darkorange';
                    colort = '\x1b[33m';
                } else {
                    y = 3;
                    color = 'chocolate';
                    colort = '\x1b[0m';
                }
                let box =  new THREE.Mesh(boxGeometry, setDefaultMaterial(color));
                box.position.set((x - this.xoff - 17) * VX - 5, y * VX - 5, (z - this.zoff - 17) * VX - 5);
                this.land.push(box);
                scene.add(box);
                line += ` ${colort}${noise.perlin2(x/this.factor, z/this.factor).toFixed(1).toString().padStart(4, ' ')} \x1b[0m|`;
            }
            console.log(line);
        }
    },
    clear: function () {
        for (let box in this.land) {
            scene.remove(this.land[box]);
        }
        this.land = [];
    },
    clearAndCreate: function () {
        this.clear();
        this.create();
    },
    printNoise: function () {
        for (let x = 1; x <= 35; x++) {
            let line = '|';
            for (let z = 1; z <= 35; z++) {
                line += ` ${noise.perlin2(x/this.factor, z/this.factor)} |`;
            }
            console.log(line);
        }
    }
}


// Contrói a GUI
function buildInterface() {
    gui = new GUI();
    
    let mapaFolder = gui.addFolder("Mapa");
    mapaFolder.open();
    mapaFolder.add(map, 'factor').name('Fator').onChange(() => map.clearAndCreate());
    mapaFolder.add(map, 'xoff').name('XOff').onChange(() => map.clearAndCreate());
    mapaFolder.add(map, 'zoff').name('ZOff').onChange(() => map.clearAndCreate());
    mapaFolder.add(map, 'divisor1', -1, 1).name('Divisor 1').onChange(() => map.clearAndCreate());
    mapaFolder.add(map, 'divisor2', -1, 1).name('Divisor 2').onChange(() => map.clearAndCreate());
    mapaFolder.add(map, 'create').name("Criar");
    mapaFolder.add(map, 'clear').name("Limpar");
}

function isFocusedOnInput() {
    return document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
}

function perspectiveChange(){ //AQUI DEVERÁ SER REALIZADA A LÓGICA DE TROCA DE GUI
    if (camera === orbitCamera){
        // document.getElementById('InfoxBox').innerHTML = "";
        // initControlInformation(controlInfo);
        camera = FPCamera;
        FPControls.lock();
    } else {
        // document.getElementById('InfoxBox').remove();
        // let orbitInfo = new InfoBox();
        // initOrbitInformation(orbitInfo);
        camera = orbitCamera;
        FPControls.unlock();
    }
}

function keyboardUpdate() {

    keyboard.update();

    // Verificação para não fazer nada se o foco estiver em um campo de entrada
    if (isFocusedOnInput()) {
        return; 
    }

    if (!FPControls.isLocked) {
        if (keyboard.pressed("Q")) {map.factor++; map.clear(); map.create();};
        if (keyboard.pressed("E")) {map.factor--; map.clear(); map.create();};
        if (keyboard.pressed("up")) {map.divisor1 += 0.01; map.clear(); map.create();};
        if (keyboard.pressed("down")) {map.divisor1 -= 0.01; map.clear(); map.create();};
        if (keyboard.pressed("right")) {map.divisor2 += 0.01; map.clear(); map.create();};
        if (keyboard.pressed("left")) {map.divisor2 -= 0.01; map.clear(); map.create();};
        if (keyboard.pressed("S") ) {map.zoff++; map.clear(); map.create();};
        if (keyboard.pressed("W") ) {map.zoff--; map.clear(); map.create();};
        if (keyboard.pressed("D") ) {map.xoff++; map.clear(); map.create();};
        if (keyboard.pressed("A") ) {map.xoff--; map.clear(); map.create();};
    } else { 
        if (keyboard.pressed("W")) {FPMovement.moveForward()};
        if (keyboard.pressed("A")) {FPMovement.moveLeft(-SPEED)};
        if (keyboard.pressed("S")) {FPMovement.moveBackward(-SPEED)};
        if (keyboard.pressed("D")) {FPMovement.moveRight(SPEED)};
        if (keyboard.pressed("Q")) {FPMovement.moveUp(SPEED)};
        if (keyboard.pressed("E")) {FPMovement.moveDown(-SPEED)};
    }

    if (keyboard.down("C")) {perspectiveChange()};
}

function initOrbitInformation() {
    let orbitInfo = new InfoBox();
    orbitInfo.add("Fator:     Q | E");
    orbitInfo.add("X Offset:  A | D");
    orbitInfo.add("Z Offset:  W | S");
    orbitInfo.add("Divisor 1: ↑ | ↓");
    orbitInfo.add("Divisor 2: ← | →");
    orbitInfo.add("Câmera:        C")
    orbitInfo.show();
    let infobox = document.getElementById('InfoxBox')
    infobox.style.fontFamily = 'Courier New, monospace';
    infobox.style.whiteSpace = 'pre';
}

// function initControlInformation(controlInfo) {
//     controlInfo.add("Movimentação:       WASD");
//     controlInfo.add("Voar/pousar:          QE");
//     controlInfo.add("Mudar de perspectiva:  C");
//     let infobox = document.getElementById('InfoxBox')
//     infobox.style.fontFamily = 'Courier New, monospace';
//     infobox.style.whiteSpace = 'pre';
// }

function render() {
    requestAnimationFrame(render);
    gui.updateDisplay();
    keyboardUpdate();
    renderer.render(scene, camera) // Render scene
}

buildInterface();
initOrbitInformation();
render();
