<template>
  <div ref="container" class="container"></div>
</template>

<script>
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
export default {
    name:'StlViewer',
    data(){
        return{
            scene: null,
            camera: null,
            renderer: null,
            mesh:null,
            controls:null,
        }
    },
    watch: {
        // 監控容器大小的變化
        '$refs.container.clientWidth': function (newWidth) {
            this.renderer.setSize(newWidth, this.$refs.container.clientHeight);
            this.camera.aspect = newWidth / this.$refs.container.clientHeight;
            this.camera.updateProjectionMatrix();
        },
        '$refs.container.clientHeight': function (newHeight) {
            this.renderer.setSize(this.$refs.container.clientWidth, newHeight);
            this.camera.aspect = this.$refs.container.clientWidth / newHeight;
            this.camera.updateProjectionMatrix();
        },
    },
    mounted(){
        this.$bus.$on('loadStlFile',this.loadFile);
        this.$bus.$on('removeStlFile',this.removeMesh);
        this.$bus.$on('handleStlConfig',this.handleConfig);
        this.$bus.$on('getStlCenter',this.getCenter)
        this.$bus.$on('handleWireFrame',this.handleWireFrame)
        const container = this.$refs.container;

        // 創建場景
        this.scene = new THREE.Scene();

        // 創建相機
        this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(5,10, 5);
        this.camera.lookAt(0, 0, 0);

        // 創建渲染器
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setClearColor(0xffffff);
        container.appendChild(this.renderer.domElement);

        // 添加光源
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(1, 1, 1).normalize();
        this.scene.add(light);

        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        // 添加網格幫助器
        this.gridHelper = new THREE.GridHelper(1000,1000);
        this.scene.add(this.gridHelper);

        // 添加輔助軸
        const axesHelper = new THREE.AxesHelper(1000);
        this.scene.add(axesHelper);

        // 添加手動控制器
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableRotate = true; // 旋轉
        this.controls.enablePan = true; // 平移
        this.controls.addEventListener('change', this.renderScene);
        this.renderer.render(this.scene, this.camera);

    },
    methods:{
        renderScene() {
            this.renderer.render(this.scene, this.camera);
        },
        handleWireFrame(wireframe){
            this.scene.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    object.material.wireframe = wireframe;
                }
            });
        },
        getCenter(flag){ // 待優化
            const meshes = [];
            const overallCenter = new THREE.Vector3();
            this.scene.traverse((object) => {
                if (object instanceof THREE.Mesh) meshes.push(object)
            });
            meshes.forEach(mesh => {
                mesh.geometry.computeBoundingBox();
                const boundingBox = mesh.geometry.boundingBox;
                const center = new THREE.Vector3();
                boundingBox.getCenter(center);
                overallCenter.add(center);
            });
            overallCenter.divideScalar(meshes.length);
            if(flag){
                meshes.forEach(mesh => {
                    mesh.geometry.translate(-overallCenter.x, -overallCenter.y, -overallCenter.z);
                });
                overallCenter.normalize();
            }
            this.$bus.$emit('setCenter',overallCenter.x,overallCenter.y,overallCenter.z);
        },
        // 調整參數
        handleConfig(prop,config){
            if(prop == 'scale'){
                const boundingBox = new THREE.Box3().setFromObject(this.mesh);
                const size = new THREE.Vector3();
                boundingBox.getSize(size);
                const maxDimension = Math.max(size.x, size.y, size.z);
                const scaleFactor = config.factor / maxDimension;
                this.scene.traverse(function(child) {
                    if (child instanceof THREE.Mesh) {
                        child.scale.x *= scaleFactor;
                        child.scale.y *= scaleFactor;
                        child.scale.z *= scaleFactor;
                    }
                });
            }
            else if(prop == 'dimension'){

            }
        },
        // 刪除物件
        removeMesh(name){
            const meshToRemove = this.scene.getObjectByName(name);
            if (meshToRemove) {
                this.scene.remove(meshToRemove);
                meshToRemove.geometry.dispose();
                meshToRemove.material.dispose();
            }
            this.getCenter();
        },
        // 添加物件
        loadFile(file,config){
            if(!file.name.includes('.stl')) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const contents = e.target.result;
                const loader = new STLLoader();
                const geometry = loader.parse(contents);
                const material = new THREE.MeshPhongMaterial({ color: 0x606060, specular: 0x111111, shininess: 200, wireframe: config.wireframe });
                // 添加資料
                this.mesh = new THREE.Mesh(geometry, material);
                this.mesh.name = file.uid;
                
                const boundingBox = new THREE.Box3().setFromObject(this.mesh);

                // 調整大小
                const size = new THREE.Vector3();
                boundingBox.getSize(size);
                const maxDimension = Math.max(size.x, size.y, size.z);
                const scale = config.factor/maxDimension;
                this.mesh.scale.set(scale, scale, scale);
                this.scene.add(this.mesh);
                this.getCenter(config.center_normalize);
            };
            reader.readAsArrayBuffer(file);
        },
    }
}
</script>

<style scoped>
    .container{
        width: 100%;
        height: 100vh;
    }
</style>