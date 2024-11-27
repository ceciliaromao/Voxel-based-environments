import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
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
import Voxel from './voxel.js'
import { Material, Vector2, Vector3 } from '../build/three.module.js';

const VX = 10;

let scene, renderer, camera, material, light, orbit, keyboard, newStructure; // Initial variables
scene = new THREE.Scene();    // Create main scene
renderer = initRenderer();    // Init a basic renderer
material = setDefaultMaterial(); // create a basic material
light = initDefaultBasicLight(scene); // Create a basic light to illuminate the scene
camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(50, 75, 100);
orbit = new OrbitControls(camera, renderer.domElement); // Enable mouse rotation, pan, zoom etc.
keyboard = new KeyboardState();

// Criando o plano para compor a cena
let groundPlane = createGroundPlaneXZ(110, 110, 40, 40); // width, height, resolutionW, resolutionH
scene.add(groundPlane);

// Listen window size changes
window.addEventListener('resize', function () { onWindowResize(camera, renderer) }, false);

// Show axes (parameter is size of each axis)
let axesHelper = new THREE.AxesHelper(12);
scene.add(axesHelper);

// Criando voxel de highlight (cursor)
let myMaterial = setDefaultMaterial();
let highlightVoxel = new Voxel({ x: 0, y: 0, z: 0 }, myMaterial, true);
highlightVoxel.changeSize(1.05);
highlightVoxel.place(scene);
highlightVoxel.getObject().add(camera);

// Objeto em contrução e sua funções
window.currentBuild = { // Somente para teste no console, depois mudar para linha baixo
    // const currentBuild = {
    matrix: [],
    size: 0,
    buildMatrix: function () // Cria a matriz que armazena os voxels
    {
        this.matrix = [];
        for (let i = 0; i < 10; i++) {
            const plane = [];
            for (let j = 0; j < 10; j++) {
                const row = new Array(10).fill(null); // Cria uma linha preenchida com `null`
                plane.push(row);
            }
            this.matrix.push(plane);
        }
    },
    /**
     * Obtém a posição na matriz.
     * @param {*} pos Posição no mundo.
     * @returns 
     */
    getMatrixPosition: function (pos) {
        let factor = 5 * (VX - 1);
        return new Vector3((pos.x + factor) / VX, (pos.y - 5) / VX, (pos.z + factor) / VX);
    },
    /**
     * Retorna o objeto Voxel na posição passada.
     * @param {*} pos Posição no mundo.
     */
    getVoxelByPosition: function (pos) {
        pos = this.getMatrixPosition(pos);
        return this.matrix[pos.x][pos.y][pos.z];
    },
    /**
     * Verifica se a celula da matriz está vazia.
     * @param {*} pos Posição no mundo.
     * @returns 
     */
    isCellEmpty: function (pos) {
        pos = this.getMatrixPosition(pos);
        return this.matrix[pos.x][pos.y][pos.z] == null;
    },
    /**
     * Define um valor para uma posição na matriz.
     * @param {*} pos Posição no mundo.
     * @param {*} value Valor a ser definido.
     */
    setValueToMatrixCell: function (pos, value) {
        pos = this.getMatrixPosition(pos);
        this.matrix[pos.x][pos.y][pos.z] = value;
        this.size += value == null ? -1 : 1;
    },
    /**
     * Função chamada pela GUI para criar um novo Voxel na posição do highlight.
     */
    createVoxel: function () {
        let pos = highlightVoxel.getObject().position;
        if (!this.isCellEmpty(pos)) {
            // Criar aviso de erro
            console.log("Espaço ocupado!")
        } else {
            let newVoxel = new Voxel(pos, setDefaultMaterial(), false, true);
            this.setValueToMatrixCell(pos, newVoxel);
            scene.add(newVoxel.getObject());
        }
    },
    /**
     * Função chamada pela GUI para remover um Voxel na posição do highlight. 
     */
    removeVoxel: function () {
        let pos = highlightVoxel.getObject().position;
        if (!this.isCellEmpty(pos)) {
            let voxel = this.getVoxelByPosition(pos);
            this.setValueToMatrixCell(pos, null);
            scene.remove(voxel.getObject());
            voxel = null; // Desalocação de memória
        } else {
            // Criar aviso
            console.log("Espaço vazio!")
        }
    }
}

let data = {
    x: 10,
    y: 35,
    z: 60
};

// Variáveis e funções relacionadas ao grid
const grid = {
    array: [], // Array com as camadas do grid
    opacity: 0.0, // Opacidade das camadas
    buildGrid: function () // Criação do grid
    {
        this.array = []; // Reseta o array (Caso necessário)
        for (let i = 0; i < 10; i++) {
            let grid = new THREE.GridHelper(10 * VX, VX);
            grid.translateY(i * VX);
            if (i !== 0) {
                grid.material.transparent = true;
                grid.material.opacity = this.opacity;
            }
            this.array.push(grid);
            scene.add(grid);
        }
    },
    updateGrid: function () // Atualiza a opacidade das camadas do grid
    {
        this.array.forEach((gridLayer) => { gridLayer.material.opacity = this.opacity })
    }
}

currentBuild.buildMatrix();
grid.buildGrid();
buildInterface();
showInformation();
render();

function render() {
    updateCamera(camera, highlightVoxel.getObject())
    requestAnimationFrame(render);
    keyboardUpdate();
    renderer.render(scene, camera) // Render scene
}

function keyboardUpdate() {

    keyboard.update();

    // Salvamento e Carregamento
    if (keyboard.down("P")) saveStructure(data, "arqTeste");
    if (keyboard.down("I")) newStructure = loadStructure();
    if (keyboard.down("U")) showNewStructure(newStructure);

    // Movimentação do Highlight
    if (keyboard.down("D")) highlightVoxel.pushOnX();
    if (keyboard.down("A")) highlightVoxel.pullOnX();
    if (keyboard.down("S")) highlightVoxel.pushOnZ();
    if (keyboard.down("W")) highlightVoxel.pullOnZ();
    if (keyboard.down("E")) highlightVoxel.pushOnY();
    if (keyboard.down("Q")) highlightVoxel.pullOnY();

}

function showInformation() {
    var controls = new InfoBox();
    controls.add("Use P para salvar, I para carregar e U para mostrar objeto carregado");
    controls.show();
}

// Contrói a GUI
function buildInterface() {
    let gui = new GUI();
    
    let gridFolder = gui.addFolder("Grid");
    gridFolder.open();
    gridFolder.add(grid, 'opacity', 0, 1).onChange(function () { grid.updateGrid(); }).name("Opacidade");
    
    let voxelFolder = gui.addFolder("Voxel");
    voxelFolder.open();
    voxelFolder.add(currentBuild, 'createVoxel').name("Criar");
    voxelFolder.add(currentBuild, 'removeVoxel').name("Remover");
}


function saveStructure(data, defaultFilename = "data.json") {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = defaultFilename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function loadStructure() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";

    fileInput.onchange = () => {
        const file = fileInput.files[0];
        if (!file) {
            console.error("Nenhum arquivo selecionado.");
            return;
        }

        const fileUrl = URL.createObjectURL(file);

        fetch(fileUrl)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Não foi possível abrir arquivo: ${response.statusText}`);
                }
                return response.json();
            })
            .then((data) => {
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

function showNewStructure(structure) {
    if (!structure) {
    } else {
    }
}

function getPosition(pos) {
    return new THREE.Vector3(pos.x * VX + VX / 2, pos.y * VX + VX / 2, pos.z * VX + VX / 2);
}

function updateCamera(camera, object) {
    camera.lookAt(object.position);
}


// function checaPosicao(posicao){


// }



// {
//   pos: {x: 1, y: 1, z: 1},
//   existe: true,
//   material: material
// }