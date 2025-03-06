import * as THREE from '../../build/three.module.js';

/**
 * Initialize a simple default renderer and binds it to the "webgl-output" dom
* element.
 *
 * @param additionalProperties Additional properties to pass into the renderer
 */
export function initRendererWithAntialias(color = "rgb(0, 0, 0)", shadowMapType = THREE.PCFSoftShadowMap ) {

    //var props = (typeof additionalProperties !== 'undefined' && additionalProperties) ? additionalProperties : {};
    var renderer = new THREE.WebGLRenderer({antialias: true});
    //renderer.useLegacyLights = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMapSoft = true;
    renderer.shadowMap.type = shadowMapType;
 
    renderer.setClearColor(new THREE.Color(color));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById("webgl-output").appendChild(renderer.domElement);
 
    return renderer;
 }