<template>
  <div class="main">
    <span class="radio">
      <el-radio-group v-model="showType">
        <el-radio-button label="Preview"></el-radio-button>
        <el-radio-button label="Code"></el-radio-button>
      </el-radio-group>
    </span>
    <div class="config" ref="config">
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
          <div class="fileList">
            <div class="fileItem" v-for="(item,id) in geo.fileDetail" :key="id">
              <div class="fileTitle">{{ item.file.name }} ({{ (item.file.size/1024).toFixed(2) }} KB)</div>
              <div class="fileOption">
                name: <input type="text" class="fileOption_name" v-model="item.name"> &nbsp;
                airtight:
                <select class="fileOption_airtight" v-model="item.airtight">
                  <option value="True">True</option>
                  <option value="False">False</option>
                </select>
              </div>
            </div>
          </div>
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
        <div class="title">Parameter</div>
        <div class="add">
          <el-select class="add-select" v-model="parameter_type" placeholder="请選擇">
            <el-option v-for="item in parameter" :key="item" :label="item" :value="item"></el-option>
            <el-option :label="'Code Block'" :value="'Code Block'"></el-option>
          </el-select>
          <el-select class="add-select" v-model="parameter_selected" placeholder="请選擇" v-if="parameter_type !='' && parameter_type != 'Code Block'">
            <el-option v-for="item in options" :key="item.function" :label="item.function" :value="item.function"></el-option>
          </el-select>
          <el-button class="add-btn" type="primary" icon="el-icon-plus" @click="addItem()">新增</el-button>
        </div>
        <grid-layout class="layout" :layout.sync="layout" :col-num="1" :rowHeight="40" :is-draggable="isDraggable" :is-resizable="true"
              :is-mirrored="false" :vertical-compact="true" :margin="[10, 10]" :use-css-transforms="true" @layout-updated="updateOrder()">
          <grid-item class="layout-item" v-for="item in layout" :x="item.x" :y="item.y" :w="item.w" :h="item.h" :i="item.i" :key="item.i">
              <div v-if="item.type != 'Code Block'">
                <div class="func_name">
                {{ item.detail.function }}
                <div class="delete" @click="deleteItem(item.i)"><i class="el-icon-delete"></i></div>
                </div>
                <div class="property" v-for="(p,id) in item.detail.property" :key="id">
                  {{ typeof p != 'object'? p : p.type}}: 
                    <el-input class="property-input" v-if="typeof p != 'object' " placeholder="請輸入內容" v-model="layout_values[`${item.i}_${item.detail.function}_${p}`]"></el-input>
                    <span v-else>
                      <el-input class="property-select"  placeholder="請輸入內容" v-model="layout_values[`${item.i}_${item.detail.function}_${p.type}`]" @focus="tips(p.type,p.options)"></el-input>
                    </span>
                </div>
              </div>
              <div v-else>
                <div class="func_name">
                  {{ item.type }}
                  <div class="delete" @click="deleteItem(item.i)"><i class="el-icon-delete"></i></div>
                </div>
                <div class="inputCode">
                  <textarea class="textArea" @keydown="handleTab" @focus="isDraggable=false" @blur="isDraggable=true" v-model="layout_values[`${item.i}_${item.type}`]"></textarea>
                </div>
              </div>
          </grid-item>
        </grid-layout>
      </div>
      <el-button type="primary" class="send" @click="collect()" :loading="isSending">{{ isSending?'資料建構中':'確認送出' }}</el-button>
    </div>
    <div class="content">
      <stl-viewer v-show="showType=='Preview'"></stl-viewer>
      <code-viewer v-show="showType=='Code'"></code-viewer>
    </div>
  </div>
</template>

<script>
import VueGridLayout from 'vue-grid-layout';
import structure from '../assets/layoutConig.json'
import StlViewer from './StlViewer.vue'
import CodeViewer from './CodeViewer.vue'
import markdownit from 'markdown-it'
import { nanoid } from 'nanoid'
import 'highlight.js/styles/atom-one-dark.css';
import axios from 'axios';
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
      showType:'Preview',
      // Geometry
      geo:{
        dimension:3,
        wireframe:true,
        factor:3,
        factor_normailize:false,
        pos_normalize:true,
        pos:{
          x:0,y:0,z:0
        },
        fileList:[], // 文件呈現用
        fileDetail:[] // 文件輸出用
      },
      // functions block
      layout:[],
      orderedLayout:[],
      layout_values:{},
      parameter:['Equations','Neural Network Architecture','Constraints'],
      parameter_type:'',
      parameter_selected:'',
      // output
      isSending:false,
      output:{},
      // code block
      isDraggable:true,
    }
  },
  watch:{
    orderedLayout:{
      handler() {
        this.getPreviewCode();
      },
    },
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
    },
    options(){
      switch (this.parameter_type) {
        case 'Equations':
          return this.func_structure
        case 'Neural Network Architecture':
          return this.nn_structure
        case 'Constraints':
          return this.cs_structure
        default:
          return [];
      }
    }
  },
  methods:{
    // geometry block
    tips(type,msg) {
      const h = this.$createElement;

      this.$notify({
        title: `${type} 填寫格式範例`,
        message: h('i', { style: 'color: teal'}, msg.join('、'))
      });
    },
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
    //parameter block
    addItem(){
      if((this.parameter_type != 'Code Block' && (this.parameter_type == '' || this.parameter_selected == '')) || this.parameter_type =='') return
      if(this.parameter_type != 'Code Block'){
        var target =this.options[this.parameter_selected];
        this.layout.push({
          type:this.parameter_type,
          "x":0,"y":0,"w":1,"h":target.property.length+1.25,"i":nanoid(),
          detail:target
        })
      }
      else{
        this.layout.push({
          type:this.parameter_type,
          "x":0,"y":0,"w":1,"h":7.25,"i":nanoid(),
          detail:''
        })
      }
      this.parameter_type ='';
      this.parameter_selected ='';
      this.$nextTick(()=>{
        var el = this.$refs.config;
        this.$nextTick(function(){
          el.scrollTop = el.scrollHeight;
        })
      })
    },
    deleteItem(idx){
      this.layout = this.layout.filter(obj => obj.i != idx);
      // 移除 layout_value
      for (const key in this.layout_values) {
          if (this.layout_values.hasOwnProperty(key) && key.includes(idx)) {
              delete this.layout_values[key];
          }
      }
    },
    // 取得 layout 順序
    updateOrder(){
      this.orderedLayout = [...this.layout].sort((a, b) => {
        if (a.y === b.y) {
          return a.x - b.x;
        }
        return a.y - b.y;
      });
    },
    // STL 文件處理
    handleUpload(file){
      var file = file.file
      this.geo.fileList.push(file);

      this.geo.fileDetail.push({ // 新增至文件輸出列表
        uid:file.uid,
        file:file,
        name:'',
        airtight:"True",
      })

      this.$bus.$emit('loadStlFile',file,{
        wireframe:this.geo.wireframe,
        center_normalize:this.geo.pos_normalize,
        factor:this.geo.factor,
      })
    },
    handleRemove(file, fileList) {
      this.geo.fileList = fileList
      this.$bus.$emit('removeStlFile',file.uid);
      this.geo.fileDetail = this.geo.fileDetail.filter(obj=> obj.uid != file.uid); // 移除文件輸出列表
    },
    handlePreview(file) {
      return
    },

    // handle output
    collect(){
      this.isSending = true;
      // 重置輸出物件
      this.output = {
        dimensions: 3,
        scale: 1,
        center: [0, 0, 0],
        mesh: [],
        blocks:[]
      }
      this.output.dimensions = this.geo.dimension;
      this.output.scale = this.geo.factor;
      this.output.center = [this.geo.pos.x,this.geo.pos.y,this.geo.pos.z];

      // mesh stl
      this.geo.fileDetail.forEach(obj=>{
        this.output.mesh.push({
          uuid: obj.file.uid,
          name: obj.name,
          type: "stl",
          filename: obj.file.name,
          arguments: ["airtight"],
          airtight: obj.airtight
        })
      })
      
      // datas
      this.orderedLayout.forEach(obj=>{
        // 建構資料
        if(obj.type != 'Code Block'){
          var structure = {
            uuid:'',
            name:'',
            type:'',
            function:'',
            arguments:[],
          };
          structure.uuid = obj.i
          structure.function = obj.detail.function;
          obj.detail.property.forEach(item=>{
            if(typeof item == 'object') structure.arguments.push(item.type)
            else structure.arguments.push(item)
          })
          switch(obj.type){
            case 'Equations':
              structure.type = "pde"
              break;
            case 'Neural Network Architecture':
              structure.type = "arch"
              break;
            case 'Constraints':
              structure.type = 'constraint'
              break;
          }
          // 汲取資料
          structure.arguments.forEach(item=>{
            structure[item] = this.layout_values[`${structure.uuid}_${structure.function}_${item}`]
          })
          structure.arguments = structure.arguments.filter(obj=>obj!='name'); // 移除多餘的 arguments 參數
          this.output.blocks.push(structure);
        }
        else{ // code block
          var code = this.layout_values[`${obj.i}_${obj.type}`]
          this.output.blocks.push({
            uuid:obj.i,
            type:obj.type,
            code:code
          })
        }
      })
      this.isSending = false;
      this.send(); // 發送請求
    },
    send(){

    },
    // preview code
    getPreviewCode(){
      axios.get('./test.md')
      .then(res=>{
        const md = markdownit()
        res.data = md.render(res.data)
        this.$bus.$emit('setCode',res.data)
      })
      .catch(e=>{
        console.log(e)
        this.$notify.error({
          title: '系統提示',
          message: '預覽代碼生成失敗！',
        });
      })
    },
    // code block
    handleTab(event){
      if (event.key === 'Tab') event.preventDefault();
    }
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
    width: 27.5%;
    height: 100vh;
    box-shadow: 2px 0 10px gray;
    overflow-y: scroll;
    padding-left: 10px;
    padding-right: 10px;
  }
  .content{
    width: 72.5%;
    height: 100vh;
  }
  /* geometry */
  .geo_subTitle{
    height: 40px;
    line-height: 40px;
    margin-left: 10px;
    font-size: 18px;
  }
  .radio{
    position: absolute;
    right: 10px;
    top:10px;
    z-index: 1002;
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
  .fileList{
    width: 95%;
    margin-top: 10px;
  }
  .fileTitle{
    line-height: 2;
  }
  .fileOption{
    line-height: 2;
  }
  .fileOption_name,.fileOption_airtight{
    border: 1px solid rgba(210,210,210);
    height: 20px;
  }
  .fileOption_name:focus{
    outline: none;
  }
  .fileOption_airtight:focus{
    outline: none;
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
    margin-bottom: 10px;
  }
  .add-btn{
    width: 25%;
    margin-left: 15px;
  }
  /* 移動方塊 */
  .layout{
    width: 97%;
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
    width: 35%;
  }
  .inputCode{
    width: 90%;
    margin: 0 auto;
    height: 280px;
    position: relative;
  }
  .textArea{
    margin-top: 5px;
    width: 100%;
    height: 100%;
    margin-left: -5px;
    border: 1px solid rgba(210,210,210);
    position: absolute;
    top:0;
    left:0;
  }
  .textArea:focus{
    outline: 0;
  }
  .send{
    width:94%;
    margin: 0 auto;
    margin-bottom: 20px;
    margin-left: 10px;
    margin-top: 10px;
  }
</style>