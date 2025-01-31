import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import GUI from '../libs/util/dat.gui.module.js'
import Voxel from './voxel.js'
import { initRendererWithAntialias } from './renderer.js';
import { Material, Vector2, Vector3 } from '../build/three.module.js';
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js'

const VX = 10;
const MAP_SIZE = 74;
const VOXEL_COLORS = [
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

//cena
let scene;
scene = new THREE.Scene();
scene.background = new THREE.Color(0xADD8E6);

//render
let renderer;
renderer = initRendererWithAntialias();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
let shadowHelper;

//camera e controles
const orbitCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
orbitCamera.position.set(150, 225, 300);
let orbit = new OrbitControls(orbitCamera, renderer.domElement);
let camPerspective = "thirdperson";
let camera;
let orbControls;
let TPCamera;

//colisão
let occupiedVoxels = new Set();

//movimento
let forwardPressed = false;
let leftPressed = false;
let backwardPressed = false;
let rightPressed = false;
let auxVector = new THREE.Vector3();
let playerMoveSpeed = 100;
const clock = new THREE.Clock();

//fps
let frameCount = 0;
let lastTime = performance.now();
let fps = 0;
const fpsDisplay = document.createElement('div');
fpsDisplay.style.position = 'absolute';
fpsDisplay.style.top = '10px';
fpsDisplay.style.left = '10px';
fpsDisplay.style.color = 'white';
fpsDisplay.style.fontSize = '16px';
document.body.appendChild(fpsDisplay);


//Corrige distorção na proporção dos objetos
window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
});


let boxGeometry = new THREE.BoxGeometry(VX, VX, VX);
/**
 * Conjunto de varáveis e funções relativas ao mapa e a iluminação
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
        'arvoreAlga.json',
        'arvoreSavana.json',
        'arvoreFloresta.json',
        'arvoreMontanha.json',
        'arvoreNeve.json'
    ],
    // Os campos factor, xoff, zoff, divisor1, divisor2 são campos usados na calibração do ruído Perlin.
    factor: 18, // Influência da sensibilidade de mudanças por coordenada (no nosso exemplo funciona como um zoom)
    //xoff: 45, // Offset do ponto de partida em X (no nosso exemplo funciona como uma movimentação no eixo X)
    xoff: Math.floor(Math.random()*50), //Math.random()*50,
    zoff: Math.floor(Math.random()*50), //Math.random()*50,
    //zoff: 35, // Offset do ponto de partida em Z (no nosso exemplo funciona como uma movimentação no eixo Z)
    // Como a função retorna valores de -1 a 1, os campos abaixo indicam as divisões dos alcances que iram aparecer cada tipo de bloco (N0, N1 e N2)
    divisor1: -.06,
    divisor2: .23,
    ymultiplier: 20,
    absolute: false,
    sunxmultiplier: .2,
    sunzmultiplier: .07,
    voxelsCoordinates: [],
    collisionCoordinates: [],
    instancedMeshes: [],
    dirLight: null,
    dirLightOffset: new THREE.Vector3(10, 60, -20),
    dirLightTarget: new THREE.Object3D(),
    lightTam: 200,

    /**
     * Busca as coordenadas dos voxels gerada pela função
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
    /**
     * Cria o mapa usando a função de ruído Perlin e carrega os arquivos (será mudado no futuro para não carregar o arquivo toda vez que rodar).
     */
    create: async function () {
        return new Promise(async (resolve) => {
            this.voxelsCoordinates = await this.setCoordinates();
            this.voxelsCoordinates.sort((a,b) => a.y - b.y);
            let voxelChunks = [];
            
            let chunkSize = Math.ceil(this.voxelsCoordinates.length/VOXEL_COLORS.length)
            for (let index = 0; index < VOXEL_COLORS.length; index++) {
                voxelChunks.push(this.voxelsCoordinates.slice(chunkSize*index, chunkSize*(index+1)));
            }

            let miny = Math.min(...this.voxelsCoordinates.map(e=>e=e.y));

            let voxelCoordinatesComplete = [];
            for (let i = 0; i < VOXEL_COLORS.length; i++){
                voxelCoordinatesComplete.push([]);
            }

            //completa os voxels internos
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

            //criação da mesh instanciada
            const voxelGeo = new THREE.BoxGeometry(VX, VX, VX);
            let voxelMat;
            let instaMesh;
            let voxelMatrix;

            for (let i = 0; i < VOXEL_COLORS.length; i++){
                voxelMat = new THREE.MeshLambertMaterial({ color: VOXEL_COLORS[i]});
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

            //criação da luz
            this.dirLight = new THREE.DirectionalLight('lightyellow', 1.5);
            this.dirLight.position.copy(this.dirLightOffset);
            this.dirLight.castShadow = true;
            this.dirLight.shadow.mapSize.width = 512;
            this.dirLight.shadow.mapSize.height = 512;
            this.dirLight.shadow.camera.near = .1;
            this.dirLight.shadow.camera.far = 2000;
            this.dirLight.shadow.camera.left = -this.lightTam;
            this.dirLight.shadow.camera.right = this.lightTam;
            this.dirLight.shadow.camera.bottom = -this.lightTam;
            this.dirLight.shadow.camera.top = this.lightTam;
            this.dirLight.shadow.camera.updateProjectionMatrix();
            scene.add(this.dirLightTarget);
            scene.add(this.dirLight);

            let ambiLight = new THREE.AmbientLight('white', 0.8);
            scene.add(ambiLight);

            //criação das árvores
            let chunksMaxY = [];
            for (let i = 0; i < voxelChunks.length; i++){
                chunksMaxY.push(Math.max(...voxelChunks[i].map(e=>e=e.y)))
            }

            let threeQuantity = Math.floor(((MAP_SIZE/10)*(MAP_SIZE/10)));
            let threePos = [];
            for (let i = 0; i < threeQuantity; i++){ 
                let coordinate;
                do { coordinate = this.voxelsCoordinates[Math.floor(Math.random()*this.voxelsCoordinates.length)]; }
                while (!!threePos.find(e=>Math.abs(e.x-coordinate.x) < VX || Math.abs(e.z-coordinate.z) < VX));
                threePos.push(coordinate);
            }
            threePos.forEach(pos => {
                let r = chunksMaxY.findIndex(e => pos.y < e);
                let fileIndex;

                if (r === 0) fileIndex = 0;
                if (r === 1) fileIndex = 1;
                if (r === 2 || r === 3 || r === 4) fileIndex = 2;
                if (r === 5 || r === 6 || r === 7) fileIndex = 3;
                if (r === 8 || r === 9 || r === -1) fileIndex = 4;

                loadFile(this.files[fileIndex], new THREE.Vector3(pos.x - 5, pos.y + 5, pos.z - 5))
            });
            resolve(true);
        });
    },
    /**
     * Altera o volume de sombras
     */
    setLightTam: function (tam){
        this.dirLight.shadow.camera.left = -tam;
        this.dirLight.shadow.camera.right = tam;
        this.dirLight.shadow.camera.bottom = -tam;
        this.dirLight.shadow.camera.top = tam;
        this.dirLight.shadow.camera.updateProjectionMatrix();
        shadowHelper.update();
        console.log(this.dirLight.shadow.camera.left);
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

        // object.voxels.map(e=> e = e.cube.position).forEach(vPos => {
        //     let auxVector = new THREE.Vector3().copy(pos);
        //     let auxVector2 = new THREE.Vector3().copy(vPos);
        //     auxVector.add(auxVector2);
        //     addVoxelToSet(auxVector.x, auxVector.y, auxVector.z);
        // })

        this.objects.push(object);
        object.main.position.set(pos.x, pos.y, pos.z);
        scene.add(object.main);
        console.log(object);
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
        map.setLightTam(this.far*(2/3));
    },
}

// Contrói a GUI
function buildInterface() {
    let gui = new GUI();
    let fogFolder = gui.addFolder("Fog");
    fogFolder.add(fogControls, "near", 0, 1000).name("Início").onChange(() => fogControls.changeFog());
    fogFolder.add(fogControls, "far", 0, 1000).name("Fim").onChange(() => fogControls.changeFog());
}

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

/* FUNÇÕES DE COLISÃO */

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

/* FIM DAS FUNÇÕES DE COLISÃO */

/* FUNÇÕES DE MOVIMENTO e JOGADOR */

function isPlayerMoving(){
    return forwardPressed || leftPressed || backwardPressed || rightPressed;
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

function animateCharacter(delta){
    if (isPlayerMoving() || !isOnGround(player.object)){
        player.walkAction.update(delta);
    }
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

    if (direction.length() > 0) {
        const targetRotation = Math.atan2(direction.x, direction.z);
        const rotationSpeed = 25 * delta;
        
        let currentRotation = player.object.rotation.y;
        let newRotation = THREE.MathUtils.lerp(currentRotation, targetRotation, rotationSpeed);

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

/* FIM FUNÇÕES DE MOVIMENTO e JOGADOR */

function updateDirLight(){
    map.dirLight.position.copy(player.object.position).add(map.dirLightOffset);
}

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
    updatePlayer(delta/5);
    updateDirLight();
    orbControls.update();
    updateFpsDisplay();
    renderer.render(scene, camera);
}

function initiateScene() {
    TPCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    const initialOffset = new THREE.Vector3(0, 10, -35);
    TPCamera.position.copy(player.object.position).add(initialOffset);
    TPCamera.lookAt(player.object.position);

    window.camera = TPCamera;
    orbControls = new OrbitControls(TPCamera, renderer.domElement);
    orbControls.target.copy(player.object.position);
    orbControls.maxPolarAngle = Math.PI / 1.5;
    orbControls.minPolarAngle = 0.1;
    orbControls.minDistance = 20;
    orbControls.maxDistance = 60;
    orbControls.distance = 40;

    orbControls.update();

    //CONTROLES
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
            case 'KeyH': shadowHelper.visible = !shadowHelper.visible; break;
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

async function init() {
    buildInterface();

    await map.create();

    let y = map.collisionCoordinates.find(e => e.x === 0 && e.z === 0).y;
    player.initPlayer().then(() => {
        player.setPlayerPosition(new THREE.Vector3(
            0,
            y*VX + VX,
            0
        ));

        initiateScene();

        map.collisionCoordinates.forEach(e => {
            addVoxelToSet(e.x, e.y, e.z);
        })

        scene.fog = new THREE.Fog('darkgray', 50, 350)

        map.dirLight.target = player.object;

        camera = TPCamera;

        shadowHelper = new THREE.CameraHelper(map.dirLight.shadow.camera);
        scene.add(shadowHelper);

        animate();
    });
}

init();



/* TODO
Prioritário:
- Colisão nas árvores;
- Inversão eixo Y; => Não será feita;
- Adicionar outros tipos de árvore já criadas; => OK!!
- Voltar com geração prodecedural; => OK!!
- Adequar tamanho da sombra de acordo com o fog; => OK!!

Não-prioritário:
- Arrumar o código;
- Melhorar a colisão;
- Fix nas sombras se mexendo; => Não será feita;
- Criar árvore pra água e pra montanha; => OK !!
- Fix na gambiarra do jump;
*/