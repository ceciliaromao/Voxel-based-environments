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
export const MATERIALS = {
    1: setDefaultMaterial()
    // TODO Colocar todas as cores
}

export default class Voxel {
    constructor(pos = {x: 0, y: 0, z: 0}, color, wireframe = false, worldCoordinates = false){
        this.color = color;
        this.wireframe = wireframe;
        this.geometry = new THREE.BoxGeometry(1*VX, 1*VX, 1*VX);
        if (wireframe){ 
            this.geometry = new THREE.WireframeGeometry(this.geometry);
            const lineMaterial = new THREE.LineBasicMaterial({ color: color });
            this.cube = new THREE.LineSegments(this.geometry, lineMaterial);
        } else {
            this.cube = new THREE.Mesh(this.geometry, new THREE.MeshLambertMaterial({color: color}));
            this.cube.castShadow = true;
        }
        if (worldCoordinates) {
            this.cube.position.set(
                pos.x, 
                pos.y, 
                pos.z
            );    
        } else {
            this.cube.position.set(
                (pos.x)*VX + VX/2, 
                (pos.y)*VX + VX/2, 
                (pos.z)*VX + VX/2
            );
        }
    }

    changeSize(scale){
        this.cube.scale.set(scale, scale, scale);
    }

    changeMaterial(material){
        this.cube.material = material;
    }

    place(scene){
        scene.add(this.cube);
    }

    getObject(){
        return this.cube;
    }

    getPosition(){
        return {
            x: Math.floor(this.cube.position.x / VX),
            y: Math.floor(this.cube.position.y / VX),
            z: Math.floor(this.cube.position.z / VX),
        }
    }

    moveVoxel(pos){
        this.cube.position.set(
            (pos.x)*VX + VX/2, 
            (pos.y)*VX + VX/2, 
            (pos.z)*VX + VX/2
        );
    }

    pushOnX(){
        if (this.wireframe) {
            if ((this.cube.position.x + VX) < 5 * VX) {
                this.cube.translateX(VX);        
            }
        } else {
            this.cube.translateX(VX);
        }
    }

    pullOnX(){
        if (this.wireframe) { 
            if ((this.cube.position.x - VX) > -5 * VX) {
                this.cube.translateX(-VX);
            }
        } else {
            this.cube.translateX(-VX);
        }
    }

    pushOnY(){
        if (this.wireframe) {
            if ((this.cube.position.y + VX) < 10 * VX) {
                this.cube.translateY(VX);        
            }
        } else {
            this.cube.translateY(VX);
        }
    }

    pullOnY(){
        if (this.wireframe) {
            if ((this.cube.position.y - VX) > 0) {
                this.cube.translateY(-VX);        
            }
        } else {
            this.cube.translateY(-VX);
        }
    }

    pushOnZ(){
        if (this.wireframe) {
            if ((this.cube.position.z + VX) < 5 * VX) {
                this.cube.translateZ(VX);        
            }
        } else {
            this.cube.translateZ(VX);
        }
    }

    pullOnZ(){
        if (this.wireframe) {
            if ((this.cube.position.z - VX) > -5 * VX) {
                this.cube.translateZ(-VX);        
            }
        } else {
            this.cube.translateZ(-VX);
        }
    }
}