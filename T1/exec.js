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
const MAP_SIZE = 75;

let mapaFolder, scene, perspective, renderer, camera, light, orbit, keyboard, newStructure, voxelColors, materialsIndex = 0, gui; // Initial variables
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
camera = orbitCamera;
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


/* Inicialização das variáveis do controle do personagem */
let forward = false, backward = false, right = false, left = false, up = false, down = false, speedUp = false;
const FPCamera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 600 );
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
// let groundPlane = createGroundPlaneXZ(350, 350, 40, 40); // width, height, resolutionW, resolutionH
// scene.add(groundPlane);

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
    xoff: Math.random()*50,
    zoff: Math.random()*50,
    //zoff: 35, // Offset do ponto de partida em Z (no nosso exemplo funciona como uma movimentação no eixo Z)
    // Como a função retorna valores de -1 a 1, os campos abaixo indicam as divisões dos alcances que iram aparecer cada tipo de bloco (N0, N1 e N2)
    divisor1: -.06,
    divisor2: .23,
    ymultiplier: 15,
    absolute: false,
    sunxmultiplier: .2,
    sunzmultiplier: .07,
    /**
     * Cria o mapa usando a função de ruído Perlin e carrega os arquivos (será mudado no futuro para não carregar o arquivo toda vez que rodar).
     */
    create: function () {
        let voxelsCoordinates = [];
        for (let x = this.xoff; x <= this.xoff + MAP_SIZE; x++) {
            let line = '|';
            for (let z = this.zoff; z <= this.zoff + MAP_SIZE; z++) {
                //let y = Math.floor(Math.abs(noise.perlin2(x/this.factor, z/this.factor))*this.ymultiplier);
                let y = Math.floor(noise.perlin2(x/this.factor, z/this.factor)*this.ymultiplier);
                voxelsCoordinates.push({
                    x: (x - this.xoff - MAP_SIZE/2) * VX - 5, 
                    y: y * VX - 5, 
                    z: (z - this.zoff - MAP_SIZE/2) * VX - 5
                });
            }
        }

        voxelsCoordinates.sort((a,b) => a.y - b.y);
        let voxelChunks = [];
        let chunkSize = Math.ceil(voxelsCoordinates.length/voxelColors.length)
        for (let index = 0; index < voxelColors.length; index++) {
            voxelChunks.push(voxelsCoordinates.slice(chunkSize*index, chunkSize*(index+1)));
        }

        let miny = Math.min(...voxelsCoordinates.map(e=>e=e.y));

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
            scene.add(instaMesh);
        }

        //TODO: deixar codigo legivel
        let lightTam = 200;
        let dirLight = new THREE.DirectionalLight('lightyellow', 1.5);
        let dirLightPos = [MAP_SIZE*this.sunxmultiplier, this.ymultiplier, MAP_SIZE*this.sunzmultiplier].map(e=>e=e*VX - 5);
        dirLight.position.copy(new THREE.Vector3(dirLightPos[0], dirLightPos[1], dirLightPos[2]));
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 512;
        dirLight.shadow.mapSize.height = 512;
        dirLight.shadow.camera.near = .1;
        dirLight.shadow.camera.far = 2000;
        dirLight.shadow.camera.left = -lightTam;
        dirLight.shadow.camera.right = lightTam;
        dirLight.shadow.camera.bottom = -lightTam;
        dirLight.shadow.camera.top = lightTam;
        scene.add(dirLight);

        let ambiLight = new THREE.AmbientLight('white', 0.8);
        scene.add(ambiLight);

        //TODO: criar um pinheiro e uma vitória régia e escolher a arvore de acordo com o y
        let threeQuantity = Math.floor(((MAP_SIZE/10)*(MAP_SIZE/10)));
        let threePos = [];
        for (let i = 0; i < threeQuantity; i++){ 
            let coordinate;
            do { coordinate = voxelsCoordinates[Math.floor(Math.random()*voxelsCoordinates.length)]; }
            while (!!threePos.find(e=>Math.abs(e.x-coordinate.x) < VX || Math.abs(e.z-coordinate.z) < VX));
            threePos.push(coordinate);
        }
        threePos.forEach(pos => loadFile(this.files[0][0], new THREE.Vector3(pos.x - 5, pos.y + 5, pos.z - 5)));
        
        // for (let file of this.files) {
        //     loadFile(file[0], file[1]);
        // }
        //console.log(debuggando);
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

/**
 * Função que carrega os arquivos e chama função para adicionar na cena.
 * @param {*} path 
 * @param {*} pos 
 */
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

/**
 * Função auxiliar para verificação do teclado.
 * @returns 
 */
function keyboardUpdate() {

    keyboard.update();

    // Verificação para não fazer nada se o foco estiver em um campo de entrada
    if (isFocusedOnInput()) {
        return; 
    }

    if (perspective === "orbital") {
        if (keyboard.pressed("Q")) {map.factor++; map.clearAndCreate()};
        if (keyboard.pressed("E")) {map.factor--; map.clearAndCreate()};
        if (keyboard.pressed("up")) {map.divisor1 += 0.01; map.clearAndCreate()};
        if (keyboard.pressed("down")) {map.divisor1 -= 0.01; map.clearAndCreate()};
        if (keyboard.pressed("right")) {map.divisor2 += 0.01; map.clearAndCreate()};
        if (keyboard.pressed("left")) {map.divisor2 -= 0.01; map.clearAndCreate()};
        if (keyboard.pressed("S") ) {map.zoff++; map.clearAndCreate()};
        if (keyboard.pressed("W") ) {map.zoff--; map.clearAndCreate()};
        if (keyboard.pressed("D") ) {map.xoff++; map.clearAndCreate()};
        if (keyboard.pressed("A") ) {map.xoff--; map.clearAndCreate()};
    } else if (perspective === "firstperson"){ 
        if (keyboard.pressed("W")) {FPMovement.moveForward(true)};
        if (keyboard.pressed("A")) {FPMovement.moveLeft(true)};
        if (keyboard.pressed("S")) {FPMovement.moveBackward(true)};
        if (keyboard.pressed("D")) {FPMovement.moveRight(true)};
        if (keyboard.pressed("Q")) {FPMovement.moveUp(true)};
        if (keyboard.pressed("E")) {FPMovement.moveDown(true)};
        if (keyboard.pressed("shift")) {FPMovement.speedUp(true)};
        if (keyboard.up("W")) {FPMovement.moveForward(false)};
        if (keyboard.up("A")) {FPMovement.moveLeft(false)};
        if (keyboard.up("S")) {FPMovement.moveBackward(false)};
        if (keyboard.up("D")) {FPMovement.moveRight(false)};
        if (keyboard.up("Q")) {FPMovement.moveUp(false)};
        if (keyboard.up("E")) {FPMovement.moveDown(false)};
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
    // controlInfo.add("Voar/pousar:          Q | E");
    controlInfo.add("Correr:               SHIFT")
    controlInfo.add("Mudar de perspectiva:     C");
    controlInfo.show();
    controlInfo.infoBox.style.fontFamily = 'Courier New, monospace';
    controlInfo.infoBox.style.whiteSpace = 'pre';
}

/**
 * Movimenta o personagem baseado em um delta e nos campos de movimentação ativos.
 * @param {*} delta 
 */
function moveCharacter(delta){
    let speedMultiplier = speedUp? SPEED_UP_FACTOR : 1;
    if (forward) {FPControls.moveForward(SPEED * delta * speedMultiplier)}
    if (backward) {FPControls.moveForward(-SPEED * delta * speedMultiplier)}
    if (right) {FPControls.moveRight(SPEED * delta * speedMultiplier) }
    if (left) {FPControls.moveRight(-SPEED * delta * speedMultiplier)}
    if (up) {FPControls.getObject().position.y += SPEED * FLY_FACTOR * delta * speedMultiplier}
    if (down) {FPControls.getObject().position.y -= SPEED * FLY_FACTOR * delta * speedMultiplier}
}

/**
 * Para completamente o personagem.
 */
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
