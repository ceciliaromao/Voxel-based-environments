import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import GUI from '../libs/util/dat.gui.module.js'
import Voxel from '../src/voxel.js'
import { initRendererWithAntialias } from '../src/renderer.js';
//import { Material, Vector2, Vector3 } from '../build/three.module.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js'
import { InfoBox } from "../libs/util/util.js";
import { initRenderer } from "../libs/util/util.js";
import { CubeTextureLoaderSingleFile } from '../libs/util/cubeTextureLoaderSingleFile.js'


const VX = 10;
const MAP_SIZE = 100;
const MIN_FOG = 0.1;
const MAX_FOG = 350;
const FOG_COLOR = 'darkgray';
const EFFECTS_VOL = 1.0;
const MUSIC_VOL = 0.25;
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
    "gravel", //0
    "sand", //1 
    "grass_block_top", //2
    "grass_block_top", //3
    "grass_block_top", //4
    "coarse_dirt", //5
    "coarse_dirt", //6
    "stone", //7
    "cobblestone", //8
    "snow", //9
    "dirt", //10
    "dirt_path_side", //11
    "dirt_path_top", //12
    "grass_block_side", //13
    "smooth_stone_slab_side", //14
    "ice", //15
    "blue_ice", //16
    "acacia_leaves", //17
    "acacia_log", //18
    "azalea_leaves", //19
    "bamboo_large_leaves", //20
    "birch_leaves", //21
    "dark_oak_log", //22
    "dark_oak_leaves", //23
    "flowering_azalea_leaves", //24
    "oak_log", //25
    "bricks", //26
    "deepslate_bricks", //27
    "stone_bricks", //28
    "smooth_stone", //29
    "polished_andesite", //30
    "oak_planks", //31
    "jungle_planks", //32
    "acacia_planks", //33
    "birch_planks", //34
    "bamboo_block", //35
    "bamboo_planks" //36
]

const SKYBOX_TEXTURES = [
    "field-with-clouds", //0
    "panoramic-sea", //1
    "sky-box-city", //2
    "cross_dune.png", //3
    "cross_forest.png", //4
    "cross_grass_mountains.png", //5
    "cross_night.png", //6
    "cross_obsidian.png", //7
    "cross_sky.png", //8
    "cross_sky_2.png", //9
    "cross_sky_3.png", //10
    "cross_snow.png", //11
    "cross_space.png" //12
]
const TEXTURES_PATH = "src/assets/textures/";
const TEXTURES = [];
let skyboxTexture;
let cubeTexture;

const SOUND_PATH = 'src/assets/sound/';
const SOUNDS = [
    'bloop-noise.wav'
]
const MUSIC = [
    'bg_music_1.mp3',
    'bg_music_2.mp3',
    'bg_music_3.mp3',
    'bg_music_4.mp3',
]

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
let templePosition;

//camera e controles
const orbitCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
orbitCamera.position.set(150, 225, 300);
let orbit = new OrbitControls(orbitCamera, renderer.domElement);
let perspective = "orbital";
let camera;
let orbControls;
let TPCamera;
const FPCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
FPCamera.position.set(-100, 25, 175);
const FPControls = new PointerLockControls(FPCamera, renderer.domElement);
scene.add(FPControls.getObject());

const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');
instructions.style.display = 'none';
blocker.style.display = 'none';

//loadScreen
let loadingManager;
let canStartGame = false;

//colisão
let occupiedVoxels = new Map();
let voxelsBBs = [];
let collisionHelpers = [];

//sons
const listener = new THREE.AudioListener();
const audioLoader = new THREE.AudioLoader(loadingManager);
let removeSoundEffect;
let backgroundMusic;
let isMusicPlaying = false;
let backgroundMusicBuffer = [];
let removeEffectBuffer;

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

//interação
let voxelPosMap = new Map();
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2(0, 0);
const fadingDuration = 2000;
const interactionRadius = 40;
let selectedVoxel = { mesh: null, instanceId: null };
const highlightMaterial = new THREE.MeshBasicMaterial({
    color: 'white',
    transparent: true,
    opacity: 0.5,
    depthTest: false,
});
const highlightBox = new THREE.Mesh(new THREE.BoxGeometry(VX * 1.02, VX * 1.02, VX * 1.02), highlightMaterial);
highlightBox.visible = false;
scene.add(highlightBox);
let alpha = 1.0;
const interval = 50;
const fadeDuration = 2000;
const steps = fadeDuration / interval;

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
// window.addEventListener('resize', function () {
//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();

//     renderer.setSize(window.innerWidth, window.innerHeight);
//     renderer.setPixelRatio(window.devicePixelRatio);
// });


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
        'arvoreNeve.json',
        'templo_divino.json'
    ],

    //'arvoreMontanha.json'
    // Os campos factor, xoff, zoff, divisor1, divisor2 são campos usados na calibração do ruído Perlin.
    factor: 30, // Influência da sensibilidade de mudanças por coordenada (no nosso exemplo funciona como um zoom)
    //xoff: 45, // Offset do ponto de partida em X (no nosso exemplo funciona como uma movimentação no eixo X)
    xoff: Math.floor(Math.random() * 50), //Math.random()*50,
    zoff: Math.floor(Math.random() * 50), //Math.random()*50,
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
    templeCoords: [],
    instancedMeshes: [],
    dirLight: null,
    dirLightOffset: new THREE.Vector3(10, 60, -20),
    dirLightTarget: new THREE.Object3D(),
    lightTam: 200,

    /**
     * Busca as coordenadas dos voxels gerada pela função
     */
    setCoordinates: async function () {
        return new Promise((resolve) => {
            let coordinates = [];
            for (let x = this.xoff; x <= this.xoff + MAP_SIZE; x++) {
                for (let z = this.zoff; z <= this.zoff + MAP_SIZE; z++) {
                    let y = Math.floor(noise.perlin2(x / this.factor, z / this.factor) * this.ymultiplier);
                    this.collisionCoordinates.push({
                        x: (x - this.xoff - MAP_SIZE / 2),
                        y: y,
                        z: (z - this.zoff - MAP_SIZE / 2)
                    });
                    coordinates.push({
                        x: (x - this.xoff - MAP_SIZE / 2) * VX - 5,
                        y: y * VX - 5,
                        z: (z - this.zoff - MAP_SIZE / 2) * VX - 5
                    });

                    // let vox = new THREE.Mesh(boxGeometry);
                    // vox.position.copy(new Vector3(
                    //     (x - this.xoff - MAP_SIZE/2) * VX - 5,
                    //     y * VX - 5,
                    //     (z - this.zoff - MAP_SIZE/2) * VX - 5));
                    // let voxBb = new THREE.Box3().setFromObject(vox);
                    // voxelsBBs.push(voxBb);
                    // let helper = new THREE.Box3Helper( voxBb, 'red' );
                    // collisionHelpers.push(helper);
                    // scene.add( helper );
                    // helper.visible = false;
                }
            }

            //reduzir o respawn para proximo do centro (entre 25% e 75% das bordas)
            let borderMax = Math.max(...coordinates.map(e => e = e.x))
            let borderMin = Math.min(...coordinates.map(e => e = e.x))

            let mapLength = borderMax - borderMin;
            let structureBorder = Math.floor(mapLength * 0.25)
            let structureBorderMax = borderMax - structureBorder;
            let structureBorderMin = borderMin + structureBorder;

            //console.log(`Coord max ${structureBorderMax}, Coord min ${structureBorderMin}`);

            //encontrar uma coordenada aleatória que esteja ai dentro

            let randomIndex = -1;
            while (randomIndex === -1) {
                let index = Math.floor(Math.random() * coordinates.length);
                if (
                    coordinates[index].x > structureBorderMin &&
                    coordinates[index].x < structureBorderMax &&
                    coordinates[index].z > structureBorderMin &&
                    coordinates[index].z < structureBorderMax
                ) {
                    randomIndex = index;
                }
            }

            // console.log(`Coordenada encontrada: x: ${coordinates[randomIndex].x},y: ${coordinates[randomIndex].y},z: ${coordinates[randomIndex].z}`);

            //encontrar o menor y em um "raio" de 5 VX

            let templeCoords = [];
            coordinates.forEach(el => {
                if (
                    el.x >= Math.round(coordinates[randomIndex].x - 5 * VX) &&
                    el.x < Math.round(coordinates[randomIndex].x + 5 * VX) &&
                    el.z >= Math.round(coordinates[randomIndex].z - 5 * VX) &&
                    el.z < Math.round(coordinates[randomIndex].z + 5 * VX)
                ) {
                    templeCoords.push(el);
                }
            })

            let coordMiny = Math.min(...templeCoords.map(e => e = e.y));

            //console.log(`Encontrado menor y: ${coordMiny} dentre ${templeCoords.length} coordenadas`);

            //setar todas as coordenadas desse raio para esse menor y

            templeCoords.forEach(e => {
                let i = coordinates.findIndex(el => el.x === e.x && el.z === e.z);
                if (i !== -1) {
                    coordinates[i].y = coordMiny;
                    this.collisionCoordinates[i].y = Math.round((coordMiny + 5) / VX)
                }
            })

            // this.collisionCoordinates.forEach(e => {
            //     let vox = new THREE.Mesh(boxGeometry);
            //     vox.position.copy(new THREE.Vector3(
            //         e.x * VX - 5,
            //         e.y * VX - 5,
            //         e.z * VX - 5
            //     ));
            //     let voxBb = new THREE.Box3().setFromObject(vox);
            //     voxelsBBs.push(voxBb);
            //     let helper = new THREE.Box3Helper( voxBb, 'red' );
            //     collisionHelpers.push(helper);
            //     scene.add( helper );
            //     helper.visible = false;
            // })



            templePosition = {
                x: coordinates[randomIndex].x,
                y: coordMiny,
                z: coordinates[randomIndex].z,
            }

            this.templeCoords = templeCoords;

            resolve(coordinates);
        });
    },
    /**
     * Cria o mapa usando a função de ruído Perlin e carrega os arquivos (será mudado no futuro para não carregar o arquivo toda vez que rodar).
     */
    create: async function () {
        return new Promise(async (resolve) => {
            this.voxelsCoordinates = await this.setCoordinates();
            this.voxelsCoordinates.sort((a, b) => a.y - b.y);
            let voxelChunks = [];

            let chunkSize = Math.ceil(this.voxelsCoordinates.length / VOXEL_COLORS.length)
            for (let index = 0; index < VOXEL_COLORS.length; index++) {
                voxelChunks.push(this.voxelsCoordinates.slice(chunkSize * index, chunkSize * (index + 1)));
            }

            let minySand = Math.min(...voxelChunks[1].map(e => e = e.y));
            let miny = Math.min(...this.voxelsCoordinates.map(e => e = e.y));

            let voxelCoordinatesComplete = [];
            for (let i = 0; i < VOXEL_COLORS.length; i++) {
                voxelCoordinatesComplete.push([]);
            }

            //bloco de terra embaixo da grama
            voxelCoordinatesComplete.push([]);

            let dirtMeshCoordinates = [];
            //completa os voxels internos
            voxelChunks.forEach((chunk, index) => {
                chunk.forEach(e => {
                    let y = e.y;
                    while (y >= miny) {
                        let coord = {
                            x: e.x,
                            y: y,
                            z: e.z
                        }

                        // COLISAO TESTE
                        // let vox = new THREE.Mesh(boxGeometry);
                        // vox.position.copy(coord);
                        // let voxBb = new THREE.Box3().setFromObject(vox);
                        // voxelsBBs.push(voxBb);
                        // let helper = new THREE.Box3Helper( voxBb, 'red' );
                        // collisionHelpers.push(helper);
                        // scene.add( helper );
                        // helper.visible = false;

                        //COLISAO TESTE FIM

                        if ((index !== 2 && index !== 3 && index !== 4) || y === e.y){
                            voxelCoordinatesComplete[index].push(coord)
                        } else {
                            dirtMeshCoordinates.push(coord);
                        }


                        if (y !== e.y){
                            this.collisionCoordinates.push({
                                x: (e.x + 5)/VX,
                                y: (y + 5)/VX,
                                z: (e.z + 5)/VX,
                            })
                        }
                        y -= VX;
                    }
                    // voxelCoordinatesComplete[index].push({
                    //     x: e.x,
                    //     y: e.y,
                    //     z: e.z
                    // })
                    // for (let i = 0; i < 20; i++){
                    //     voxelCoordinatesComplete[index].push({
                    //         x: e.x,
                    //         y: e.y - i*VX,
                    //         z: e.z
                    //     })
                    // }
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

            let waterMat = [null, null, setMaterial(16), setMaterial(16)];
            waterMat[2].transparent = waterMat[3].transparent = true;
            waterMat[2].opacity = waterMat[3].opacity = 0.5;
            let waterInstaMesh = new THREE.InstancedMesh(voxelGeo, waterMat, waterCoordinates.length);
            let waterMatrix = new THREE.Matrix4();
            waterCoordinates.forEach((e, index) => {
                const { x, y, z } = e;
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

            for (let i = 0; i < VOXEL_COLORS.length; i++) {
                // voxelMat = setMaterial(i);
                // //voxelMat = new THREE.MeshLambertMaterial({ color: VOXEL_COLORS[i] })
                // instaMesh = new THREE.InstancedMesh(voxelGeo, voxelMat, voxelCoordinatesComplete[i].length);
                // voxelMatrix = new THREE.Matrix4();
                // voxelCoordinatesComplete[i].forEach((e, index) => {
                //     const {x, y, z} = e;
                //     voxelMatrix.makeTranslation(x, y, z);
                //     instaMesh.setMatrixAt(index, voxelMatrix);
                //     const voxelPosKey = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
                //     voxelPosMap.set(voxelPosKey,
                //         {
                //             instanceId: index,
                //             meshId: this.instancedMeshes.length
                //         }
                //     );
                // })
                // instaMesh.castShadow = true;
                // instaMesh.receiveShadow = true;
                // instaMesh.name = VOXEL_COLORS[i];
                // this.instancedMeshes.push(instaMesh);
                // scene.add(instaMesh);
                await this.createInstancedMesh(voxelCoordinatesComplete[i], setMaterial(i));
            }

            await this.createInstancedMesh(dirtMeshCoordinates, setMaterial(10))

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
            for (let i = 0; i < voxelChunks.length; i++) {
                chunksMaxY.push(Math.max(...voxelChunks[i].map(e => e = e.y)))
            }

            let threeQuantity = Math.floor(((MAP_SIZE / 15) * (MAP_SIZE / 15)));
            let threePos = [];
            for (let i = 0; i < threeQuantity; i++) {
                let coordinate;
                do { coordinate = this.voxelsCoordinates[Math.floor(Math.random() * this.voxelsCoordinates.length)]; }
                while (!!threePos.find(e => Math.abs(e.x - coordinate.x) < VX || Math.abs(e.z - coordinate.z) < VX || this.templeCoords.includes(coordinate)));
                threePos.push(coordinate);
            }
            for (const pos of threePos) {
                let r = chunksMaxY.findIndex(e => pos.y < e);
                let fileIndex;

                if (r === 0) fileIndex = 0;
                if (r === 1) fileIndex = 1;
                if (r === 2 || r === 3 || r === 4) fileIndex = 2;
                if (r === 5 || r === 6 || r === 7) fileIndex = 3;
                if (r === 8 || r === 9 || r === -1) fileIndex = 4;

                await loadFile(this.files[fileIndex], new THREE.Vector3(pos.x - 5, pos.y + 5, pos.z - 5))
            };

            await loadFile(this.files[this.files.length - 1], new THREE.Vector3(templePosition.x - 5, templePosition.y + 5, templePosition.z - 5));

            resolve(true);
        });
    },
    /**
     * Altera o volume de sombras
     */
    setLightTam: function (tam) {
        this.dirLight.shadow.camera.left = -tam;
        this.dirLight.shadow.camera.right = tam;
        this.dirLight.shadow.camera.bottom = -tam;
        this.dirLight.shadow.camera.top = tam;
        this.dirLight.shadow.camera.updateProjectionMatrix();
        shadowHelper.update();
        //console.log(this.dirLight.shadow.camera.left);
    },

    setVoxelOnScene: function (position, color) {
        let box = new THREE.Mesh(boxGeometry, new THREE.MeshLambertMaterial({
            color: color
        }));
        box.castShadow = true;
        box.receiveShadow = true;
        box.position.set(position.x, position.y, position.z);
        this.land.push(box);
        scene.add(box);
    },

    createInstancedMesh: async function (coordinates, material) {
        return new Promise(async (resolve) => {
            let geometry = new THREE.BoxGeometry(VX, VX, VX);
            let instancedMesh = new THREE.InstancedMesh(geometry, material, coordinates.length);

            let matrix = new THREE.Matrix4();
            coordinates.forEach((e, index) => {
                const { x, y, z } = e;
                matrix.makeTranslation(x, y, z);
                instancedMesh.setMatrixAt(index, matrix);
                const voxelPosKey = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
                voxelPosMap.set(voxelPosKey,
                    {
                        instanceId: index,
                        meshId: this.instancedMeshes.length
                    }
                );
            })
            instancedMesh.castShadow = true;
            instancedMesh.receiveShadow = true;
            this.instancedMeshes.push(instancedMesh);
            scene.add(instancedMesh);
            resolve(true)
        })
    },
    /**
     * Função auxiliar para adicionar um objeto na lista de objetos e posicionar na cena.
     * @param {*} object 
     * @param {*} pos 
     */
    addAndPlaceObject: async function (input) {
        return new Promise(async (resolve) => {
            // for (let vox of object.voxels){
            //     let voxPos = new THREE.Vector3().copy(pos);
            //     voxPos.add(vox.cube.position);
            //     let obj = new THREE.Mesh(boxGeometry);
            //     obj.position.copy(voxPos);
            //     let objBB = new THREE.Box3().setFromObject(obj);
            //     voxelsBBs.push(objBB);
            //     let helper = new THREE.Box3Helper( objBB, 'red' );
            //     collisionHelpers.push(helper);
            //     scene.add(helper)
            //     helper.visible = false;
            // }

            // await createCollisionMap(object.voxels.map(e=>{
            //     let voxPos = new THREE.Vector3().copy(pos).add(e.cube.position);
            //     return {
            //         x: (voxPos.x + 5)/VX,
            //         y: (voxPos.y + 5)/VX,
            //         z: (voxPos.z + 5)/VX
            //     }
            // }))

            // this.objects.push(object);
            // object.main.position.set(pos.x, pos.y, pos.z);
            // scene.add(object.main);

            const { positions, textures, mainPos, isTemple } = input;

            await createCollisionMap(positions.map(e => {
                let voxPos = new THREE.Vector3().copy(mainPos).add(e);
                return {
                    x: (voxPos.x + 5) / VX,
                    y: (voxPos.y + 5) / VX,
                    z: (voxPos.z + 5) / VX
                }
            }))

            let meshPositions = [];

            if (isTemple) {
                meshPositions = splitTemple(positions);
            } else { //is tree
                textures[0].transparent = true;
                meshPositions.push(positions.filter(e => e.x !== 5 || e.z !== 5));
                meshPositions.push(positions.filter(e => e.x === 5 && e.z === 5));
            }


            for (let i = 0; i < meshPositions.length; i++) {
                await this.createInstancedMesh(
                    meshPositions[i].map(e => e = e.add(mainPos)),
                    textures[i]
                );
            }



            //if tree


            // for (const texture of textures){
            //     texture.transparent = true;
            //     let meshPositions = positions.filter(objectCallback);

            // }

            resolve(true);
        })
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
    scale: new THREE.Vector3(VX / 2, VX / 2, VX / 2),
    walkAction: null,
    yvelocity: 0,
    playerBox: null,

    loadPlayer: function () {
        return new Promise((resolve) => {
            // let loader = new GLTFLoader();
            // loader.load(
            //     'src/assets/steve.glb',
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

    initPlayer: function () {
        return this.loadPlayer();
    },

    setPlayerPosition: function (pos) {
        this.object.position.copy(pos)
        this.createPlayerBbox(pos);
    },

    //TESTE DE COLISÃO
    createPlayerBbox: function (pos) {
        let colGeo = new THREE.BoxGeometry(8, 18, 8);
        this.playerBox = new THREE.Mesh(colGeo);
        this.playerBox.position.copy(pos).add(new THREE.Vector3(0, 0, 0));;
        this.pbb = new THREE.Box3().setFromObject(this.playerBox);
        let phelp = new THREE.Box3Helper(this.pbb, 'green');
        collisionHelpers.push(phelp);
        scene.add(phelp);
        phelp.visible = false;
    },

    updateCollisionBox: function () {
        if (this.playerBox && this.pbb) {
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
function loadFile(path, pos) {
    return new Promise((resolve, reject) => {
        path = `src/assets/${path}`;
        let isTemple = false;
        let itemTextures;
        if (path !== "src/assets/templo_divino.json") {
            itemTextures = getTreeTextures(path.split('/')[2].split('.')[0]);
        } else {
            isTemple = true;
            itemTextures = getTempleTextures();
        }
        //console.log(path);
        fetch(path)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ao buscar o arquivo: ${response.statusText}`);
                }
                return response.text();
            })
            .then(async data => {
                let dataJson = JSON.parse(data);
                let newObject = new THREE.Object3D();
                let listOfVoxels = []
                let itensPositions = [];
                for (let item of dataJson) {
                    let itemMaterial = null;

                    // if (path !== "src/assets/templo_divino.json") {
                    //     if (item.pos.x === 5 && item.pos.z === 5){ //é tronco
                    //         itemMaterial = treeTextures.log;
                    //     } else { //é folha
                    //         //console.log(path);
                    //         itemMaterial = treeTextures.leaves;
                    //         itemMaterial.transparent = true;
                    //     }
                    // } else {
                    //     const {y, x, z} = item.pos;
                    //     if (y === 5){
                    //         itemMaterial = new THREE.MeshLambertMaterial({ map: TEXTURES[28].texture, color: 'white' })
                    //     } else if (y > 5 && y < 55){
                    //         if (x >= -5 && x <= 5 && z >= -5 && z <= 5){
                    //             itemMaterial = new THREE.MeshLambertMaterial({ map: TEXTURES[16].texture, color: 'white' })
                    //         } else {
                    //             itemMaterial = new THREE.MeshLambertMaterial({ map: TEXTURES[27].texture, color: 'white' })
                    //         }
                    //     } else {
                    //         itemMaterial = new THREE.MeshLambertMaterial({ map: TEXTURES[31].texture, color: 'white' })
                    //     }
                    // }

                    // let vectorPos = new THREE.Vector3(x, y, z);
                    // vectorPos = vectorPos.add(pos);
                    // itensPositions.push(vectorPos);




                    // let newVoxel = new Voxel(item.pos, itemMaterial, false, true);

                    // listOfVoxels.push(newVoxel);
                    // newObject.add(newVoxel.getObject());
                }

                await map.addAndPlaceObject(

                    {
                        mainPos: pos,
                        positions: dataJson.map(e => e = new THREE.Vector3(e.pos.x, e.pos.y, e.pos.z)),
                        textures: itemTextures,
                        isTemple: isTemple
                    },
                    pos
                );
                resolve();
            })
            .catch(error => {
                console.error('Erro:', error);
                reject(error);
            });
    })
}

const fogControls = {
    near: 0,
    far: 350,
    fog: true,
    changeFog: function () {
        scene.fog = new THREE.Fog(FOG_COLOR, this.near, this.far)
        map.setLightTam(this.far * (2 / 3));
    },
    disableFog: function () {
        console.log(`FOG: ${this.fog}`);
        scene.fog = new THREE.Fog(FOG_COLOR, .1, 10000);
    },
    enableFog: function () {
        console.log(`FOG: ${this.fog}`);
        scene.fog = new THREE.Fog(FOG_COLOR, .1, 350)
        map.setLightTam(this.far * (2 / 3));
    },
    setFog: function (input) {
        this.fog = input || !this.fog;

        if (this.fog) {
            this.enableFog();
            scene.background = new THREE.Color(FOG_COLOR);
        } else {
            this.disableFog();
            scene.background = cubeTexture;
        }
    }
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


// Contrói a GUI

function initControlInformation() {
    let controlsInfo = new InfoBox();
    controlsInfo.infoBox.id = "controlsInfoBox";
    controlsInfo.add("Move:        WASD");
    controlsInfo.add("Move Alt.:   ↑←↓→");
    controlsInfo.add("Jump:       Space");
    controlsInfo.add("Jump Alt.: RClick");
    controlsInfo.add("Dis./Next Song: Q");
    controlsInfo.add("Coll. Help:     R");
    controlsInfo.add("Shadow Help:    H");
    controlsInfo.add("Câmera:         C");
    controlsInfo.add("Toggle Fog:     F");
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

function setMaterial(index) {
    const dirtGrass = [2, 3, 4];
    if (!dirtGrass.includes(index)) {
        let vxMat = new THREE.MeshLambertMaterial({ map: TEXTURES[index].texture, color: VOXEL_COLORS[index] });
        return setTextureProperties(vxMat);
    } else {
        let dirtVxSide = setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[13].texture }));
        let grassVxTop = setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[index].texture, color: VOXEL_COLORS[index] }));
        let grassVxBot = setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[10].texture }));
        return [
            dirtVxSide,
            dirtVxSide,
            grassVxTop,
            grassVxBot,
            dirtVxSide,
            dirtVxSide,
        ]
    }
}

function setTextureProperties(texture) {
    texture.map.colorSpace = THREE.SRGBColorSpace;
    texture.map.wrapS = texture.map.wrapT = THREE.RepeatWrapping;
    texture.map.minFilter = texture.map.magFilter = THREE.LinearFilter;
    texture.map.repeat = new THREE.Vector2(1, 1);
    return texture;
}

async function loadTextures() {
    return new Promise(async (resolve) => {
        let textureLoader = new THREE.TextureLoader(loadingManager);
        TEXTURES_NAMES.forEach(texName => {
            let newTexture = textureLoader.load(`${TEXTURES_PATH}${texName}.png`);
            TEXTURES.push({
                name: texName,
                texture: newTexture
            })
        })

        //skyboxTexture = textureLoader.load(`${TEXTURES_PATH}${SKYBOX_TEXTURES[0]}.jpg`);
        // skyboxTexture = textureLoader.load(`${TEXTURES_PATH}${SKYBOX_TEXTURES[0]}`);
        // skyboxTexture = THREE.EquirectangularReflectionMapping;

        resolve(true);
    })
}

function getTempleTextures() {
    return [
        setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[28].texture, color: 'white' })),
        setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[16].texture, color: 'white' })),
        setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[27].texture, color: 'white' })),
        setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[31].texture, color: 'white' }))
    ]
}

function getTreeTextures(treeName) {
    if (treeName === "arvoreAlga") {
        return [
            setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[21].texture, color: 'lawngreen' })),
            setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[21].texture, color: 'lawngreen' }))
        ]
    } else if (treeName === "arvoreFloresta") {
        return [
            setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[24].texture, /*color: 'green'*/ color: 'white' })),
            setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[18].texture, /*color: 'khaki'*/ color: 'white' }))
        ]
    } else if (treeName === "arvoreMontanha") {
        return [
            setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[20].texture, color: 'white' })),
            setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[18].texture, color: '#473211' }))
        ]
    } else if (treeName === "arvoreNeve") {
        return [
            setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[24].texture, color: 'forestgreen' })),
            setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[18].texture, /*color: 'khaki'*/ color: '#964B00' }))
        ]
    } else if (treeName === "arvoreSavana") {
        return [
            setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[21].texture, /*color: 'green'*/ color: 'lawngreen' })),
            setTextureProperties(new THREE.MeshLambertMaterial({ map: TEXTURES[18].texture, color: '#f2c785' }))
        ]
    }
}

function updateFps() {
    frameCount++;
    let currentTime = performance.now();
    let deltaTime = (currentTime - lastTime) / 1000;
    if (deltaTime >= 1) {
        fps = frameCount / deltaTime;
        frameCount = 0;
        lastTime = currentTime;
    }
}

function updateFpsDisplay() {
    updateFps();
    fpsDisplay.textContent = `FPS: ${fps.toFixed(2)}`;
}

/* FUNÇÕES DE COLISÃO */

async function createCollisionMap(coordinates) {
    return new Promise(async (resolve) => {
        coordinates.forEach(e => {
            let vox = new THREE.Mesh(boxGeometry);
            vox.position.copy(new THREE.Vector3(
                e.x * VX - 5,
                e.y * VX - 5,
                e.z * VX - 5
            ));
            let voxBb = new THREE.Box3().setFromObject(vox);
            voxelsBBs.push(voxBb);
            // let helper = new THREE.Box3Helper(voxBb, 'red');
            // collisionHelpers.push(helper);
            // scene.add(helper);
            // helper.visible = false;
        })
        resolve(true);
    })
}

function setCollisionHelpersVisible() {
    collisionHelpers.forEach(e => e.visible = !e.visible);
}

function getNearbyVoxels() {
    const radius = 2;
    const nearbyBoxes = [];

    const playerPos = player.pbb.getCenter(new THREE.Vector3());
    let px = Math.round(playerPos.x / VX); if (px == 0) px = 0;
    let py = Math.round(playerPos.y / VX); if (py == 0) py = 0;
    let pz = Math.round(playerPos.z / VX); if (pz == 0) pz = 0;

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

function isOnGround() {
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

/* FUNÇÕES DE INTERAÇÃO COM O AMBIENTE */

function highlightSelectedVoxel(voxel) {
    highlightBox.visible = false;

    if (perspective !== "firstperson") return;

    if (voxel) {
        highlightBox.position.copy(voxel.getCenter((new THREE.Vector3())));
        highlightBox.visible = true;
    }

    return;
}

function getSelectedVoxel() {
    if (perspective !== "firstperson") return;
    raycaster.setFromCamera(mouse, camera);

    const nearbyBoxes = getNearbyVoxels();

    // if (nearbyBoxes.length){
    //     for (let box of nearbyBoxes){
    //         if (raycaster.ray.intersectsBox(box)){
    //             return box;
    //         }
    //     }   
    // }

    // return;

    let closestVoxel = null;
    let closestDistance = Infinity; // Start with a very large distance.

    if (nearbyBoxes.length) {
        for (let box of nearbyBoxes) {
            if (raycaster.ray.intersectsBox(box)) {
                // Get the intersection point
                const intersectionPoint = raycaster.ray.intersectBox(box, new THREE.Vector3());

                // Calculate the distance from the camera to the intersection point
                const distance = raycaster.ray.origin.distanceTo(intersectionPoint);

                // Check if the current box is closer than the previously closest one
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestVoxel = box; // Update the closest voxel
                }
            }
        }
    }

    return closestVoxel;
}

async function removeSelectedVoxel(voxelBox) {
    if (perspective !== "firstperson" || !voxelBox) return;

    const voxelCenter = voxelBox.getCenter(new THREE.Vector3());

    const voxelPosKey = `${voxelCenter.x},${voxelCenter.y},${voxelCenter.z}`;

    if (voxelPosMap.has(voxelPosKey)) {
        const { instanceId, meshId } = voxelPosMap.get(voxelPosKey);
        const instancedMesh = map.instancedMeshes[meshId];



        const lastIndex = instancedMesh.count - 1;
        const matrix = new THREE.Matrix4();
        instancedMesh.getMatrixAt(lastIndex, matrix);
        instancedMesh.setMatrixAt(instanceId, matrix);

        instancedMesh.count--;
        instancedMesh.instanceMatrix.needsUpdate = true;

        //console.log(instancedMesh);

        await fadeOutVoxel(instancedMesh.material, voxelCenter);

        removeFromCollisionMap(voxelBox);
    }

}

function removeFromCollisionMap(voxelBox) {
    let center = new THREE.Vector3();
    voxelBox.getCenter(center);

    let gridX = Math.round(center.x / VX); if (gridX == 0) gridX = 0;
    let gridY = Math.round(center.y / VX); if (gridY == 0) gridY = 0;
    let gridZ = Math.round(center.z / VX); if (gridZ == 0) gridZ = 0;

    let mapKey = `${gridX},${gridY},${gridZ}`;

    if (occupiedVoxels.has(mapKey)) {
        occupiedVoxels.delete(mapKey);
    }

}

function toggleCrosshair() {
    let crosshair = document.getElementById("crosshair");
    if (crosshair.style.visibility === "hidden") {
        crosshair.style.visibility = "visible";
    } else {
        crosshair.style.visibility = "hidden";
    }
    crosshair.offsetHeight;

}

async function fadeOutVoxel(material, position) {
    return new Promise((resolve) => {
        let fadingMaterial = Array.isArray(material) ? material.map(mat => mat.clone()) : material.clone();

        if (Array.isArray(fadingMaterial)) {
            fadingMaterial.forEach(mat => {
                mat.transparent = true;
                mat.opacity = 1.0;
            });
        } else {
            fadingMaterial.transparent = true;
            fadingMaterial.opacity = 1.0;
        }

        let fadingOutVoxel = new THREE.Mesh(
            new THREE.BoxGeometry(VX, VX, VX),
            fadingMaterial
        );

        fadingOutVoxel.position.copy(position);
        scene.add(fadingOutVoxel);

        let currentStep = 0;

        removeSoundEffect.play();

        const fadeInterval = setInterval(() => {
            let alpha = 1 - (currentStep / steps);

            if (alpha <= 0) {

                clearInterval(fadeInterval);
                scene.remove(fadingOutVoxel);
                fadingOutVoxel.geometry.dispose();
                if (Array.isArray(fadingMaterial)) {
                    fadingMaterial.forEach(mat => mat.dispose());
                } else {
                    fadingMaterial.dispose();
                }
            } else {
                if (Array.isArray(fadingMaterial)) {
                    fadingMaterial.forEach(mat => (mat.opacity = alpha));
                } else {
                    fadingMaterial.opacity = alpha;
                }
            }

            currentStep++;
        }, interval);

        resolve(true);
    })
}


/* FIM DAS FUNÇÕES DE INTERAÇÃO COM O AMBIENTE */

/* FUNÇÕES DE MOVIMENTO e JOGADOR */

function isPlayerMoving() {
    return forwardPressed || leftPressed || backwardPressed || rightPressed;
}

/**
 * Para completamente o personagem.
 */
function stopAnyMovement() {
    forwardPressed = false;
    backwardPressed = false;
    leftPressed = false;
    rightPressed = false;
}

function animateCharacter(delta) {
    if (isPlayerMoving() || !isOnGround()) {
        player.walkAction.update(delta);
    }
}

function jump() {
    if (isOnGround() && !isJumping) {
        isJumping = true;
        player.yvelocity = 1;
    }
}

function updatePlayer(delta) {

    if (!isOnGround()) {
        if (player.yvelocity > -5) {
            player.yvelocity -= 0.04;
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

    if (player.object.position.y < -20 * VX) {
        player.object.position.copy(playerIntialPos);
    }

    FPCamera.position.copy(player.object.position);
}

function changePerspective() {

    if (camera === orbitCamera) {
        // ORBIT => CONTROL

        //fogControls.setFog();

        //Altera info dos controles
        const el = document.getElementById("OrbitInfoBox");
        if (el) el.remove();
        toggleCrosshair();

        //Altera a câmera e prende o mouse
        camera = FPCamera;
        FPControls.lock();
        perspective = "firstperson";
    } else {
        // CONTROL => ORBIT

        //fogControls.setFog();

        //Altera info dos controles
        const el = document.getElementById("ControlInfoBox");
        if (el) el.remove();
        toggleCrosshair();

        //Altera a câmera e libera o mouse
        perspective = "orbital";
        camera = orbitCamera;
        FPControls.unlock();
        stopAnyMovement(); //resolve o bug de trocar de perspectiva enquanto pressiona uma tecla faz o personagem andar infinitamente
    }
}

/* FIM FUNÇÕES DE MOVIMENTO e JOGADOR */

/* FUNCOES DE SOM */

async function loadAudio(url) {
    return new Promise((resolve, reject) => {
        audioLoader.load(url, buffer => resolve(buffer), undefined, err => reject(err));
    });
}

async function initAudio() {
    camera.add(listener);

    removeEffectBuffer = await loadAudio(`${SOUND_PATH}${SOUNDS[0]}`);
    removeSoundEffect = new THREE.Audio(listener);
    removeSoundEffect.setBuffer(removeEffectBuffer);
    removeSoundEffect.setVolume(EFFECTS_VOL);
    isMusicPlaying = false;


    backgroundMusic = new THREE.Audio(listener);
    for (let bgMusic of MUSIC) {
        backgroundMusicBuffer.push(await loadAudio(`${SOUND_PATH}${bgMusic}`))
    };
}

function playRandomMusic() {
    const randomSong = Math.floor(Math.random() * backgroundMusicBuffer.length);

    backgroundMusic.setBuffer(backgroundMusicBuffer[randomSong])
    backgroundMusic.setLoop(true);
    backgroundMusic.setVolume(MUSIC_VOL);
    backgroundMusic.play();
    isMusicPlaying = true;

    // backgroundMusic.onEnded = () => {
    //     console.log("KBO");
    //     playRandomMusic();
    // };
}

function toggleMusic() {
    if (isMusicPlaying) {
        backgroundMusic.stop();
        isMusicPlaying = false;
    } else {
        playRandomMusic();
    }
}

async function initLoadingManager() {
    loadingManager = new THREE.LoadingManager();

    loadingManager.onStart = function (url, itemsLoaded, itemsTotal) {
        console.log('Started loading: ' + url);
        console.log('Items loaded: ' + itemsLoaded + '/' + itemsTotal);
    };

    loadingManager.onLoad = function () {
        console.log('All items loaded');
        const startButton = document.getElementById('start-button');
        if (startButton) {
            startButton.classList.add('enabled');
            startButton.disabled = false;
            startButton.style.backgroundColor = 'green';
            startButton.style.cursor = 'pointer';
            startButton.style.opacity = 1;
        }

        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.innerText = "Assets loaded!"
        }
    };

    loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
        console.log('Loading: ' + url);
        const progress = (itemsLoaded / itemsTotal) * 100;
        console.log(`Loading progress: ${progress.toFixed(2)}%`);

        const progressBarFill = document.getElementById('progress-bar-fill');
        if (progressBarFill) {
            progressBarFill.style.width = `${progress}%`
        }

        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.innerText = `${Math.round(progress)}%`;
        }
    };

    loadingManager.onError = function (url) {
        console.log(`There was an error loading: ${url}`);
    };

    const startButton = document.getElementById('start-button');
    if (startButton) {
        startButton.addEventListener('click', () => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                canStartGame = true;
                loadingScreen.style.display = 'none';
            }
        });
    }
}

/* FIM DAS FUNCOES DE SOM */

function loadSkyTexture() {
    // const textureLoader = new THREE.TextureLoader(loadingManager);
    // //let textureEquirec = textureLoader.load(`${TEXTURES_PATH}${SKYBOX_TEXTURES[0]}.jpg`);
    // let textureEquirec = textureLoader.load(`${TEXTURES_PATH}${SKYBOX_TEXTURES[0]}`);
    // textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
    // textureEquirec.colorSpace = THREE.SRGBColorSpace;
    // scene.background = textureEquirec;

    cubeTexture = new CubeTextureLoaderSingleFile().loadSingle(`${TEXTURES_PATH}${SKYBOX_TEXTURES[4]}`, 1);
    scene.background = cubeTexture;
}

function updateDirLight() {
    map.dirLight.position.copy(player.object.position).add(map.dirLightOffset);
}

function animate() {
    const delta = Math.min(clock.getDelta(), 0.1);
    requestAnimationFrame(animate);
    updatePlayer(delta / 5);
    updateDirLight();
    updateFpsDisplay();
    renderer.render(scene, camera);
}

function initiateScene() {

    instructions.addEventListener('click', function () {

        if (perspective === "firstperson") FPControls.lock();

    }, false);

    FPControls.addEventListener('lock', function () {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });

    FPControls.addEventListener('unlock', function () {
        if (perspective === "firstperson") {
            blocker.style.display = 'block';
            instructions.style.display = '';
        }
    });

    window.addEventListener('mousedown', (event) => {
        if (event.button === 2) {
            jump();
        }
    });

    window.addEventListener('mousemove', () => {
        const selectedVoxel = getSelectedVoxel();
        highlightSelectedVoxel(selectedVoxel);
    });

    window.addEventListener('click', () => {
        const selectedVoxel = getSelectedVoxel();
        removeSelectedVoxel(selectedVoxel);
    });

    //CONTROLES
    window.addEventListener('keydown', (event) => {
        switch (event.code) {
            case 'KeyW': forwardPressed = true; break;
            case 'ArrowUp': forwardPressed = true; break;
            case 'KeyA': leftPressed = true; break;
            case 'ArrowLeft': leftPressed = true; break;
            case 'KeyS': backwardPressed = true; break;
            case 'ArrowDown': backwardPressed = true; break;
            case 'KeyD': rightPressed = true; break;
            case 'ArrowRight': rightPressed = true; break;
            case 'KeyQ': /* stopAnyMovement() */ toggleMusic(); break;
            case 'KeyY': /* invert Y */toggleCrosshair(); break;
            case 'KeyC': if (canStartGame) changePerspective(); break;
            case 'KeyH': shadowHelper.visible = !shadowHelper.visible; break;
            case 'KeyR': setCollisionHelpersVisible(); break;
            case 'KeyF': fogControls.setFog(); break;
            case 'Space': jump(); break;
        }
    });

    window.addEventListener('keyup', (event) => {
        switch (event.code) {
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
}

async function init() {
    await loadTextures();
    await loadSkyTexture();
    buildInterface();
    initControlInformation();

    map.create().then(() => {
        let y = map.collisionCoordinates.find(e => e.x === 0 && e.z === 0).y;
        player.initPlayer().then(async () => {
            playerIntialPos = new THREE.Vector3(
                0,
                y * VX + 2 * VX,
                0
            );

            player.setPlayerPosition(playerIntialPos);

            initiateScene();

            createCollisionMap(map.collisionCoordinates);
            voxelsBBs.forEach(bb => addVoxelToMap(bb));

            scene.fog = new THREE.Fog(FOG_COLOR, MIN_FOG, MAX_FOG);

            map.dirLight.target = player.object;

            camera = FPCamera;

            shadowHelper = new THREE.CameraHelper(map.dirLight.shadow.camera);
            shadowHelper.visible = false;
            scene.add(shadowHelper);
            changePerspective();
            fogControls.setFog(false);

            toggleCrosshair();
            await initAudio();

            animate();
        });
    });
}

initLoadingManager();
init();

//fog apaga skybox OK!
//alterar nome do AR
//texturas
//movimento NAO OK MAS OK
//loadscreen ok
//facicon.ico ok
//nome da aplicacao: Voxy Realm