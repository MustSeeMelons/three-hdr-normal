import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { HDRCubeTextureLoader } from "three/examples/jsm/loaders/HDRCubeTextureLoader";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

const envPath = "env/";
const texPath = "textures/";
const format = ".hdr";
const urls = [
  envPath + "px" + format,
  envPath + "nx" + format,
  envPath + "py" + format,
  envPath + "ny" + format,
  envPath + "pz" + format,
  envPath + "nz" + format,
];
let envMap;

const texPathMap = {
  color: `${texPath}color.jpg`,
  normal: `${texPath}normal.jpg`,
  disp: `${texPath}disp.png`,
  ao: `${texPath}ao.jpg`,
  rough: `${texPath}rough.jpg`,
};

const texMap = {};

const Root = () => {
  let rootRef = useRef(null);
  let scene;
  let camera;
  let controls;
  let renderer;

  const setupScene = () => {
    const container = rootRef.current;
    const width = 1024;
    const height = 720;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
    camera.position.z = 400;

    controls = new OrbitControls(camera, container);

    // controls.autoRotateSpeed = 5;
    // controls.autoRotate = true;

    renderer = new THREE.WebGLRenderer({
      antialias: true,
    });

    renderer.setSize(width, height);

    container.appendChild(renderer.domElement);
  };

  const loadResources = () => {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const promises = [];

    Object.keys(texPathMap).forEach((texKey) => {
      const promise = new Promise((resolve, reject) => {
        new THREE.TextureLoader().load(
          texPathMap[texKey],
          (texture) => {
            texture.repeat = new THREE.Vector2(5, 5);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texMap[texKey] = texture;
            resolve();
          },
          undefined,
          (err) => {
            console.error(err, texKey);
            reject();
          }
        );
      });

      promises.push(promise);
    });

    const promise = new Promise((resolve, reject) => {
      new HDRCubeTextureLoader().setDataType(THREE.FloatType).load(
        urls,
        (texture) => {
          const renderTarget = pmremGenerator.fromCubemap(texture);
          envMap = renderTarget.texture;
          scene.background = renderTarget.texture;
          resolve();
        },
        undefined,
        (err) => {
          console.error(err);
          reject();
        }
      );
    });

    promises.push(promise);

    return Promise.all(promises);
  };

  const loadModels = () => {
    new STLLoader().load(
      "models/Palmrest.STL",
      (geometry) => {
        geometry.scale(2, 2, 2);
        geometry.applyMatrix4(
          new THREE.Matrix4().makeTranslation(-100, -20, -120)
        );

        const mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({
            color: 0xdedede,
            flatShading: false,
            metalness: 0,
            roughness: 0.5,
            // map: texMap["color"],
            side: THREE.DoubleSide,
            normalMap: texMap["normal"],
            // displacementMap: texMap["disp"],
            // roughnessMap: texMap["rough"],
            // aoMap: texMap["ao"],
            envMap: envMap,
            envMapIntensity: 1,
          })
        );
        scene.add(mesh);
      },
      undefined,
      (err) => {}
    );
  };

  const populateScene = () => {
    var geometry = new THREE.SphereGeometry(100, 100, 100);

    var material = new THREE.MeshStandardMaterial({
      color: 0xdedede,
      flatShading: false,
      metalness: 0,
      roughness: 0.5,
      map: texMap["color"],
      normalMap: texMap["normal"],
      displacementMap: texMap["disp"],
      roughnessMap: texMap["rough"],
      aoMap: texMap["ao"],
      envMap: envMap,
      envMapIntensity: 1,
    });

    var cube = new THREE.Mesh(geometry, material);
    // scene.add(cube);

    var ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
  };

  const startAnimationLoop = () => {
    controls.update();
    renderer.render(scene, camera);
    window.requestAnimationFrame(startAnimationLoop);
  };

  useEffect(() => {
    (async () => {
      setupScene();
      await loadResources();
      populateScene();
      loadModels();

      startAnimationLoop();
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={rootRef}></div>;
};

export { Root };
