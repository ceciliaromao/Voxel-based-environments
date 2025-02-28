import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import GUI from '../libs/util/dat.gui.module.js'
import Voxel from './voxel.js'
import { initRendererWithAntialias } from './renderer.js';
import { Material, Vector2, Vector3 } from '../build/three.module.js';
import {PointerLockControls} from '../build/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js'
import { InfoBox } from "../libs/util/util.js";
import {initRenderer} from "../libs/util/util.js";

const VX = 10;
const MAP_SIZE = 100;
const MIN_FOG = 0.1;
const MAX_FOG = 350;
const FOG_COLOR = 'darkgray';
const VOXEL_COLORS = [
    'cornflowerblue',
    'khaki',
    '#5E9D34',
    '#5E9D34',
    '#5E9D34',
    'darkolivegreen',
    'darkolivegreen',
    'darkgray',
    'gray',
    'snow'
];
const TEXTURES_NAMES = [
    "gravel",
    "sand",
    "grass_block_top",
    "grass_block_top",
    "grass_block_top",
    "coarse_dirt",
    "coarse_dirt",
    "stone",
    "cobblestone",
    "snow",
    "dirt",
    "dirt_path_side",
    "dirt_path_top",
    "grass_block_side",
    "smooth_stone_slab_side",
    "ice",
    "blue_ice",
    "acacia_leaves",
    "acacia_log",
    "azalea_leaves",
    "bamboo_large_leaves",
    "birch_leaves",
    "dark_oak_log",
    "dark_oak_leaves",
    "flowering_azalea_leaves",
    "oak_log",
]
const TEXTURES_PATH = "./assets/textures/";
const TEXTURES = [];

//cena
let scene;
scene = new THREE.Scene();
scene.background = new THREE.Color(FOG_COLOR);

//render
let renderer;
renderer = initRendererWithAntialias();
//renderer = initRenderer();
//renderer.logarithmicDepthBuffer = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
let shadowHelper;

//camera e controles
const orbitCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
orbitCamera.position.set(150, 225, 300);
let orbit = new OrbitControls(orbitCamera, renderer.domElement);
let perspective = "orbital";
let camera;
let orbControls;
let TPCamera;

const FPCamera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );
FPCamera.position.set(-100, 25, 175);
const FPControls = new PointerLockControls(FPCamera, renderer.domElement);
scene.add(FPControls.getObject());

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

//colisão
let occupiedVoxels = new Map();
let voxelsBBs = [];
let collisionHelpers = [];

//movimento
let forwardPressed = false;
let leftPressed = false;
let backwardPressed = false;
let rightPressed = false;
let auxVector = new THREE.Vector3();
let rightVector = new THREE.Vector3();
let playerMoveSpeed = 100;
let isJumping = false;
let playerIntialPos = new THREE.Vector3();
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
    factor: 25, // Influência da sensibilidade de mudanças por coordenada (no nosso exemplo funciona como um zoom)
    //xoff: 45, // Offset do ponto de partida em X (no nosso exemplo funciona como uma movimentação no eixo X)
    xoff: Math.floor(Math.random()*50), //Math.random()*50,
    zoff: Math.floor(Math.random()*50), //Math.random()*50,
    //zoff: 35, // Offset do ponto de partida em Z (no nosso exemplo funciona como uma movimentação no eixo Z)
    // Como a função retorna valores de -1 a 1, os campos abaixo indicam as divisões dos alcances que iram aparecer cada tipo de bloco (N0, N1 e N2)
    divisor1: -.06,
    divisor2: .23,
    ymultiplier: 25,
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

                    let vox = new THREE.Mesh(boxGeometry);
                    vox.position.copy(new Vector3(
                        (x - this.xoff - MAP_SIZE/2) * VX - 5,
                        y * VX - 5,
                        (z - this.zoff - MAP_SIZE/2) * VX - 5));
                    let voxBb = new THREE.Box3().setFromObject(vox);
                    voxelsBBs.push(voxBb);
                    let helper = new THREE.Box3Helper( voxBb, 'red' );
                    collisionHelpers.push(helper);
                    scene.add( helper );
                    helper.visible = false;
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

            let minySand = Math.min(...voxelChunks[1].map(e=>e=e.y));
            //let miny = Math.min(...this.voxelsCoordinates.map(e=>e=e.y));

            let voxelCoordinatesComplete = [];
            for (let i = 0; i < VOXEL_COLORS.length; i++){
                voxelCoordinatesComplete.push([]);
            }


            //completa os voxels internos
            voxelChunks.forEach((chunk, index) => {
                chunk.forEach(e => {
                    for (let i = 0; i < 3; i++){
                        voxelCoordinatesComplete[index].push({
                            x: e.x,
                            y: e.y - i*VX,
                            z: e.z
                        })
                    }
                });
            })

            //criação da mesh instanciada
            const voxelGeo = new THREE.BoxGeometry(VX, VX, VX);
            let voxelMat;
            let instaMesh;
            let voxelMatrix;

            //adiciona voxels de água
            let waterCoordinates = [];

            voxelChunks[0].forEach(coordinate => {
                waterCoordinates.push({
                    x: coordinate.x,
                    y: minySand,
                    z: coordinate.z
                });
            })

            let waterMat = [null,null,setMaterial(16),setMaterial(16)];
            waterMat[2].transparent = waterMat[3].transparent = true;
            waterMat[2].opacity = waterMat[3].opacity = 0.5;
            let waterInstaMesh = new THREE.InstancedMesh(voxelGeo, waterMat, waterCoordinates.length);
            let waterMatrix = new THREE.Matrix4();
            waterCoordinates.forEach((e, index) => {
                const {x , y, z} = e;
                waterMatrix.makeTranslation(x, y, z);
                waterInstaMesh.setMatrixAt(index, waterMatrix);
            })
            scene.add(waterInstaMesh);



            /*
                1: água
                2: areia
                3,4,5: terra + grama
                6,7: gravel (trocar posteriormente)
                8: pedra
                9: outra pedra
                10: neve
            */

            for (let i = 0; i < VOXEL_COLORS.length; i++){
                voxelMat = setMaterial(i);
                //voxelMat = new THREE.MeshLambertMaterial({ color: VOXEL_COLORS[i] })
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
            this.dirLight.shadow.mapSize.width = 256;
            this.dirLight.shadow.mapSize.height = 256;
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

            let threeQuantity = Math.floor(((MAP_SIZE/15)*(MAP_SIZE/15)));
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
        //console.log(this.dirLight.shadow.camera.left);
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

        for (let vox of object.voxels){
            let voxPos = new THREE.Vector3().copy(pos);
            voxPos.add(vox.cube.position);
            let obj = new THREE.Mesh(boxGeometry);
            obj.position.copy(voxPos);
            let objBB = new THREE.Box3().setFromObject(obj);
            voxelsBBs.push(objBB);
            let helper = new THREE.Box3Helper( objBB, 'red' );
            collisionHelpers.push(helper);
            scene.add(helper)
            helper.visible = false;
        }

        this.objects.push(object);
        object.main.position.set(pos.x, pos.y, pos.z);
        scene.add(object.main);

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
    playerBox: null,

    loadPlayer: function() {
        return new Promise((resolve) => {
            // let loader = new GLTFLoader();
            // loader.load(
            //     './assets/steve.glb',
            //     (gltf) => {
            //         let obj = gltf.scene;
            //         obj.traverse((child) => {
            //             if (child) {
            //                 child.castShadow = true;
            //             }
            //         });
            //         this.object = obj;
            //         this.object.scale.copy(this.scale);
            //         scene.add(this.object);

            //         /* ANIMAÇAO */
            //         let localMixer = new THREE.AnimationMixer(this.object);
            //         //console.log(gltf.animations);
            //         localMixer.clipAction(gltf.animations[0]).play();
            //         this.walkAction = localMixer;
            //         resolve();
            //     null, 
            //     null
            // });
            this.object = new THREE.Object3D();
            resolve();
        });
    },

    initPlayer: function() {
        return this.loadPlayer();
    },

    setPlayerPosition: function(pos) {
        this.object.position.copy(pos)
        this.createPlayerBbox(pos);
    },

    //TESTE DE COLISÃO
    createPlayerBbox: function(pos){
        let colGeo = new THREE.BoxGeometry(8, 18, 8);
        this.playerBox = new THREE.Mesh(colGeo);
        this.playerBox.position.copy(pos).add(new THREE.Vector3(0, 0, 0));;
        this.pbb = new THREE.Box3().setFromObject(this.playerBox);
        let phelp = new THREE.Box3Helper( this.pbb, 'green' );
        collisionHelpers.push(phelp);
        scene.add( phelp );
        phelp.visible = false;
    },

    updateCollisionBox: function(){
        if(this.playerBox && this.pbb){
            this.playerBox.position.copy(this.object.position).add(new THREE.Vector3(0, 0, 0));
            this.pbb.setFromObject(this.playerBox);
        }
    }
};

/**
 * Função que carrega os arquivos e chama função para adicionar na cena.
 * @param {*} path 
 * @param {*} pos 
 */
function loadFile (path, pos) {
    path = `./assets/${path}`;
    let treeTextures = getTreeTextures(path.split('/')[2].split('.')[0]);
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
            let treeMaterial;
            if (item.pos.x === 5 && item.pos.z === 5){ //é tronco
                treeMaterial = treeTextures.log;
            } else { //é folha
                treeMaterial = treeTextures.leaves;
                treeMaterial.transparent = true;
            }

            console.log(treeMaterial);

            let newVoxel = new Voxel(item.pos, treeMaterial, false, true);

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
    near: 0,
    far: 350,
    changeFog: function(){
        scene.fog = new THREE.Fog(FOG_COLOR, this.near, this.far)
        map.setLightTam(this.far*(2/3));
    },
    disableFog: function(){
        scene.fog = new THREE.Fog(FOG_COLOR, .1, 10000);
    },
    enableFog: function(){
        scene.fog = new THREE.Fog(FOG_COLOR, .1, 350)
        map.setLightTam(this.far*(2/3));
    },
}

// Contrói a GUI

function initControlInformation() {
    let controlsInfo = new InfoBox();
    controlsInfo.infoBox.id = "controlsInfoBox";
    controlsInfo.add("Move:        WASD");
    controlsInfo.add("Move Alt.:   ↑←↓→");
    controlsInfo.add("Jump:       Space");
    controlsInfo.add("Jump Alt.: RClick");
    controlsInfo.add("Stop:           Q");
    controlsInfo.add("Coll. Help:     R");
    controlsInfo.add("Shadow Help:    H");
    controlsInfo.add("Câmera:         C");
    controlsInfo.show();
    let infobox = document.getElementById('controlsInfoBox')
    infobox.style.fontFamily = 'Courier New, monospace';
    infobox.style.whiteSpace = 'pre';
}

function buildInterface() {
    let gui = new GUI();
    let fogFolder = gui.addFolder("Fog");
    //fogFolder.add(fogControls, "near", 0, 1000).name("Início").onChange(() => fogControls.changeFog());
    fogFolder.add(fogControls, "far", 0, 1000).name("Fim").onChange(() => fogControls.changeFog());
}

/*
    1: água (gravel com cor)
    2: areia
    3,4,5: terra + grama
    6,7: gravel (trocar posteriormente)
    8: pedra
    9: outra pedra
    10: neve
*/

function setMaterial(index){
    const dirtGrass = [2, 3, 4];
    if (!dirtGrass.includes(index)){
        let vxMat = new THREE.MeshLambertMaterial({ map: TEXTURES[index].texture, color: VOXEL_COLORS[index]});
        return setTextureProperties(vxMat);
    } else {
        let dirtVxSide = setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[13].texture }));
        let grassVxTop = setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[index].texture, color: VOXEL_COLORS[index] }));
        return [
            dirtVxSide,
            dirtVxSide,
            grassVxTop,
            dirtVxSide,
            dirtVxSide,
            dirtVxSide,
        ]
    }
}

function setTextureProperties(texture){
    texture.map.colorSpace = THREE.SRGBColorSpace;
    texture.map.wrapS = texture.map.wrapT = THREE.RepeatWrapping;
    texture.map.minFilter = texture.map.magFilter = THREE.LinearFilter;
    texture.map.repeat = new THREE.Vector2(1, 1);
    return texture;
}

async function loadTextures(){
    return new Promise(async (resolve) => {
        let textureLoader = new THREE.TextureLoader();
        TEXTURES_NAMES.forEach(texName => {
            let newTexture = textureLoader.load(`${TEXTURES_PATH}${texName}.png`);
            TEXTURES.push({
                name: texName,
                texture: newTexture
            })
        })
        console.log(TEXTURES);
        resolve(true);
    })
}

function getTreeTextures(treeName){
    if (treeName === "arvoreAlga"){
        return {
            leaves: setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[17].texture, color: 'green' })),
            log: setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[18].texture, color: 'khaki'  }))
        }
    } else if (treeName === "arvoreFloresta"){
        return {
            leaves: setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[17].texture, color: 'green'  })),
            log: setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[18].texture, color: 'khaki'  }))
        }
    } else if (treeName === "arvoreMotanha"){
        return {
            leaves: setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[17].texture, color: 'green'  })),
            log: setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[18].texture, color: 'khaki'  }))
        }
    } else if (treeName === "arvoreNeve"){
        return {
            leaves: setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[17].texture, color: 'green'  })),
            log: setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[18].texture, color: 'khaki'  }))
        }
    } else if (treeName === "arvoreSavana"){
        return {
            leaves: setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[17].texture, color: 'green'  })),
            log: setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[18].texture, color: 'khaki'}))
        }
    }
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

function setCollisionHelpersVisible(){
    collisionHelpers.forEach( e => e.visible = !e.visible);
}

function getNearbyVoxels(){
    const radius = 5; 
    const nearbyBoxes = [];

    const playerPos = player.pbb.getCenter(new THREE.Vector3());
    let px = Math.round(playerPos.x/VX); if (px == 0) px = 0;
    let py = Math.round(playerPos.y/VX); if (py == 0) py = 0;
    let pz = Math.round(playerPos.z/VX); if (pz == 0) pz = 0;
    
    for (let dx = -radius; dx <= radius; dx += 1) {
        for (let dz = -radius; dz <= radius; dz += 1) {
            for (let dy = -radius; dy <= radius; dy += 1) {
                const key = `${px + dx},${py + dy},${pz + dz}`;
                if (occupiedVoxels.has(key)) {
                    nearbyBoxes.push(occupiedVoxels.get(key));
                }
            }
        }
    }

    return nearbyBoxes;
}


function addVoxelToMap(bb) {
    let center = new THREE.Vector3();
    bb.getCenter(center);

    let gridX = Math.round(center.x / VX); if (gridX == 0) gridX = 0;
    let gridY = Math.round(center.y / VX); if (gridY == 0) gridY = 0;
    let gridZ = Math.round(center.z / VX); if (gridZ == 0) gridZ = 0;
    let key = `${gridX},${gridY},${gridZ}`;
    occupiedVoxels.set(key, bb);
}

function isOnGround(){
    const playerBox = player.pbb.clone();
    const nearbyBoxes = getNearbyVoxels();

    const groundCheckBox = playerBox.clone();
    groundCheckBox.min.y -= 0.1;
    groundCheckBox.max.y -= 0.1;

    for (let bb of nearbyBoxes) {
        if (groundCheckBox.intersectsBox(bb)) {
            return true;
        }
    }
    return false;
}

function clampPlayerToGround() {
    const playerBox = player.pbb.clone();
    const nearbyBoxes = getNearbyVoxels();

    for (let bb of nearbyBoxes) {
        if (playerBox.intersectsBox(bb)) {
            const playerHeight = playerBox.max.y - playerBox.min.y;
            player.object.position.y = bb.max.y + playerHeight / 2;
            player.yvelocity = 0;
            break;
        }
    }
}

function isColliding(player, direction, delta) {
    const playerBox = player.pbb.clone();
    const moveVector = direction.clone().multiplyScalar(playerMoveSpeed * delta);
    playerBox.translate(moveVector);

    const bufferedBox = playerBox.clone().expandByScalar(-.01);

    const nearbyBoxes = getNearbyVoxels();

    for (let bb of nearbyBoxes) {
        if (bufferedBox.intersectsBox(bb)) {
            return true;
        }
    }
    return false;
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
    if (isPlayerMoving() || !isOnGround()){
        player.walkAction.update(delta);
    }
}

function jump(){
    if (isOnGround() && !isJumping) {
        player.yvelocity = 0.9;
        isJumping = true;
    }
}

function updatePlayer(delta){

    if (!isOnGround()) {
        if (player.yvelocity > -5) {
            player.yvelocity -= 0.03;
        }
    } else {
        if (isJumping) {
            isJumping = false;
        } else {
            clampPlayerToGround();
        }
    }

    player.object.translateY(player.yvelocity);

    camera.getWorldDirection(auxVector);
    auxVector.y = 0; // Ignore vertical component
    auxVector.normalize(); // Ensure it's a unit vector
    
    let rightVector = new THREE.Vector3();
    rightVector.crossVectors(auxVector, new THREE.Vector3(0, 1, 0)).normalize(); // Right direction
    
    if (forwardPressed) {
        if (!isColliding(player, auxVector, delta)) {
            player.object.position.addScaledVector(auxVector, playerMoveSpeed * delta);
        }
    }
    
    if (backwardPressed) {
        let backwardVector = auxVector.clone().negate();
        if (!isColliding(player, backwardVector, delta)) {
            player.object.position.addScaledVector(backwardVector, playerMoveSpeed * delta);
        }
    }
    
    if (leftPressed) {
        let leftVector = rightVector.clone().negate();
        if (!isColliding(player, leftVector, delta)) {
            player.object.position.addScaledVector(leftVector, playerMoveSpeed * delta);
        }
    }
    
    if (rightPressed) {
        if (!isColliding(player, rightVector, delta)) {
            player.object.position.addScaledVector(rightVector, playerMoveSpeed * delta);
        }
    }

    player.object.updateMatrixWorld();

    player.updateCollisionBox();

    if (player.object.position.y < -20*VX) {
        player.object.position.copy(playerIntialPos);
    }

    FPCamera.position.copy(player.object.position);
}

function changePerspective(){

    if (camera === orbitCamera){
        // ORBIT => CONTROL

        fogControls.enableFog();

        //Altera info dos controles
        const el = document.getElementById("OrbitInfoBox");
        if (el) el.remove();

        //Altera a câmera e prende o mouse
        camera = FPCamera;
        FPControls.lock();
        perspective = "firstperson";
    } else {
        // CONTROL => ORBIT

        fogControls.disableFog();

        //Altera info dos controles
        const el = document.getElementById("ControlInfoBox");
        if (el) el.remove();

        //Altera a câmera e libera o mouse
        perspective = "orbital";
        camera = orbitCamera;
        FPControls.unlock();
        stopAnyMovement(); //resolve o bug de trocar de perspectiva enquanto pressiona uma tecla faz o personagem andar infinitamente
    }
}

/* FIM FUNÇÕES DE MOVIMENTO e JOGADOR */

function updateDirLight(){
    map.dirLight.position.copy(player.object.position).add(map.dirLightOffset);
}

function animate(){
    const delta = Math.min(clock.getDelta(), 0.1);
    requestAnimationFrame(animate);
    updatePlayer(delta/5);
    updateDirLight();
    updateFpsDisplay();
    renderer.render(scene, camera);
}

function initiateScene() {

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
            case 'KeyY': /* invert Y */; break;
            case 'KeyC': changePerspective(); break;
            case 'KeyH': shadowHelper.visible = !shadowHelper.visible; break;
            case 'KeyR': setCollisionHelpersVisible(); break;
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
    await loadTextures();
    console.log(TEXTURES);
    buildInterface();
    initControlInformation();

    await map.create();

    let y = map.collisionCoordinates.find(e => e.x === 0 && e.z === 0).y;
    player.initPlayer().then(() => {
        playerIntialPos = new THREE.Vector3(
            0,
            y*VX + 2*VX,
            0
        );

        player.setPlayerPosition(playerIntialPos);

        initiateScene();

        voxelsBBs.forEach(bb => addVoxelToMap(bb));

        scene.fog = new THREE.Fog(FOG_COLOR, MIN_FOG, MAX_FOG);
        scene.fog.inten

        map.dirLight.target = player.object;

        camera = FPCamera;

        shadowHelper = new THREE.CameraHelper(map.dirLight.shadow.camera);
        shadowHelper.visible = false;
        scene.add(shadowHelper);
        changePerspective();

        animate();
    });
}

init();
