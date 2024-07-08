<template>
  <div class="main">
    <div class="config">
      <div class="geometry">
        <div class="title">Geometry</div>
        <div class="dimension">
          dimension: <el-input-number class="dimension_input" v-model="geo.dimension" controls-position="right" :min="1" :max="3" @change="changeDimension()"></el-input-number>
        </div>
        <div class="wireframe">
          WireFrame: <el-switch class="normalize_switch" v-model="geo.wireframe" active-color="#13ce66" @change="toggleWireFrame()"></el-switch>
        </div>
        <div class="geo_subTitle">Mesh</div>
        <div class="mesh">
          <el-upload
            class="upload" action="" accept=".stl" :http-request="handleUpload" :on-remove="handleRemove" :on-preview="handlePreview"
            multiple :file-list="geo.fileList"  drag>
            <i class="el-icon-upload"></i>
            <div class="el-upload__text">將文件拖到此處，或<em>點擊上傳</em></div>
            <div slot="tip" class="el-upload__tip">只能上傳 STL 文件</div>
          </el-upload>
        </div>
        <div class="geo_subTitle">Center</div>
        <div class="center">
          <div class="pos-box">
            <div class="pos">x: <el-input class="pos-input" v-model="geo.pos.x" placeholder="请输入内容"></el-input></div>
            <div class="pos">y: <el-input class="pos-input" v-model="geo.pos.y" placeholder="请输入内容"></el-input></div>
            <div class="pos">z: <el-input class="pos-input" v-model="geo.pos.z" placeholder="请输入内容"></el-input></div>
          </div>
          <div class="pos_exec">
            Normalize:<el-switch class="normalize_switch" v-model="geo.pos_normalize" active-color="#13ce66"></el-switch>
            <el-button class="normalize_btn" type="primary" @click="getCenter()">Get Center</el-button>
          </div>
        </div>
        <div class="geo_subTitle">Scale</div>
        <div class="scale">
          factor: <el-input-number class="dimension_input" v-model="geo.factor" controls-position="right" :min="1" @change="changeScale()"></el-input-number>
          <el-checkbox class="factor_normalize" v-model="geo.factor_normailize">正規化</el-checkbox>
        </div>
      </div>
      <div class="function_part">
        <div class="title">Equations</div>
        <div class="add">
          <el-select class="add-select" v-model="func_selected" placeholder="请選擇">
            <el-option v-for="item in func_structure" :key="item.function" :label="item.function" :value="item.function"></el-option>
          </el-select>
          <el-button class="add-btn" type="primary" icon="el-icon-plus" @click="addFunction()">新增</el-button>
        </div>
        <grid-layout class="layout" :layout.sync="func_layout" :col-num="1" :rowHeight="40" :is-draggable="true" :is-resizable="true"
              :is-mirrored="false" :vertical-compact="true" :margin="[10, 10]" :use-css-transforms="true">
          <grid-item class="layout-item" v-for="item in func_layout" :x="item.x" :y="item.y" :w="item.w" :h="item.h" :i="item.i" :key="item.i">
              <div class="func_name">
                {{ item.detail.function }}
                <div class="delete" @click="deleteFunction(item.i,item.detail.function)"><i class="el-icon-delete"></i></div>
              </div>
              <div class="property" v-for="(p,id) in item.detail.property" :key="id">
                {{ typeof p != 'object'? p : p.type}}: 
                  <el-input class="property-input" v-if="typeof p != 'object' " placeholder="請輸入內容" v-model="func_property_value[`${item.detail.function}_${p}`]"></el-input>
                  <el-select class="property-select" v-else  placeholder="请選擇" v-model="func_property_value[`${item.detail.function}_${p.type}`]">
                    <el-option v-for="item in p.options" :key="item" :label="item" :value="item"></el-option>
                  </el-select>
              </div>
          </grid-item>
        </grid-layout>
      </div>
      <div class="function_part">
        <div class="title">Neural Network Architecture</div>
        <div class="add">
          <el-select class="add-select" v-model="nn_selected" placeholder="请選擇">
            <el-option v-for="item in nn_structure" :key="item.function" :label="item.function" :value="item.function"></el-option>
          </el-select>
          <el-button class="add-btn" type="primary" icon="el-icon-plus" @click="addNN()">新增</el-button>
        </div>
        <grid-layout class="layout" :layout.sync="nn_layout" :col-num="1" :rowHeight="40" :is-draggable="true" :is-resizable="true"
              :is-mirrored="false" :vertical-compact="true" :margin="[10, 10]" :use-css-transforms="true">
          <grid-item class="layout-item" v-for="item in nn_layout" :x="item.x" :y="item.y" :w="item.w" :h="item.h" :i="item.i" :key="item.i">
              <div class="func_name">
                {{ item.detail.function }}
                <div class="delete" @click="deleteNN(item.i,item.detail.function)"><i class="el-icon-delete"></i></div>
              </div>
              <div class="property" v-for="(p,id) in item.detail.property" :key="id">
                {{ typeof p != 'object'? p : p.type}}: 
                  <el-input class="property-input" v-if="typeof p != 'object' " placeholder="請輸入內容" v-model="nn_property_value[`${item.detail.function}_${p}`]"></el-input>
                  <el-select class="property-select" v-else  placeholder="请選擇" v-model="nn_property_value[`${item.detail.function}_${p.type}`]">
                    <el-option v-for="item in p.options" :key="item" :label="item" :value="item"></el-option>
                  </el-select>
              </div>
          </grid-item>
        </grid-layout>
      </div>
      <div class="function_part">
        <div class="title">Constraints</div>
        <div class="add">
          <el-select class="add-select" v-model="cs_selected" placeholder="请選擇">
            <el-option v-for="item in cs_structure" :key="item.function" :label="item.function" :value="item.function"></el-option>
          </el-select>
          <el-button class="add-btn" type="primary" icon="el-icon-plus" @click="addContstraint()">新增</el-button>
        </div>
        <grid-layout class="layout" :layout.sync="cs_layout" :col-num="1" :rowHeight="40" :is-draggable="true" :is-resizable="true"
              :is-mirrored="false" :vertical-compact="true" :margin="[10, 10]" :use-css-transforms="true">
          <grid-item class="layout-item" v-for="item in cs_layout" :x="item.x" :y="item.y" :w="item.w" :h="item.h" :i="item.i" :key="item.i">
              <div class="func_name">
                {{ item.detail.function }}
                <div class="delete" @click="deleteContstraint(item.i,item.detail.function)"><i class="el-icon-delete"></i></div>
              </div>
              <div class="property" v-for="(p,id) in item.detail.property" :key="id">
                {{ typeof p != 'object'? p : p.type}}: 
                  <el-input class="property-input" v-if="typeof p != 'object' " placeholder="請輸入內容" v-model="cs_property_value[`${item.detail.function}_${p}`]"></el-input>
                  <el-select class="property-select" v-else  placeholder="请選擇" v-model="cs_property_value[`${item.detail.function}_${p.type}`]">
                    <el-option v-for="item in p.options" :key="item" :label="item" :value="item"></el-option>
                  </el-select>
              </div>
          </grid-item>
        </grid-layout>
      </div>
    </div>
    <div class="content">
      <stl-viewer></stl-viewer>
      <code-viewer></code-viewer>
    </div>
  </div>
</template>

<script>
import VueGridLayout from 'vue-grid-layout';
import structure from '../assets/layoutConig.json'
import StlViewer from './StlViewer.vue'
import CodeViewer from './CodeViewer.vue'
export default {
  name:'Main',
  components:{
    GridLayout: VueGridLayout.GridLayout,
    GridItem: VueGridLayout.GridItem,
    StlViewer,CodeViewer
  },
  mounted(){
    this.$bus.$on('setCenter',this.setCenter)
  },
  data(){
    return {
      // Geometry
      geo:{
        dimension:3,
        wireframe:true,
        factor:3,
        factor_normailize:false,
        pos_normalize:false,
        pos:{
          x:0,y:0,z:0
        },
        fileList:[]
      },
      // functions block
      func_operate_idx:0,
      func_layout:[],
      func_selected:'',
      func_existed:[],
      func_property_value:{},
      // Neural Network Architecture block
      nn_operate_idx:0,
      nn_layout:[],
      nn_selected:'',
      nn_existed:[],
      nn_property_value:{},
      // Constraint block
      cs_operate_idx:0,
      cs_layout:[],
      cs_selected:'',
      cs_existed:[],
      cs_property_value:{}
    }
  },
  computed:{
    // functions block
    func_structure(){
      return structure.Functions
    },
    // Neural Network Architecture block
    nn_structure(){
      return structure.Neural
    },
    // Constraint block
    cs_structure(){
      return structure.Constraint
    }
  },
  methods:{
    // geometry block
    changeScale(){
      this.$bus.$emit('handleStlConfig','scale',{
        factor:this.geo.factor
      })
    },
    changeDimension(){
      this.$bus.$emit('handleStlConfig','dimension',{
        dimension:this.geo.dimension
      })
    },
    toggleWireFrame(){
      this.$bus.$emit('handleWireFrame',this.geo.wireframe);
    },
    getCenter(){
      this.$bus.$emit('getStlCenter',this.geo.pos_normalize);
    },
    setCenter(x,y,z){
      this.geo.pos.x = x;
      this.geo.pos.y = y;
      this.geo.pos.z = z;
    },
    //functions block
    addFunction(){
      if(this.func_existed.includes(this.func_selected) || this.func_selected == '') return
      var target =this.func_structure[this.func_selected];
      this.func_layout.push({
        "x":0,"y":0,"w":1,"h":target.property.length+1.25,"i":this.func_operate_idx,
        detail:target
      })
      this.func_operate_idx++;
      this.func_existed.push(this.func_selected);
      this.func_selected = '';
    },
    deleteFunction(idx,name){
      // 清除頁面呈現
      this.func_layout = this.func_layout.filter(obj=> obj.i != idx);
      // 取消已選取
      this.func_existed = this.func_existed.filter(item => item != name);
      // 取消資料儲存
      const filteredKeys = Object.keys(this.func_property_value).filter(key => !key.includes(name));
      this.func_property_value = filteredKeys.reduce((obj, key) => {
        obj[key] = this.func_property_value[key];
        return obj;
      }, {});
    },
    // Neural Network Architecture block
    addNN(){
      if(this.nn_existed.includes(this.nn_selected) || this.nn_selected == '') return
      var target =this.nn_structure[this.nn_selected];
      this.nn_layout.push({
        "x":0,"y":0,"w":1,"h":target.property.length+1.25,"i":this.nn_operate_idx,
        detail:target
      })
      this.nn_operate_idx++;
      this.nn_existed.push(this.nn_selected);
      this.nn_selected = '';
    },
    deleteNN(idx,name){
      // 清除頁面呈現
      this.nn_layout = this.nn_layout.filter(obj=> obj.i != idx);
      // 取消已選取
      this.nn_existed = this.nn_existed.filter(item => item != name);
      // 取消資料儲存
      const filteredKeys = Object.keys(this.nn_property_value).filter(key => !key.includes(name));
      this.nn_property_value = filteredKeys.reduce((obj, key) => {
        obj[key] = this.nn_property_value[key];
        return obj;
      }, {});
    },
    // Constraint block
    addContstraint(){
      if(this.cs_existed.includes(this.cs_selected) || this.cs_selected == '') return
      var target =this.cs_structure[this.cs_selected];
      this.cs_layout.push({
        "x":0,"y":0,"w":1,"h":target.property.length+1.25,"i":this.cs_operate_idx,
        detail:target
      })
      this.cs_operate_idx++;
      this.cs_existed.push(this.cs_selected);
      this.cs_selected = '';
    },
    deleteContstraint(idx,name){
      // 清除頁面呈現
      this.cs_layout = this.cs_layout.filter(obj=> obj.i != idx);
      // 取消已選取
      this.cs_existed = this.cs_existed.filter(item => item != name);
      // 取消資料儲存
      const filteredKeys = Object.keys(this.cs_property_value).filter(key => !key.includes(name));
      this.cs_property_value = filteredKeys.reduce((obj, key) => {
        obj[key] = this.cs_property_value[key];
        return obj;
      }, {});
    },
    // Mesh 文件處理
    handleUpload(file){
      var file = file.file
      this.geo.fileList.push(file);
      this.$bus.$emit('loadStlFile',file,{
        wireframe:this.geo.wireframe,
        center_normalize:this.geo.pos_normalize,
        factor:this.geo.factor,
      })
    },
    handleRemove(file, fileList) {
      this.geo.fileList = fileList
      this.$bus.$emit('removeStlFile',file.name)
    },
    handlePreview(file) {
      return
    },
  }
}
</script>

<style scoped>
  .main{
    display: flex;
    justify-content: space-evenly;
  }
  /* 左列樣式 */
  .config{
    width: 26.5%;
    height: 100vh;
    box-shadow: 2px 0 10px gray;
    overflow-y: scroll;
    padding-left: 10px;
    padding-right: 10px;
  }
  .content{
    width: 73.5%;
    height: 100vh;
  }
  /* geometry */
  .geo_subTitle{
    height: 40px;
    line-height: 40px;
    margin-left: 10px;
    font-size: 18px;
  }
  .dimension{
    margin-left: 10px;
  }
  .dimension_input{
    margin-left: 5px;
  }
  .wireframe{
    margin-top: 20px;
    margin-left: 10px;
    margin-bottom: 20px;
  }
  .mesh{
    margin-left: 10px;
    margin-top: 10px;
    margin-bottom: 10px;
  }
  .center{
    margin-top: 10px;
    margin-bottom: 10px;
  }
  .pos-box{
    display: flex;
    justify-content: space-evenly;
    align-items: center;
    margin-left: 10px;
  }
  .pos{
    margin-bottom: 10px;
  }
  .pos-input{
    width: 60%;
    margin-left: 5px;
  }
  .pos_exec{
    margin-left: 10px;
    margin-top: 5px;
    height: 40px;
    line-height: 40px;
    position: relative;
  }
  .normalize_switch{
    margin-left: 5px;
  }
  .normalize_btn{
    position: absolute;
    top:0;
    right: 10px;
  }
  .scale{
    height: 40px;
    margin-top: 5px;
    line-height: 40px;
    margin-left: 10px;
  }
  .factor_normalize{
    margin-left: 40px;
  }
  /* 新增選單 */
  .title{
    width: 100%;
    height: 60px;
    line-height: 60px;
    font-size: 20px;
    margin-left: 10px;
  }
  .add{
    width: calc(100% - 20px);
    margin: 0 auto;
    margin-bottom: 10px;
  }
  .add-select{
    width: 70%;
  }
  .add-btn{
    width: 25%;
    margin-left: 15px;
  }
  /* 移動方塊 */
  .layout{
    width: 100%;
  }
  .layout-item{
    width: 100%;
    box-shadow: 4px 4px 10px gray;
    padding-left: 5px;
    border-radius: 3px;
  }
  .func_name{
    font-size: 18px;
    line-height: 40px;
    height: 40px;
    padding-left: 5px;
    position: relative;
  }
  .delete{
    position: absolute;
    right: 10px;
    height: 40px;
    top:0;
    font-size: 14px;
  }
  .delete:hover{
    cursor: pointer;
  }
  .property{
    margin-top: 10px;
    padding-left: 5px;
  }
  .property-input{
    width: 45%;
    margin-left: 5px;
  }
  .property-select{
    width: 45%;
  }
</style>