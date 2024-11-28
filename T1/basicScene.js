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
import Voxel, { MATERIALS } from './voxel.js'
import { Material, Vector2, Vector3 } from '../build/three.module.js';

const VX = 10;

let scene, renderer, camera, light, orbit, keyboard, newStructure, voxelColors, materialsIndex = 0; // Initial variables
scene = new THREE.Scene();    // Create main scene
renderer = initRenderer();    // Init a basic renderer
light = initDefaultBasicLight(scene); // Create a basic light to illuminate the scene
camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(50, 75, 100);
orbit = new OrbitControls(camera, renderer.domElement); // Enable mouse rotation, pan, zoom etc.
keyboard = new KeyboardState();
voxelColors = [
  'greenyellow',
  'darkgoldenrod',
  'darkgreen'
]

let { materials, lineMaterials } = initMaterials(voxelColors);

// Criando o plano para compor a cena
let groundPlane = createGroundPlaneXZ(110, 110, 40, 40); // width, height, resolutionW, resolutionH
scene.add(groundPlane);

// Listen window size changes
window.addEventListener('resize', function () { onWindowResize(camera, renderer) }, false);

// Show axes (parameter is size of each axis)
let axesHelper = new THREE.AxesHelper(12);
scene.add(axesHelper);

// Criando voxel de highlight (cursor)
let highlightVoxel = new Voxel({ x: 0, y: 0, z: 0 }, voxelColors[materialsIndex], true);
highlightVoxel.changeSize(1.05);
highlightVoxel.place(scene);
highlightVoxel.getObject().add(camera);

// Objeto em contrução e sua funções
// window.currentBuild = { // Somente para teste no console, depois mudar para linha baixo
const currentBuild = {
    /**
     * Matriz contendo os Voxels (classe completa).
     * 
     * Exemplo de funcionamento:
     * - Célula [0][0][0] corresponde a posição (-5, 0, -5) no grid.
     * - Célula [5][0][5] corresponde a posição (0, 0, 0) no grid.
     * - Célula [9][0][9] corresponde a posição (4, 0, 4) no grid.
     */
    matrix: [],
    /**
     * Quantidade de Voxels presentes nessa estrutura.
     */
    size: 0,
    /**
     * Limpa a matriz e a recontrói novamente com campos nulos.
     */
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
     * Função chamada pela GUI para alterar o material selecionado
     */
    nextMaterial: function () {
        materialsIndex = (materialsIndex + 1) % materials.length;
        highlightVoxel.changeMaterial(lineMaterials[materialsIndex]);
    },
    /**
     * Função chamada pela GUI para criar um novo Voxel na posição passada.
     */
    createVoxel: function (pos = highlightVoxel.getObject().position,  material = 1) {
        if (!this.isCellEmpty(pos)) {
            // TODO Criar aviso de erro
            console.log("Espaço ocupado!")
        } else {
            let newVoxel = new Voxel(pos, voxelColors[materialsIndex], false, true);
            this.setValueToMatrixCell(pos, newVoxel);
            newVoxel.place(scene);
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
            // TODO Criar aviso
            console.log("Espaço vazio!")
        }
    },
    /**
     * Deleta todos os Voxels da cena e chama a função de recriar a matriz.
     * @returns 
     */
    clearBuild: function () {
      let voxelsFound = 0; // Contador usado para diminuir o tempo percorrendo a matriz.
      let voxeldToBeFound = this.size;
      for (let y = 0; y < 10; y++) {
          for (let x = 0; x < 10; x++) {
              for (let z = 0; z < 10; z++) {
                  if (this.matrix[x][y][z] != null) {
                      scene.remove(this.matrix[x][y][z].getObject());
                      voxelsFound++;
                      if (voxelsFound == voxeldToBeFound) {
                          this.buildMatrix();
                          return;
                      }
                  }
              }
          }
      }
  },
  /**
   * Cria e retorna todos os Voxels da matriz atual em uma lista
   * com objetos contendo os campos:
   * - pos: **objeto** contendo as posições **x**, **y**, **z** do Voxel.
   * - material: **inteiro** correspondente a um tipo de material. 
   * @returns 
   */
    getData: function () {
      let data = [];
      let voxelsFound = 0; // Contador usado para diminuir o tempo percorrendo a matriz.
      let voxeldToBeFound = this.size;
      for (let y = 0; y < 10; y++) {
          for (let x = 0; x < 10; x++) {
              for (let z = 0; z < 10; z++) {
                  if (this.matrix[x][y][z] != null) {
                      let voxel = this.matrix[x][y][z]
                      let voxelObject = voxel.getObject()
                      data.push({
                          pos: {
                              x: voxelObject.position.x,
                              y: voxelObject.position.y,
                              z: voxelObject.position.z,
                          },
                          material: voxel.color // TODO Mudar depois que tivermos os materiais
                      })
                      voxelsFound++;
                      if (voxelsFound == voxeldToBeFound) {
                          return data;
                      }
                  }
              }
          }
      }
      return data;
    }
}

const saveControls = {
  /**
   * Nome da estrutura.
   */
  title: "",
  newStructure: null,
  /**
   * Função chamada pela GUI alterar o nome do arquivo. 
   */
  changeFileName: function(title){
        this.title = title;
  },
  saveStructure: function () {
    let data = currentBuild.getData();
    let fileName = this.title;
    if (!fileName.length) fileName = "unnamed_structure";

    const blob = new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
  loadStructure: function () {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".json";
      fileInput.onchange = () => {
          const file = fileInput.files[0]; 
          if (!file) {
              console.error("Nenhum arquivo selecionado.");
              return;
          }
  
          const reader = new FileReader();
  
          reader.onload = (event) => {
              try {
                  const data = JSON.parse(event.target.result); 
                  this.newStructure = data;
              } catch (error) {
                  console.error("Erro ao processar o arquivo JSON:", error);
              }
          };
  
          reader.onerror = () => {
              console.error("Erro ao carregar o arquivo.");
          };
  
          reader.readAsText(file);
      };
  
      fileInput.click();
  },
  showNewStructure: function () {
      if (!this.newStructure) {
          console.error("Nenhum estrutura nova para ser mostrada.")
      } else {
          currentBuild.clearBuild();
          for (let item in this.newStructure) {
              currentBuild.createVoxel(this.newStructure[item].pos, this.newStructure[item].material);
          }
      }
  }
}

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
    if (keyboard.down("P")) saveControls.saveStructure(currentBuild.getData(), "arqTeste");
    if (keyboard.down("I")) saveControls.loadStructure();
    if (keyboard.down("U")) saveControls.showNewStructure();

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
    
    let fileManageamentFolder = gui.addFolder("Arquivo");
    fileManageamentFolder.open();
    fileManageamentFolder.add(saveControls, 'changeFileName').onFinishChange(function (title) { saveControls.changeFileName(title) }).name("Título:");
    fileManageamentFolder.add(saveControls, 'saveStructure').name("Salvar");
    fileManageamentFolder.add(saveControls, 'loadStructure').name("Carregar");

    let voxelFolder = gui.addFolder("Voxel");
    voxelFolder.open();
    voxelFolder.add(currentBuild, 'nextMaterial').name("Próximo material");
    voxelFolder.add(currentBuild, 'createVoxel').name("Criar");
    voxelFolder.add(currentBuild, 'removeVoxel').name("Remover");
}


function getPosition(pos) {
    return new THREE.Vector3(pos.x * VX + VX / 2, pos.y * VX + VX / 2, pos.z * VX + VX / 2);
}

function updateCamera(camera, object) {
    camera.lookAt(object.position);
}

function initMaterials(colors){
    let materials = [];
    let lineMaterials = [];
    colors.forEach((color) => {
      materials.push(setDefaultMaterial(color)),
      lineMaterials.push(new THREE.LineBasicMaterial({ color: color }))
    })

    return {
      materials: materials,
      lineMaterials: lineMaterials
    }
}