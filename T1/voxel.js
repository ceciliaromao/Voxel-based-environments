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

const VX = 10;

export default class Voxel {
    constructor(pos = {x: 0, y: 0, z: 0}, material = setDefaultMaterial(), wireframe = false){
        this.geometry = new THREE.BoxGeometry(1*VX, 1*VX, 1*VX);
        if (wireframe){ 
            this.geometry = new THREE.WireframeGeometry(this.geometry);
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
            this.cube = new THREE.LineSegments(this.geometry, lineMaterial);
        } else {
            this.cube = new THREE.Mesh(this.geometry, material);
        }
        this.cube.position.set(
            (pos.x)*VX + VX/2, 
            (pos.y)*VX + VX/2, 
            (pos.z)*VX + VX/2
        );
    }

    changeSize(scale){
        this.cube.scale.set(scale, scale, scale);
    }

    place(scene){
        scene.add(this.cube);
    }

    getObject(){
        return this.cube;
    }

    moveVoxel(pos){
        this.cube.position.set(
            (pos.x)*VX + VX/2, 
            (pos.y)*VX + VX/2, 
            (pos.z)*VX + VX/2
        );
    }

    pushOnX(){
        this.cube.translateX(VX);
    }

    pullOnX(){
        this.cube.translateX(-VX);
    }

    pushOnY(){
        this.cube.translateY(VX);
    }

    pullOnY(){
        this.cube.translateY(-VX);
    }

    pushOnZ(){
        this.cube.translateZ(VX);
    }

    pullOnZ(){
        this.cube.translateZ(-VX);
    }
}