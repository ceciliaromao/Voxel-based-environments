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
import { initRendererWithAntialias } from './renderer.js';
import { Material, Vector2, Vector3 } from '../build/three.module.js';

const VX = 10;
const SPEED = 40;
const FLY_FACTOR = .5;
const SPEED_UP_FACTOR = 2;

let mapaFolder, scene, perspective, renderer, camera, light, orbit, keyboard, newStructure, voxelColors, materialsIndex = 0, gui; // Initial variables
scene = new THREE.Scene(); 
perspective = "orbital";
scene.background = new THREE.Color(0xADD8E6);
renderer = initRendererWithAntialias();    // Init a basic renderer
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

/* Inicialização das variáveis do controle do personagem */
let forward = false, backward = false, right = false, left = false, up = false, down = false, speedUp = false;
const FPCamera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );
FPCamera.position.set(-100, 25, 175);
const FPControls = new PointerLockControls(FPCamera, renderer.domElement);
scene.add(FPControls.getObject());
const clock = new THREE.Clock();

const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');
instructions.style.display = 'none';
blocker.style.display = 'none';

instructions.addEventListener('click', function () {

    if (perspective === "firstperson") FPControls.lock();

}, false);

FPControls.addEventListener('lock', function () {
    instructions.style.display = 'none';
    blocker.style.display = 'none';
});

FPControls.addEventListener('unlock', function () {
    if (perspective === "firstperson"){
        blocker.style.display = 'block';
        instructions.style.display = '';
    }
});


const FPMovement = {
    moveForward: function (value) {
        forward = value;
    },
    moveBackward: function (value) {
        backward = value;
    },
    moveRight: function (value) {
        right = value;
    },
    moveLeft: function (value) {
        left = value;
    },
    moveUp: function (value) {
        up = value;
    },
    moveDown: function (value) {
        down = value;
    },
    speedUp: function (value) {
        speedUp = value;
    }
}
/* Fim da inicialização das variáveis do controle do personagem */

// Criando o plano para compor a cena
let groundPlane = createGroundPlaneXZ(350, 350, 40, 40); // width, height, resolutionW, resolutionH
scene.add(groundPlane);

// Corrige distorção na proporção dos objetos
window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
});

// Show axes (parameter is size of each axis)
let axesHelper = new THREE.AxesHelper(12);
scene.add(axesHelper);

let boxGeometry = new THREE.BoxGeometry(VX, VX, VX);
const map = {
    land: [],
    objects: [],
    files: [
        ['arvore-1.json', new Vector3(-110, 20, 40)],
        ['arvore-2.json', new Vector3(90, 20, 130)],
        ['arvore-1.json', new Vector3(90, 20, -90)],
        ['arvore-3.json', new Vector3(-52, 20, -40)]
    ],
    factor: 19,
    xoff: 45,
    zoff: 35,
    divisor1: -.06,
    divisor2: .23,
    create: function () {
        for (let x = this.xoff; x <= this.xoff + 35; x++) {
            let line = '|';
            for (let z = this.zoff; z <= this.zoff + 35; z++) {
                let y = noise.perlin2(x/this.factor, z/this.factor);
                let color = null;
                let colort = null;
                if (y >= -1 && y < this.divisor1) {
                    y = 1;
                    color = 0x6aa54b;
                    colort = '\x1b[32m';
                } else if (y >= this.divisor1 && y < this.divisor2) {
                    y = 2;
                    color = 0xe19134;
                    colort = '\x1b[33m';
                } else {
                    y = 3;
                    color = 0xe8e8ea;
                    colort = '\x1b[0m';
                }
                let box =  new THREE.Mesh(boxGeometry, setDefaultMaterial(color));
                box.position.set((x - this.xoff - 17) * VX - 5, y * VX - 5, (z - this.zoff - 17) * VX - 5);
                this.land.push(box);
                scene.add(box);
                // line += ` ${colort}${noise.perlin2(x/this.factor, z/this.factor).toFixed(1).toString().padStart(4, ' ')} \x1b[0m|`; // DEBUG
            }
        }
        for (let file of this.files) {
            loadFile(file[0], file[1]);
        }
    },
    addAndPlaceObject: function (object, pos) {
        this.objects.push(object);
        object.main.position.set(pos.x, pos.y, pos.z);
        scene.add(object.main);
        console.log(object);
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
        }
    }
}

function loadFile (path, pos) {
    path = `./assets/${path}`;
    console.log(path);
    fetch(path)
    .then(response => {
        if (!response.ok) {
        throw new Error(`Erro ao buscar o arquivo: ${response.statusText}`);
        }
        return response.text();
    })
    .then(data => {
        let dataJson = JSON.parse(data);
        let newObject = new THREE.Object3D();
        let listOfVoxels = []
        for (let item of dataJson) {
            let newVoxel = new Voxel(item.pos, item.material, false, true);
            listOfVoxels.push(newVoxel);
            newObject.add(newVoxel.getObject());
        }
        map.addAndPlaceObject(
            {
                main: newObject,
                voxels: listOfVoxels
            },
            pos
        )
    })
    .catch(error => {
        console.error('Erro:', error);
    });
}


// Contrói a GUI
function buildInterface() {
    gui = new GUI();

    mapaFolder = gui.addFolder("Mapa");

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

function perspectiveChange(){
    if (camera === orbitCamera){
        // ORBIT => CONTROL

        //Altera info dos controles
        const el = document.getElementById("OrbitInfoBox");
        if (el) el.remove();
        initControlInformation();
        mapaFolder.hide();

        //Altera a câmera e prende o mouse
        camera = FPCamera;
        FPControls.lock();
        perspective = "firstperson";
    } else {
        // CONTROL => ORBIT

        //Altera info dos controles
        const el = document.getElementById("ControlInfoBox");
        if (el) el.remove();
        initOrbitInformation();
        mapaFolder.show();

        //Altera a câmera e libera o mouse
        perspective = "orbital";
        camera = orbitCamera;
        FPControls.unlock();
        stopAnyMovement(); //resolve o bug de trocar de perspectiva enquanto pressiona uma tecla faz o personagem andar infinitamente
    }
}

function keyboardUpdate() {

    keyboard.update();

    // Verificação para não fazer nada se o foco estiver em um campo de entrada
    if (isFocusedOnInput()) {
        return; 
    }

    if (perspective === "orbital") {
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
    } else if (perspective === "firstperson"){ 
        if (keyboard.pressed("W")) {FPMovement.moveForward(true)};
        if (keyboard.pressed("A")) {FPMovement.moveLeft(true)};
        if (keyboard.pressed("S")) {FPMovement.moveBackward(true)};
        if (keyboard.pressed("D")) {FPMovement.moveRight(true)};
        // if (keyboard.pressed("Q")) {FPMovement.moveUp(true)};
        // if (keyboard.pressed("E")) {FPMovement.moveDown(true)};
        if (keyboard.pressed("shift")) {FPMovement.speedUp(true)};
        if (keyboard.up("W")) {FPMovement.moveForward(false)};
        if (keyboard.up("A")) {FPMovement.moveLeft(false)};
        if (keyboard.up("S")) {FPMovement.moveBackward(false)};
        if (keyboard.up("D")) {FPMovement.moveRight(false)};
        // if (keyboard.up("Q")) {FPMovement.moveUp(false)};
        // if (keyboard.up("E")) {FPMovement.moveDown(false)};
        if (keyboard.up("shift")) {FPMovement.speedUp(false)};
    }

    if (keyboard.down("C")) {perspectiveChange()};
}

function initOrbitInformation() {
    let orbitInfo = new InfoBox();
    orbitInfo.infoBox.id = "OrbitInfoBox";
    orbitInfo.add("Fator:     Q | E");
    orbitInfo.add("X Offset:  A | D");
    orbitInfo.add("Z Offset:  W | S");
    orbitInfo.add("Divisor 1: ↑ | ↓");
    orbitInfo.add("Divisor 2: ← | →");
    orbitInfo.add("Câmera:        C")
    orbitInfo.show();
    let infobox = document.getElementById('OrbitInfoBox')
    infobox.style.fontFamily = 'Courier New, monospace';
    infobox.style.whiteSpace = 'pre';
}

function initControlInformation() {
    let controlInfo = new InfoBox();
    controlInfo.infoBox.id = "ControlInfoBox";
    controlInfo.add("Movimentação: W | A | S | D");
    controlInfo.add("Voar/pousar:          Q | E");
    controlInfo.add("Correr:               SHIFT")
    controlInfo.add("Mudar de perspectiva:     C");
    controlInfo.show();
    controlInfo.infoBox.style.fontFamily = 'Courier New, monospace';
    controlInfo.infoBox.style.whiteSpace = 'pre';
}

function moveCharacter(delta){
    let speedMultiplier = speedUp? SPEED_UP_FACTOR : 1;
    if (forward) {FPControls.moveForward(SPEED * delta * speedMultiplier)}
    if (backward) {FPControls.moveForward(-SPEED * delta * speedMultiplier)}
    if (right) {FPControls.moveRight(SPEED * delta * speedMultiplier) }
    if (left) {FPControls.moveRight(-SPEED * delta * speedMultiplier)}
    if (up) {FPControls.getObject().position.y += SPEED * FLY_FACTOR * delta * speedMultiplier}
    if (down) {FPControls.getObject().position.y -= SPEED * FLY_FACTOR * delta * speedMultiplier}
}

function stopAnyMovement(){
    forward = false;
    backward = false;
    right = false;
    left = false;
    up = false;
    down = false;
    speedUp = false;
}

function render() {
    requestAnimationFrame(render);
    gui.updateDisplay();
    keyboardUpdate();
    moveCharacter(clock.getDelta());
    renderer.render(scene, camera) // Render scene
}

buildInterface();
initOrbitInformation();
map.create();
render();
