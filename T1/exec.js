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
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js'

const VX = 10;
const SPEED = 40;
const FLY_FACTOR = .5;
const SPEED_UP_FACTOR = 2;
const MAP_SIZE = 74;

let mapaFolder, scene, perspective, renderer, light, orbit, keyboard, newStructure, voxelColors, materialsIndex = 0, gui; // Initial variables
scene = new THREE.Scene();
perspective = "orbital";
scene.background = new THREE.Color(0xADD8E6); // Cor do fundo
renderer = initRendererWithAntialias();    // Inicializa renderizador com antialias
//renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enable = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
//light = initDefaultBasicLight(scene); // Create a basic light to illuminate the scene
const orbitCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
orbitCamera.position.set(150, 225, 300);
orbit = new OrbitControls(orbitCamera, renderer.domElement); // Enable mouse rotation, pan, zoom etc.
//camera = orbitCamera;
keyboard = new KeyboardState();
voxelColors = [
    'cornflowerblue',
    'khaki',
    'forestgreen',
    'forestgreen',
    'forestgreen',
    'darkolivegreen',
    'darkolivegreen',
    'darkgray',
    'gray',
    'snow'
];

// Criando o plano para compor a cena
// let groundPlane = createGroundPlaneXZ(350, 350, 40, 40); // width, height, resolutionW, resolutionH
// scene.add(groundPlane);

// Corrige distorção na proporção dos objetos
// window.addEventListener('resize', function () {
//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();

//     renderer.setSize(window.innerWidth, window.innerHeight);
//     renderer.setPixelRatio(window.devicePixelRatio);
// });

// Show axes (parameter is size of each axis)
let axesHelper = new THREE.AxesHelper(12);
scene.add(axesHelper);

let boxGeometry = new THREE.BoxGeometry(VX, VX, VX);
/**
 * Conjunto de varáveis e funções relativas ao mapa
 */
const map = {
    /**Voxels que preenchem o terreno do mapa*/
    land: [],
    /**
     * Objetos presentes no mapa.
     * 
     * Cada item possui os campos:
     * 
     * `main`: {@link THREE.Object3D} pai dos voxels presentes no objeto. Ele é usado para facilitar a criação e a movimentação do objeto no futuro.
     * 
     * `voxels`: Lista de {@link Voxel}, classe criada para representar cada voxel possuindo um Mesh e função auxiliares.
     * }
    */
    objects: [],
    /**
     * Caminho do arquivo e posição dos objetos que serão criados,
     */
    files: [
        ['arvore-1.json', new Vector3(-110, 20, 40)],
        ['arvore-2.json', new Vector3(90, 20, 130)],
        ['arvore-1.json', new Vector3(90, 20, -90)],
        ['arvore-3.json', new Vector3(-52, 20, -40)],
    ],
    // Os campos factor, xoff, zoff, divisor1, divisor2 são campos usados na calibração do ruído Perlin.
    factor: 15, // Influência da sensibilidade de mudanças por coordenada (no nosso exemplo funciona como um zoom)
    //xoff: 45, // Offset do ponto de partida em X (no nosso exemplo funciona como uma movimentação no eixo X)
    xoff: 0, //Math.random()*50,
    zoff: 0, //Math.random()*50,
    //zoff: 35, // Offset do ponto de partida em Z (no nosso exemplo funciona como uma movimentação no eixo Z)
    // Como a função retorna valores de -1 a 1, os campos abaixo indicam as divisões dos alcances que iram aparecer cada tipo de bloco (N0, N1 e N2)
    divisor1: -.06,
    divisor2: .23,
    ymultiplier: 15,
    absolute: false,
    sunxmultiplier: .2,
    sunzmultiplier: .07,
    voxelsCoordinates: [],
    collisionCoordinates: [],
    instancedMeshes: [],
    dirLight: null,
    dirLightOffset: new THREE.Vector3(10, 60, -20),
    dirLightTarget: new THREE.Object3D(),
    /**
     * Cria o mapa usando a função de ruído Perlin e carrega os arquivos (será mudado no futuro para não carregar o arquivo toda vez que rodar).
     */
    setCoordinates: async function(){
        return new Promise((resolve) => {
            let coordinates = [];
            for (let x = this.xoff; x <= this.xoff + MAP_SIZE; x++) {
                for (let z = this.zoff; z <= this.zoff + MAP_SIZE; z++) {
                    let y = Math.floor(noise.perlin2(x/this.factor, z/this.factor)*this.ymultiplier);
                    this.collisionCoordinates.push({
                        x: (x - this.xoff - MAP_SIZE/2),
                        y: y,
                        z: (z - this.zoff - MAP_SIZE/2)
                    });
                    coordinates.push({
                        x: (x - this.xoff - MAP_SIZE/2) * VX - 5, 
                        y: y * VX - 5, 
                        z: (z - this.zoff - MAP_SIZE/2) * VX - 5
                    });
                }
            }
            resolve(coordinates);
        });
    },

    create: async function () {
        return new Promise(async (resolve) => {
            this.voxelsCoordinates = await this.setCoordinates();
            this.voxelsCoordinates.sort((a,b) => a.y - b.y);
            let voxelChunks = [];
            
            let chunkSize = Math.ceil(this.voxelsCoordinates.length/voxelColors.length)
            for (let index = 0; index < voxelColors.length; index++) {
                voxelChunks.push(this.voxelsCoordinates.slice(chunkSize*index, chunkSize*(index+1)));
            }

            let miny = Math.min(...this.voxelsCoordinates.map(e=>e=e.y));

            let voxelCoordinatesComplete = [];
            for (let i = 0; i < voxelColors.length; i++){
                voxelCoordinatesComplete.push([]);
            }

            voxelChunks.forEach((chunk, index) => {
                chunk.forEach(e => {
                    for (let i = miny; i <= e.y; i++){
                        voxelCoordinatesComplete[index].push({
                            x: e.x,
                            y: i,
                            z: e.z
                        });
                    }
                });
            })

            const voxelGeo = new THREE.BoxGeometry(VX, VX, VX);
            let voxelMat;
            let instaMesh;
            let voxelMatrix;

            for (let i = 0; i < voxelColors.length; i++){
                voxelMat = new THREE.MeshLambertMaterial({ color: voxelColors[i]});
                instaMesh = new THREE.InstancedMesh(voxelGeo, voxelMat, voxelCoordinatesComplete[i].length);
                voxelMatrix = new THREE.Matrix4();
                voxelCoordinatesComplete[i].forEach((e, index) => {
                    const {x, y, z} = e;
                    voxelMatrix.makeTranslation(x, y, z);
                    instaMesh.setMatrixAt(index, voxelMatrix);
                })
                instaMesh.castShadow = true;
                instaMesh.receiveShadow = true;
                this.instancedMeshes.push(instaMesh);
                scene.add(instaMesh);
            }

            //TODO: deixar codigo legivel
            let lightTam = 200;
            this.dirLight = new THREE.DirectionalLight('lightyellow', 1.5);
            this.dirLight.position.copy(this.dirLightOffset);
            this.dirLight.castShadow = true;
            this.dirLight.shadow.mapSize.width = 512;
            this.dirLight.shadow.mapSize.height = 512;
            this.dirLight.shadow.camera.near = .1;
            this.dirLight.shadow.camera.far = 2000;
            this.dirLight.shadow.camera.left = -lightTam;
            this.dirLight.shadow.camera.right = lightTam;
            this.dirLight.shadow.camera.bottom = -lightTam;
            this.dirLight.shadow.camera.top = lightTam;
            //this.dirLight.target = this.dirLightTarget;
            scene.add(this.dirLightTarget);
            scene.add(this.dirLight);

            let ambiLight = new THREE.AmbientLight('white', 0.8);
            scene.add(ambiLight);

            //TODO: criar um pinheiro e uma vitória régia e escolher a arvore de acordo com o y
            let threeQuantity = Math.floor(((MAP_SIZE/10)*(MAP_SIZE/10)));
            let threePos = [];
            for (let i = 0; i < threeQuantity; i++){ 
                let coordinate;
                do { coordinate = this.voxelsCoordinates[Math.floor(Math.random()*this.voxelsCoordinates.length)]; }
                while (!!threePos.find(e=>Math.abs(e.x-coordinate.x) < VX || Math.abs(e.z-coordinate.z) < VX));
                threePos.push(coordinate);
            }
            threePos.forEach(pos => loadFile(this.files[0][0], new THREE.Vector3(pos.x - 5, pos.y + 5, pos.z - 5)));
            resolve(true);
        });
    },

    setVoxelOnScene: function (position, color){
        let box =  new THREE.Mesh(boxGeometry, new THREE.MeshLambertMaterial({
            color: color
        }));
        box.castShadow = true;
        box.receiveShadow = true;
        box.position.set(position.x, position.y, position.z);
        this.land.push(box);
        scene.add(box);
    },
    /**
     * Função auxiliar para adicionar um objeto na lista de objetos e posicionar na cena.
     * @param {*} object 
     * @param {*} pos 
     */
    addAndPlaceObject: function (object, pos) {
        this.objects.push(object);
        object.main.position.set(pos.x, pos.y, pos.z);
        scene.add(object.main);
        //console.log(object);
    },
    /**
     * Limpa a cena.
     */
    clear: function () {
        for (let box in this.land) {
            scene.remove(this.land[box]);
        }
        this.land = [];
        for (let object of this.objects) {
            scene.remove(object.main);
        }
        this.objects = [];
    },
    /**
     * Função auxiliar para recriar a cena.
     */
    clearAndCreate: function () {
        this.clear();
        this.create();
    }
}

const player = {
    object: null,
    scale: new THREE.Vector3(VX/2, VX/2, VX/2),
    walkAction: null,
    yvelocity: 0,

    loadPlayer: function() {
        return new Promise((resolve) => {
            let loader = new GLTFLoader();
            loader.load(
                './assets/steve.glb',
                (gltf) => {
                    let obj = gltf.scene;
                    obj.traverse((child) => {
                        if (child) {
                            child.castShadow = true;
                        }
                    });
                    this.object = obj;
                    this.object.scale.copy(this.scale);
                    scene.add(this.object);

                    /* ANIMAÇAO */
                    let localMixer = new THREE.AnimationMixer(this.object);
                    console.log(gltf.animations);
                    localMixer.clipAction(gltf.animations[0]).play();
                    this.walkAction = localMixer;
                    resolve();
                null, 
                null
            });
        });
    },

    initPlayer: function() {
        return this.loadPlayer();
    },

    setPlayerPosition: function(pos) {
        this.object.position.copy(pos)
    }
};

/**
 * Função que carrega os arquivos e chama função para adicionar na cena.
 * @param {*} path 
 * @param {*} pos 
 */
function loadFile (path, pos) {
    path = `./assets/${path}`;
    //console.log(path);
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

const fogControls = {
    near: 50,
    far: 350,
    changeFog: function(){
        scene.fog = new THREE.Fog('darkgray', this.near, this.far)
    },
}

// Contrói a GUI
function buildInterface() {
    gui = new GUI();
    let fogFolder = gui.addFolder("Fog");
    fogFolder.add(fogControls, "near", 0, 1000).name("Início").onChange(() => fogControls.changeFog());
    fogFolder.add(fogControls, "far", 0, 1000).name("Fim").onChange(() => fogControls.changeFog());

    // gui = new GUI();

    // mapaFolder = gui.addFolder("Mapa");

    // mapaFolder.open();
    // mapaFolder.add(map, 'factor').name('Fator').onChange(() => map.clearAndCreate());
    // mapaFolder.add(map, 'xoff').name('XOff').onChange(() => map.clearAndCreate());
    // mapaFolder.add(map, 'zoff').name('ZOff').onChange(() => map.clearAndCreate());
    // mapaFolder.add(map, 'divisor1', -1, 1).name('Divisor 1').onChange(() => map.clearAndCreate());
    // mapaFolder.add(map, 'divisor2', -1, 1).name('Divisor 2').onChange(() => map.clearAndCreate());
    // mapaFolder.add(map, 'create').name("Criar");
    // mapaFolder.add(map, 'clear').name("Limpar");
}

/**
 * Verifica se o foco está em algum campo de texto.
 * @returns 
 */
function isFocusedOnInput() {
    return document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
}

/**
 * Muda entre as cameras.
 */
// function perspectiveChange(){
//     if (camera === orbitCamera){
//         // ORBIT => CONTROL

//         //Altera info dos controles
//         const el = document.getElementById("OrbitInfoBox");
//         if (el) el.remove();
//         initControlInformation();
//         mapaFolder.hide();

//         //Altera a câmera e prende o mouse
//         camera = FPCamera;
//         FPControls.lock();
//         perspective = "firstperson";
//     } else {
//         // CONTROL => ORBIT

//         //Altera info dos controles
//         const el = document.getElementById("ControlInfoBox");
//         if (el) el.remove();
//         initOrbitInformation();
//         mapaFolder.show();

//         //Altera a câmera e libera o mouse
//         perspective = "orbital";
//         camera = orbitCamera;
//         FPControls.unlock();
//         stopAnyMovement(); //resolve o bug de trocar de perspectiva enquanto pressiona uma tecla faz o personagem andar infinitamente
//     }
// }

/**
 * Função auxiliar para verificação do teclado.
 * @returns 
 */
function keyboardUpdate() {

    keyboard.update();

    // Verificação para não fazer nada se o foco estiver em um campo de entrada
    // if (isFocusedOnInput()) {
    //     return; 
    // }

    // if (perspective === "orbital") {
        // if (keyboard.pressed("Q")) {map.factor++; map.clearAndCreate()};
        // if (keyboard.pressed("E")) {map.factor--; map.clearAndCreate()};
        // if (keyboard.pressed("up")) {map.divisor1 += 0.01; map.clearAndCreate()};
        // if (keyboard.pressed("down")) {map.divisor1 -= 0.01; map.clearAndCreate()};
        // if (keyboard.pressed("right")) {map.divisor2 += 0.01; map.clearAndCreate()};
        // if (keyboard.pressed("left")) {map.divisor2 -= 0.01; map.clearAndCreate()};
        // if (keyboard.pressed("S") ) {map.zoff++; map.clearAndCreate()};
        // if (keyboard.pressed("W") ) {map.zoff--; map.clearAndCreate()};
        // if (keyboard.pressed("D") ) {map.xoff++; map.clearAndCreate()};
        // if (keyboard.pressed("A") ) {map.xoff--; map.clearAndCreate()};
    // } else if (perspective === "firstperson"){ 
    //     if (keyboard.pressed("W")) {FPMovement.moveForward(true)};
    //     if (keyboard.pressed("A")) {FPMovement.moveLeft(true)};
    //     if (keyboard.pressed("S")) {FPMovement.moveBackward(true)};
    //     if (keyboard.pressed("D")) {FPMovement.moveRight(true)};
    //     if (keyboard.pressed("Q")) {FPMovement.moveUp(true)};
    //     if (keyboard.pressed("E")) {FPMovement.moveDown(true)};
    //     if (keyboard.pressed("shift")) {FPMovement.speedUp(true)};
    //     if (keyboard.up("W")) {FPMovement.moveForward(false)};
    //     if (keyboard.up("A")) {FPMovement.moveLeft(false)};
    //     if (keyboard.up("S")) {FPMovement.moveBackward(false)};
    //     if (keyboard.up("D")) {FPMovement.moveRight(false)};
    //     if (keyboard.up("Q")) {FPMovement.moveUp(false)};
    //     if (keyboard.up("E")) {FPMovement.moveDown(false)};
    //     if (keyboard.up("shift")) {FPMovement.speedUp(false)};
    // }
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
    // controlInfo.add("Voar/pousar:          Q | E");
    controlInfo.add("Correr:               SHIFT")
    controlInfo.add("Mudar de perspectiva:     C");
    controlInfo.show();
    controlInfo.infoBox.style.fontFamily = 'Courier New, monospace';
    controlInfo.infoBox.style.whiteSpace = 'pre';
}




/**
 * Para completamente o personagem.
 */
function stopAnyMovement(){
    forwardPressed = false;
    backwardPressed = false;
    leftPressed = false;
    rightPressed = false;
}

const clock = new THREE.Clock();
// function animateCharacter(){
//     var delta = clock.getDelta();
//     if (isPlayerMoving()){
//         player.walkAction.paused = false;
//         player.walkAction.update(delta);
//     } else { //TODO Resetar para um frame específico
//         player.walkAction.paused = true;
//         player.walkAction.time = 1.0;
//         player.walkAction.update(0);
//     }
// }

// function isOnTheGround() {
//     const playerPosition = player.object.position;
//     const raycaster = new THREE.Raycaster(playerPosition, new THREE.Vector3(0, -1, 0), 0, VX);

//     for (let i = 0; i < map.instancedMeshes.length; i++){
//         const intersects = raycaster.intersectObject(map.instancedMeshes[i]);

//         if (intersects.length > 1) return true;
//     }

//     return false;
// }

// function applyGravityOnPlayer(){
//     if (!isOnTheGround()) {
//         if (player.yvelocity > -5){
//             player.yvelocity -= .2;
//         }
//     } else {
//         player.yvelocity = 0;
//     }
//     player.object.translateY(player.yvelocity);
// }

/* INICIO DA COLISAO */


let occupiedVoxels = new Set();

function addVoxelToSet(x, y, z) {
    let gridX = Math.round(x);
    let gridY = Math.round(y);
    let gridZ = Math.round(z);
    occupiedVoxels.add(`${gridX},${gridY},${gridZ}`)
}

function isOnGround(player){
    let center = getPlayerCollisionPosition(player)

    let gridX = Math.round(center.x / 10);
    if (gridX === 0) gridX = 0;
    let gridY = Math.round(center.y / 10) - 1;
    if (gridY === 0) gridY = 0;
    let gridZ = Math.round(center.z / 10);
    if (gridZ === 0) gridZ = 0;

    return occupiedVoxels.has(`${gridX},${gridY},${gridZ}`);
}

function isColliding(player, direction){
    let center = getPlayerCollisionPosition(player);

    let gridX = Math.round((center.x + direction.x * 5) / 10);
    if (gridX === 0) gridX = 0;
    let gridY = Math.round(center.y / 10);
    if (gridY === 0) gridY = 0;
    let gridZ = Math.round((center.z + direction.z * 5) / 10);
    if (gridZ === 0) gridZ = 0;

    return occupiedVoxels.has(`${gridX},${gridY},${gridZ}`);
}

function getPlayerCollisionPosition(player){
    const collisionBox = new THREE.Box3().setFromObject(player);
    const center = new THREE.Vector3();
    collisionBox.getCenter(center);
    return center;
}


/* FIM DA COLISAO */

function isPlayerMoving(){
    return forwardPressed || leftPressed || backwardPressed || rightPressed;
}

function animateCharacter(delta){
    if (isPlayerMoving() || !isOnGround(player.object)){
        player.walkAction.update(delta);
    }
}

let orientation = -1;
let forwardPressed = false;
let leftPressed = false;
let backwardPressed = false;
let rightPressed = false;
//let isOnGround = false;
let TPCamera;
let pVelocity = new THREE.Vector3();
let orbControls;
let gravity = -200;
let auxVector = new THREE.Vector3();
let playerMoveSpeed = 100;

/* FPS COUNTER */
let frameCount = 0;
let lastTime = performance.now();
let currentFps;
let fps = 0;

const fpsDisplay = document.createElement('div');
fpsDisplay.style.position = 'absolute';
fpsDisplay.style.top = '10px';
fpsDisplay.style.left = '10px';
fpsDisplay.style.color = 'white';
fpsDisplay.style.fontSize = '16px';
document.body.appendChild(fpsDisplay);

function updateFps(){
    frameCount++;
    let currentTime = performance.now();
    let deltaTime = (currentTime - lastTime) / 1000;
    if (deltaTime >= 1){
        fps = frameCount / deltaTime;
        frameCount = 0;
        lastTime = currentTime;
    }
}

function updateFpsDisplay(){
    updateFps();
    fpsDisplay.textContent = `FPS: ${fps.toFixed(2)}`;
}

function initiateScene() {
    TPCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Place the TPCamera behind and above the player at the start
    const initialOffset = new THREE.Vector3(0, 10, -35);
    TPCamera.position.copy(player.object.position).add(initialOffset);
    TPCamera.lookAt(player.object.position); // Ensure it's looking at the player

    window.camera = TPCamera;
    orbControls = new OrbitControls(TPCamera, renderer.domElement);

    // Set the camera target correctly
    orbControls.target.copy(player.object.position);
    
    // Set OrbitControls limits to prevent flipping
    orbControls.maxPolarAngle = Math.PI / 1.5;
    orbControls.minPolarAngle = 0.1; // Prevents it from going fully upside downwda
    orbControls.minDistance = 20;
    orbControls.maxDistance = 60;
    orbControls.distance = 40;

    orbControls.update();

    window.addEventListener( 'keydown', (event) => {
        switch(event.code){
            case 'KeyW': forwardPressed = true; break;
            case 'ArrowUp': forwardPressed = true; break;
            case 'KeyA': leftPressed = true; break;
            case 'ArrowLeft': leftPressed = true; break;
            case 'KeyS': backwardPressed = true; break;
            case 'ArrowDown': backwardPressed = true; break;
            case 'KeyD': rightPressed = true; break;
            case 'ArrowRight': rightPressed = true; break;
            case 'KeyQ': stopAnyMovement(); break;
            case 'KeyY': invertY(); break;
            case 'KeyC': changePerpective(); break;
            case 'KeyH': setShadowHelperDisplay(); break;
            case 'Space': jump(); break;
        }
    });

    window.addEventListener( 'keyup', (event) => {
        switch(event.code){
            case 'KeyW': forwardPressed = false; break;
            case 'ArrowUp': forwardPressed = false; break;
            case 'KeyA': leftPressed = false; break;
            case 'ArrowLeft': leftPressed = false; break;
            case 'KeyS': backwardPressed = false; break;
            case 'ArrowDown': backwardPressed = false; break;
            case 'KeyD': rightPressed = false; break;
            case 'ArrowRight': rightPressed = false; break;
        }
    });

    window.addEventListener('mousedown', (event) => {
        if (event.button === 2) {
            jump();
        }
      });
}

function invertY() {
    //TODO
}


function jump(){
    if (isOnGround(player.object)){
        player.object.translateY(3)
        player.yvelocity = 1; 
    }
}

function updatePlayer(delta){

    if (!isOnGround(player.object)) {
        if (player.yvelocity > -5){
            player.yvelocity -= .02;
        }
    } else {
        player.yvelocity = 0;
    }
    player.object.translateY(player.yvelocity);

    const oldPosition = player.object.position.clone();

    //player.object.position.addScaledVector(pVelocity, delta);

    let camAngle = orbControls.getAzimuthalAngle();

    if (forwardPressed){
        auxVector.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), camAngle);
        if (!isColliding(player.object, auxVector)){
            player.object.position.addScaledVector(auxVector, playerMoveSpeed * delta);
        }
    }

    if (backwardPressed){
        auxVector.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), camAngle);
        if (!isColliding(player.object, auxVector)){
            player.object.position.addScaledVector(auxVector, playerMoveSpeed * delta);
        }
    }

    if (leftPressed){
        auxVector.set(-1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), camAngle);
        if (!isColliding(player.object, auxVector)){
            player.object.position.addScaledVector(auxVector, playerMoveSpeed * delta);
        }
    }

    if (rightPressed){
        auxVector.set(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), camAngle);
        if (!isColliding(player.object, auxVector)){
            player.object.position.addScaledVector(auxVector, playerMoveSpeed * delta);
        }
    }

    const direction = player.object.position.clone().sub(oldPosition).normalize();

    // If there's movement, update the rotation to face the direction
    if (direction.length() > 0) {
        const targetRotation = Math.atan2(direction.x, direction.z); // Get the rotation around Y axis

        // Smooth rotation using THREE.MathUtils.lerp
        const rotationSpeed = 25 * delta; // Adjust for smoothness (higher = faster rotation)
        
        // Handle angle wrapping to avoid abrupt jumps
        let currentRotation = player.object.rotation.y;
        let newRotation = THREE.MathUtils.lerp(currentRotation, targetRotation, rotationSpeed);

        // Ensure the rotation interpolates correctly across the -π to π boundary
        if (Math.abs(targetRotation - currentRotation) > Math.PI) {
            if (targetRotation > currentRotation) {
                newRotation += Math.PI * 2;
            } else {
                newRotation -= Math.PI * 2;
            }
            newRotation = THREE.MathUtils.lerp(currentRotation, newRotation, rotationSpeed);
        }

        player.object.rotation.y = newRotation;
    }

    player.object.updateMatrixWorld();

    TPCamera.position.sub(orbControls.target);
    orbControls.target.copy(player.object.position);
    TPCamera.position.add(player.object.position);
}

function updateDirLight(){
    map.dirLight.position.copy(player.object.position).add(map.dirLightOffset);
    //map.dirLightTarget.position.copy(player.object.position.clone());
}

let prevDir = new THREE.Vector3();
function checkLightDirection(){
    const dir = new THREE.Vector3().subVectors(map.dirLight.target.position, player.object.position).normalize();
    console.log([map.dirLight.target.position, player.object.position]);

    if (!dir.equals(prevDir)){
        console.log("diferente...")
        prevDir.copy(dir);
    }


}

let camPerspective = "thirdperson";
let camera;
function changePerpective(){
    console.log(camPerspective)
    if (camPerspective === "thirdperson"){
        camPerspective = "orbital";
        camera = orbitCamera;
    } else {
        camPerspective = "thirdperson";
        camera = TPCamera;
    }
}

function animate(){
    const delta = Math.min(clock.getDelta(), 0.1);
    animateCharacter(delta);
    requestAnimationFrame(animate);
    keyboardUpdate();
    updatePlayer(delta/5);
    updateDirLight();
    //checkLightDirection();
    orbControls.update();
    updateFpsDisplay();
    //console.log(map.dirLight.position);
    renderer.render(scene, camera);
}

async function init() {
    buildInterface();
    //initOrbitInformation();
    await map.create();
    //let y = map.voxelsCoordinates.find(e => (e.x < VX/2 && e.x > -VX/2) && (e.z < VX/2 && e.z > -VX/2)).y + 14;
    player.initPlayer().then(() => {
        player.setPlayerPosition(new THREE.Vector3(
            0,
            60, //y
            0
        ));
        // player.object.rotateY(THREE.MathUtils.degToRad(180));
        // player.object.rotateX(THREE.MathUtils.degToRad(180));
        initiateScene();
        //console.log(map.collisionCoordinates);

        /*COLISAO*/
        map.collisionCoordinates.forEach(e => {
            addVoxelToSet(e.x, e.y, e.z);
        })
        //console.log(occupiedVoxels);

        /* */
        scene.fog = new THREE.Fog('darkgray', 50, 350)
        //player.object.add(map.dirLightTarget);
        map.dirLight.target = player.object;
        camera = TPCamera;
        animate();
    });
}


init();



/* TODO
Prioritário:
- Colisão nas árvores;
- Inversão eixo Y;
- Adicionar outros tipos de árvore já criadas;
- Voltar com geração prodecedural;
- Adequar tamanho da sombra de acordo com o fog;

Não-prioritário:
- Arrumar o código;
- Melhorar a colisão;
- Fix nas sombras se mexendo;
- Criar árvore pra água e pra montanha;
- Fix na gambiarra do jump;
*/