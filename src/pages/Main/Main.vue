<template>
  <div class="main">
    <span class="radio">
      <el-radio-group v-model="showType">
        <el-radio-button label="Preview"></el-radio-button>
        <el-radio-button label="Code"></el-radio-button>
      </el-radio-group>
    </span>
    <div class="config" ref="config">
      <div class="top" @click="back()"><i class="fa-solid fa-arrow-left arrow"></i>back</div>
      <el-popover placement="right" width="400" trigger="hover" :closeDelay="0">
        <div class="setting_list">
          <div>Rec Validation Frequency</div><el-slider class="slider" v-model="hydraTemp.training.rec_validation_freq" :min="1000" :max="100000" :step="1000"></el-slider>
          <div>Rec Inference Frequency</div><el-slider class="slider" v-model="hydraTemp.training.rec_inference_freq" :min="1000" :max="100000" :step="1000"></el-slider>
          <div>Rec Monitor Frequency</div><el-slider class="slider" v-model="hydraTemp.training.rec_monitor_freq" :min="1000" :max="100000" :step="1000"></el-slider>
          <div>Rec Constraint Frequency</div><el-slider class="slider" v-model="hydraTemp.training.rec_constraint_freq" :min="1000" :max="100000" :step="1000"></el-slider>
          <div>Training Max Steps</div><el-slider class="slider" v-model="hydraTemp.training.max_steps" :min="2000" :max="2000000" :step="1000"></el-slider>
          <div>Learning Rates</div><el-input-number class="slider number" v-model="hydraTemp.optimizer.lr" :min="0.0000001" :max="0.1"></el-input-number>
          <div>Decay Rate</div><el-slider class="slider" v-model="hydraTemp.scheduler.decay_rate" :min="0.01" :max="1.00" :step="0.01"></el-slider>
          <div>Decay Steps</div><el-slider class="slider" v-model="hydraTemp.scheduler.decay_steps" :min="1000" :max="100000" :step="1000"></el-slider>
          <el-button type="primary" class="setBtn" :loading="isSending || isCreateCode || isCreateYaml" @click="collect('setting')">儲存</el-button>
        </div>
        <div class="setting" slot="reference"><i class="fa-solid fa-sliders"></i></div>
      </el-popover>
      <div class="geometry">
        <div class="title">Geometry  <div class="wireframe">WireFrame: <el-switch class="normalize_switch" v-model="geo.wireframe" active-color="#13ce66" @change="toggleWireFrame()"></el-switch></div></div>
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
        <div class="title">Attachment 
          <el-tooltip class="item" effect="dark" :content="attachmentTips" placement="right">
            <i class="el-icon-warning-outline"></i>
          </el-tooltip>
        </div>
        <div class="mesh">
          <el-upload ref="upload2" action="" :http-request="handleUpload2" :on-preview="handlePreview" :on-remove="handleRemove2" multiple :file-list="attachment" >
            <el-button slot="trigger" size="small" type="primary">選取文件</el-button>
          </el-upload>
        </div>
        <div class="geo_subTitle">Center</div>
        <div class="center">
          <div class="pos-box">
            <div class="pos">x: <el-input class="pos-input" v-model="geo.pos.x" placeholder="请輸入内容"></el-input></div>
            <div class="pos">y: <el-input class="pos-input" v-model="geo.pos.y" placeholder="请輸入内容"></el-input></div>
            <div class="pos">z: <el-input class="pos-input" v-model="geo.pos.z" placeholder="请輸入内容"></el-input></div>
          </div>
          <div class="pos_exec">
            Normalize:<el-switch class="normalize_switch" v-model="geo.pos_normalize" active-color="#13ce66"></el-switch>
            <el-button class="normalize_btn" type="primary" @click="getCenter()">Get Center</el-button>
          </div>
        </div>
        <div class="geo_subTitle">Scale</div>
        <div class="scale">
          factor: <el-input-number class="dimension_input" v-model="geo.factor" controls-position="right" :min="0" :step="0.01" @change="changeScale()"></el-input-number>
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
                  {{p.type}}: <el-input class="property-select"  :placeholder="p.placeholder?p.placeholder:'請輸入內容'" v-model="layout_values[`${item.i}_${item.detail.function}_${p.type}`]" @focus="p.showTips?tips(p.type,p.options):''"></el-input>
                </div>
              </div>
              <div v-else>
                <div class="func_name">
                  {{ item.type }}
                  <div class="upload_code" @click="uploadCode(item.i)"><i class="el-icon-upload2"></i></div>
                  <div class="delete" @click="deleteItem(item.i)"><i class="el-icon-delete"></i></div>
                  <input type="file" :ref="`${item.i}_code_file`" class="code_file" @change="handleUploadCode(item.i,item.type)">
                </div>
                <div class="inputCode">
                  <codemirror class="cm-editor" :options="cmOptions" :ref="`${item.i}_textArea`" @keydown="handleTab" @focus="isDraggable=false" @blur="isDraggable=true" v-model="layout_values[`${item.i}_${item.type}`]"></codemirror>
                </div>
              </div>
          </grid-item>
        </grid-layout>
      </div>
      <el-button type="primary" class="send" @click="(!isSending && !isCreateCode && !isCreateYaml && init>1)?send():''" :loading="isSending || isCreateCode || isCreateYaml">{{ isSending || isCreateCode || isCreateYaml?'資料建構中':'確認送出' }}</el-button>
    </div>
    <div class="content">
      <stl-viewer v-show="showType=='Preview'"></stl-viewer>
      <code-viewer v-show="showType=='Code'"></code-viewer>
    </div>
    <div class="keyboard">
      <el-button class="key" icon="el-icon-check" @click="ctrlS()" circle></el-button> Ctrl+S 儲存專案 <el-button class="key" icon="el-icon-edit" @click="ctrlN()" circle></el-button>  Ctrl+N 另存新檔 <el-button class="key" icon="el-icon-download" @click="ctrlD()" circle></el-button> Ctrl+D 下載代碼
    </div>
  </div>
</template>

<script>
import VueGridLayout from 'vue-grid-layout';
import structure from '../../assets/layoutConfig.json'
import StlViewer from './components/StlViewer.vue'
import CodeViewer from './components/CodeViewer.vue'
import markdownit from 'markdown-it'
import { nanoid } from 'nanoid'
import 'highlight.js/styles/atom-one-dark.css';
import axios from 'axios';
import jsCookie from 'js-cookie';
import JSZip from 'jszip';

// codemirror
import { codemirror } from "vue-codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/python/python.js";
import "codemirror/addon/fold/foldgutter.css";
import "codemirror/addon/fold/foldcode.js";
import "codemirror/addon/fold/foldgutter.js";
import "codemirror/addon/fold/indent-fold.js";
import "codemirror/addon/fold/comment-fold.js";

export default {
  name:'Main',
  components:{
    GridLayout: VueGridLayout.GridLayout,
    GridItem: VueGridLayout.GridItem,
    StlViewer,CodeViewer,
    codemirror
  },
  mounted(){
    this.$bus.$on('setCenter',this.setCenter)

    if(this.$route.query.uuid) this.loadFullData(); // 若帶有 uuid 則汲取歷史資料

    // 處理拖曳
    document.addEventListener('click', this.handleDrag);
    // 快捷儲存
    document.addEventListener('keydown', this.handleKeydown);
    // 檢查關閉瀏覽器
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  },
  beforeDestroy(){
    // 解除綁定
    document.removeEventListener('keydown',this.handleKeydown);
    document.removeEventListener('click', this.handleDrag);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  },
  data(){
    return {
      isSaved:false, // 是否儲存
      isOpenedPage:null, // 判斷是否已開啟 List Page
      name:this.$route.query.name?this.$route.query.name:'',
      uuid:this.$route.query.uuid?this.$route.query.uuid:nanoid(),
      init:0,
      showType:'Preview',
      // Geometry
      tempGeo:{},
      geo:{
        wireframe:true,
        factor:1,
        pos_normalize:false,
        pos:{
          x:0,y:0,z:0
        },
        fileList:[], // 文件呈現用
        fileDetail:[], // 文件輸出用
      },
      hydraTemp:{
        defaults: {
          loss: "sum",
          optimizer: "adam",
          scheduler: "tf_exponential_lr"
        },
        training: {
          rec_validation_freq: 1000,
          rec_inference_freq: 1000,
          rec_monitor_freq: 1000,
          rec_constraint_freq: 1000,
          max_steps: 2000
        },
        scheduler: {
          decay_rate: 0.95,
          decay_steps: 1000
        },
        optimizer:{
          lr:0.001
        },
        run_mode: "train"
      },
      // attachment
      attachment:[],
      attachmentTips:`資料儲存路徑為: workingDir/user_data`,
      // functions block
      layout:[],
      orderedLayout:[],
      layout_values:{},
      parameter:['Equations','Neural Network Architecture','Nodes','Constraints','Monitor'],
      parameter_type:'',
      parameter_selected:'',
      outputYaml:'',
      // output
      isCreateCode:false,
      isCreateYaml:false,
      isSending:false,
      output:{},
      originalCode:'',
      totalCode:'',
      // code block
      isDraggable:true,
      cmOptions: {
        mode: "python",
        theme: "default",
        line:true,
        lineNumbers: true,
        lineWrapping: true,
        viewportMargin:5,
        autoRefresh:true,
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
      }
    }
  },
  watch:{
    orderedLayout:{
      immediate:false,
      handler() {
        if(this.init){ // 阻止第一次觸發
          this.collect();
        }
        this.init++;
      },
    },
    layout_values:{
      deep:true,
      handler() {
        this.collect();
        this.init++;
      },
    },
    geo:{
      deep:true,
      handler() {
        this.collect();
        this.init++;
      },
    },
  },
  computed:{
    // hydra
    hydra() {
      return {
        defaults: {
          loss: "sum",
          optimizer: "adam",
          scheduler: "tf_exponential_lr"
        },
        training: {
          rec_validation_freq: (this.hydraTemp.training.rec_validation_freq).toString(),
          rec_inference_freq: (this.hydraTemp.training.rec_inference_freq).toString(),
          rec_monitor_freq: (this.hydraTemp.training.rec_monitor_freq).toString(),
          rec_constraint_freq: (this.hydraTemp.training.rec_constraint_freq).toString(),
          max_steps: (this.hydraTemp.training.max_steps).toString()
        },
        scheduler: {
          decay_rate: (this.hydraTemp.scheduler.decay_rate).toString(),
          decay_steps: (this.hydraTemp.scheduler.decay_steps).toString()
        },
        optimizer:{
          lr:(this.hydraTemp.optimizer.lr).toString()
        },
        run_mode: "train"
      }
    },
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
    // Nodes block
    nd_structure(){
      return structure.Nodes
    },
    // Monitor block
    mt_structure(){
      return structure.Monitor
    },
    options(){
      switch (this.parameter_type) {
        case 'Equations':
          return this.func_structure
        case 'Neural Network Architecture':
          return this.nn_structure
        case 'Constraints':
          return this.cs_structure
        case 'Nodes':
          return this.nd_structure
        case 'Monitor':
          return this.mt_structure
        default:
          return [];
      }
    }
  },
  methods:{
    handleDrag(event){
      if (event.target.tagName === 'INPUT') {
        this.isDraggable = false
      }
      if (event.target.tagName === 'DIV') {
        this.isDraggable = true;
      }
    },
    openListPage(){
      if(!this.isOpenedPage || this.isOpenedPage.closed){
        this.isOpenedPage = window.open('/#/list', '_blank');
      }
    },

    // 離開前檢測
    handleBeforeUnload(event){
      if (!this.isSaved) {
        event.preventDefault();
        event.returnValue = '';
      }
    },
    back(){
      // 確認是否儲存
      if(!this.isSaved){
        this.$confirm('離開前，是否儲存專案?', '提示', {
          confirmButtonText: '儲存',
          cancelButtonText: '不儲存',
          distinguishCancelAndClose:true,
          type: 'warning'
        }).then(() => {
          this.saveFullData('儲存專案');
          this.$router.replace('/gate').catch(()=>{});
        }).catch((type) => {
          console.log(type)
          if(type == 'close'){}
          else this.$router.replace('/gate').catch(()=>{});
        })
      }
      else this.$router.replace('/gate').catch(()=>{});
    },


    // 監聽按鍵事件
    handleKeydown(event){
      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        this.ctrlS();
      }
      else if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        this.ctrlN();
      }
      else if (event.ctrlKey && event.key.toLowerCase() === 'd'){
        event.preventDefault();
        this.ctrlD();
      }
    },
    ctrlS(){ 
      this.saveFullData('檔案儲存');
    },
    ctrlN(){
      this.$prompt('请輸入專案名稱', '提示', {
          confirmButtonText: '確認',
          cancelButtonText: '取消',
      })
      .then(({ value }) => {
        this.uuid = nanoid();
        this.name = value;
        this.saveFullData('另存新檔');
      })
      .catch((e) => {});
    },
    ctrlD(){
      this.execDownload();
    },


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

      let lastY = 0;

      if (this.layout.length > 0) {
        const lastItem = this.layout[this.layout.length - 1];
        lastY = lastItem.y + lastItem.h; // 最後一個項目的 y + h 得到新項目的起始 y
      }

      if(this.parameter_type != 'Code Block'){
        var target =this.options[this.parameter_selected];
        this.layout.push({
          type:this.parameter_type,
          "x":0,"y":lastY,"w":1,"h":target.property.length+1.25,"i":nanoid(),
          detail:target
        })
      }
      else{
        this.layout.push({
          type:this.parameter_type,
          "x":0,"y":lastY,"w":1,"h":7.25,"i":nanoid(),
          detail:''
        })
      }
      this.parameter_type ='';
      this.parameter_selected ='';
      this.$nextTick(()=>{
        var el = this.$refs.config;
        this.$nextTick(function(){
          el.scrollTop = el.scrollHeight+50;
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
    // 取得 parameter 順序
    updateOrder(){
      this.orderedLayout = [...this.layout].sort((a, b) => {
        if (a.y === b.y) {
          return a.x - b.x;
        }
        return a.y - b.y;
      });
    },


    // code block
    uploadCode(idx){
      this.$refs[`${idx}_code_file`][0].click();
    },
    handleUploadCode(idx,type){
      this.$refs[`${idx}_textArea`][0].value='';
      var file = this.$refs[`${idx}_code_file`][0].files[0];
      if(file){
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            this.layout_values[`${idx}_${type}`] = content;
            this.collect();
        };
        reader.readAsText(file);
      }
    },
    handleTab(event){
      if (event.key === 'Tab') event.preventDefault();
    },


    // STL 文件處理
    handleUpload(file){
      var file = file.file || file
      this.geo.fileList.push(file);
      this.geo.fileDetail.push({ // 新增至文件輸出列表
        uid:file.uid,
        file:file,
        name:'',
        airtight:"True",
        identifier:file.name,
      })
      this.$bus.$emit('loadStlFile',file,{
        wireframe:this.geo.wireframe,
        center_normalize:this.geo.pos_normalize,
        factor:this.geo.factor,
        uid: file.uid
      })
    },
    handleRemove(file, fileList) {
      this.stlFileChange = true;
      this.geo.fileList = fileList
      this.$bus.$emit('removeStlFile',file.uid);
      this.geo.fileDetail = this.geo.fileDetail.filter(obj=> obj.uid != file.uid); // 移除文件輸出列表
    },

    // 共用偽方法
    handlePreview(file) {
      return
    },

    // attachment 文件處理
    handleUpload2(file){
      var file = file.file || file;
      this.attachment.push(file);
    },
    handleRemove2(file, fileList){
      this.attachment = fileList
    },

    
    // 搜集參數配置
    collect(option){
      this.isSaved = false;
      this.isCreateCode = true;
      this.isCreateYaml = true;
      // 重置輸出物件
      this.output = {
        normalize:{
          do:true,
          scale: 1,
          center: [0, 0, 0],
        },
        hydra: {},
        meshes: [],
        blocks:[]
      }

      this.output.normalize.do = this.geo.pos_normalize;
      this.output.normalize.scale = this.geo.factor;
      this.output.normalize.center = [Number(this.geo.pos.x),Number(this.geo.pos.y),Number(this.geo.pos.z)];
      this.output.hydra = this.hydra;

      // mesh stl
      this.geo.fileDetail.forEach(obj=>{
        this.output.meshes.push({
          uuid: obj.file.uid,
          type: "mesh",
          name: obj.name,
          filetype:'stl',
          filename: obj.file.name,
          arguments: ["airtight"],
          airtight: obj.airtight,
        })
      })
      
      // datas
      this.orderedLayout.forEach(obj=>{
        // 建構資料
        if(obj.type != 'Code Block'){
          var structure = {
            uuid:'',
            type:'',
            name:'',
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
              structure.type = "equation"
              break;
            case 'Neural Network Architecture':
              structure.type = "architecture"
              break;
            case 'Constraints':
              structure.type = 'constraint'
              break;
            case 'Nodes':
              structure.type = 'nodes'
              break;
            case 'Monitor':
              structure.type = 'monitor'
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
          if(!this.layout_values[`${obj.i}_${obj.type}`]) return;
          var code = this.layout_values[`${obj.i}_${obj.type}`].split('\n');
          this.output.blocks.push({
            uuid:obj.i,
            type:'manual',
            codes:code
          })
        }
      })
      this.getPreviewCode();
      this.getYaml(option);
    },
    // 獲取預覽程式碼
    getPreviewCode(){
      axios.post('/run/code',{
        json:JSON.stringify(this.output)
      })
      .then(res=>{
        if(res.data =='') return
        this.originalCode = res.data
        this.totalCode ='```\n'+res.data+'\n```';
        const md = markdownit()
        res.data = md.render(this.totalCode)
        this.$bus.$emit('setCode',res.data)
      })
      .catch(e=>{
        console.log(e)
        this.$notify.error({
          title: '系統提示',
          message: '預覽代碼生成失敗！',
        });
      })
      .finally(()=>{
        this.isCreateCode = false;
      })
    },
    // 獲取 yaml 檔案
    getYaml(option){
      axios.post('/run/yaml',{
        json:JSON.stringify(this.output)
      })
      .then(res=>{
        this.outputYaml = res.data;
        if(option == 'setting'){
          this.$notify({
            title: '訓練配置儲存提示',
            message: '訓練配置儲存成功！',
            type: 'success'
          });
        }
      })
      .catch(e=>{
        this.$notify.error({
          title: '訓練配置儲存提示',
          message: '訓練配置儲存失敗！',
        });
      })
      .finally(()=>{
        this.isCreateYaml = false;
      })
    },


    // 發送代碼
    send(){
      this.isSending = true;
      const code = new File([this.originalCode], "main.py", { type: "text/plain" });
      const yaml = new File([this.outputYaml], "config.yaml", { type: "text/plain" });

      const formData = new FormData();
      for(var i=0;i<this.geo.fileList.length;i++) formData.append('stlFiles', this.geo.fileList[i],this.geo.fileList[i].name); 
      for(var i=0;i<this.attachment.length;i++) formData.append('attachments', this.attachment[i],this.attachment[i].name); 

      formData.append('code',code);
      formData.append('yaml',yaml);

      axios.post(`/run/upload/${this.name}`,formData,{
        headers:{
          'Content-Type': 'multipart/form-data',
          'user-token':jsCookie.get('token')
        }
      })
      .then(res=>{
        if(res.data == 'success'){
          this.$notify({
            title: '專案發送提示',
            message: '專案已發送至後端運行！',
            type: 'success'
          });
          this.openListPage();
        }
        else this.$notify.error({
            title: '系統提示',
            message: res.data,
          });
      })
      .catch(e=>{
          this.$notify.error({
            title: '系統提示',
            message: '運行代碼失敗！',
          });
        })
      .finally(()=>{
        this.isSending = false;
      })
    },


    // 下載預覽程式碼
    execDownload(){
      const code = new File([this.originalCode], "main.py", { type: "text/plain" });
      const yaml = new File([this.outputYaml], "config.yaml", { type: "text/plain" });
      this.downloadFile(code);
      this.downloadFile(yaml);
    },
    downloadFile(file){ // File Object
      const link = document.createElement('a');
      link.download = file.name;
      link.href = URL.createObjectURL(file);
      link.click();
      URL.revokeObjectURL(link.href);
    },


    // 儲存資料
    saveFullData(type) {
      const dataToSave = JSON.parse(JSON.stringify({
        init:this.init,
        geo:this.geo,
        hydraTemp:this.hydraTemp,
        layout:this.layout,
        orderedLayout:this.orderedLayout,
        layout_values:this.layout_values,
      }));
      axios.post('/run/newTopic/add',{
        uuid:this.uuid,
        name:this.name,
        data:dataToSave,
      },
      {
        headers:{
          token:jsCookie.get('token')
        }
      })
      .then(res=>{
        if(res.data=='success') {
          this.$notify({
            title: '專案儲存提示',
            message: `${type}成功！`,
            type: 'success'
          });
        }
        else{
          this.$notify({
            title: '專案儲存提示',
            message: `${type}失敗！`,
            type: 'error'
          });
        }
        this.isSaved = true;
      })
      .catch(e=>{
        this.$notify({
          title: '專案儲存提示',
          message: `${type}失敗！`,
          type: 'error'
        });
      })
      
      this.saveFiles();
      this.saveAttachments();
    },
    // 獲取歷史資料
    loadFullData(){
      axios.get(`/run/newTopic/findProject/${this.uuid}`,{
        headers:{
          token:jsCookie.get('token')
        }
      }).then(res=>{
        this.name = res.data.name;
        const loadedData = JSON.parse(res.data.data);
        Object.keys(loadedData).forEach((key) => {
          if (this.$data.hasOwnProperty(key)) {
            if(key != 'geo') this[key] = loadedData[key];
            else this.tempGeo = loadedData[key];
          }
        });
        this.$nextTick(()=>{
          this.getFiles();
          this.getAttachments();
        })
      })
      .catch(e=>{})
    },


    // 獲取 STL 上傳文件
    getFiles(){
      axios.get(`/run/newTopic/getFiles/${this.uuid}`,{
        headers:{
          'token':jsCookie.get('token')
        },
        responseType: 'blob'
      })
      .then(res=>{
        if(res.data){
          const blob = res.data;
          const zip = new JSZip();
          zip.loadAsync(blob).then(zip => {
            const filePromises = Object.keys(zip.files).map(filename => {
              const file = zip.files[filename];
              return file.async('blob').then(fileBlob => {
                const fileObject = new File([fileBlob], filename, {
                  type: fileBlob.type,
                });
                fileObject.uid = new Date().getTime();
                this.handleUpload(fileObject);
              });
            });
            Promise.all(filePromises).then(() => {
              this.geo.fileDetail.forEach((item, idx) => {
                const matchingGeo = this.tempGeo.fileDetail.find(geo => item.file.name === geo.identifier);
                if (matchingGeo) {
                    this.geo.fileDetail[idx].name = matchingGeo.name;
                    this.geo.fileDetail[idx].airtight = matchingGeo.airtight;
                }
              });
              this.geo.wireframe = this.tempGeo.wireframe;
              this.geo.factor = this.tempGeo.factor;
              this.collect();
            }).catch(error => {
              this.$notify({
                title: 'STL文件載入提示',
                message: `STL 文件載入異常。`,
                type: 'error'
              });
            });
          });
        }
      })
      .catch(e=>{})
    },
    // 儲存 STL 上傳文件
    saveFiles(){
      let formData = new FormData();
      for (let i = 0; i < this.geo.fileList.length; i++) formData.append('files[]',this.geo.fileList[i]); 
      axios.post(`/run/newTopic/addFiles/${this.uuid}`,formData,{
        headers:{
          'token':jsCookie.get('token')
        }
      })
      .then(res=>{
        this.$notify({
            title: 'STL文件儲存提示',
            message: `STL 檔案儲存成功。`,
            type: 'success'
        });
      })
      .catch(e=>{
        this.$notify({
            title: 'STL文件儲存提示',
            message: `STL 檔案儲存失敗。`,
            type: 'error'
        });
      })
    },


    // 獲取 attachment 上傳文件
    getAttachments(){
      axios.get(`/run/newTopic/getAttachments/${this.uuid}`,{
        headers:{
          'token':jsCookie.get('token')
        },
        responseType: 'blob'
      })
      .then(res=>{
        if(res.data){
          const blob = res.data;
          const zip = new JSZip();
          zip.loadAsync(blob).then(zip => {
            Object.keys(zip.files).map(filename => {
              const file = zip.files[filename];
              return file.async('blob').then(fileBlob => {
                const fileObject = new File([fileBlob], filename, {
                  type: fileBlob.type,
                });
                fileObject.uid = new Date().getTime();
                this.handleUpload2(fileObject);
              });
            });
          });
        }
      })
      .catch(e=>{
        this.$notify({
          title: 'Attachment 文件載入提示',
          message: `Attachment 文件載入異常。`,
          type: 'error'
        });
      })
    },
    // 儲存 attachment 上傳文件
    saveAttachments(){
      let formData = new FormData();
      for (let i = 0; i < this.attachment.length; i++) formData.append('files[]',this.attachment[i]); 
      axios.post(`/run/newTopic/addAttachments/${this.uuid}`,formData,{
        headers:{
          'token':jsCookie.get('token')
        }
      })
      .then(res=>{
        this.$notify({
            title: 'Attachments 文件儲存提示',
            message: `Attachments 檔案儲存成功。`,
            type: 'success'
        });
      })
      .catch(e=>{
        this.$notify({
            title: 'Attachments 文件儲存提示',
            message: `Attachments 檔案儲存失敗。`,
            type: 'error'
        });
      })
    }
  }
}
</script>

<style scoped>
  .main{
    display: flex;
    justify-content: space-evenly;
  }
  .key{
    background: transparent;
    color: gray;
  }
  /* 左列樣式 */
  .config{
    width: 390px;
    height: 100vh;
    box-shadow: 2px 0 10px gray;
    overflow-y: scroll;
    padding-left: 10px;
    padding-right: 10px;
    position: relative;
  }
  .top{
    width: 25%;
    height: 40px;
    border-bottom: 1px solid rgba(210,210,210);
    line-height: 40px;
    font-size: 18px;
  }
  .setting{
    width: 60px;
    height: 40px;
    line-height: 40px;
    font-size: 18px;
    position: absolute;
    top:0;
    right: 0;
    text-align: center;
  }
  .setting:hover{
    cursor: pointer;
  }
  .slider{
    width: 95%;
    margin: 0 auto;
  }
  .number{
    margin-top: 5px;
    margin-bottom: 5px;
  }
  .setBtn{
    /* width: 100%;
    margin: 0 auto; */
    float: right;
    margin-right: 2.5%;
  }
  .top{
    cursor: pointer;
  }
  .arrow{
    margin-right: 5px;
    padding-left: 10px;
  }
  .content{
    width: calc(100% - 390px);
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
  .title{
    position: relative;
    height: 40px;
  }
  .wireframe{
    position: absolute;
    top:0;
    right: 20px;
    font-size: 18px;
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
    right: 13px;
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
    border-radius: 7px;
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
  .upload_code{
    position: absolute;
    right: 30px;
    height: 40px;
    top:0;
    font-size: 14px;
  }
  .upload_code:hover{
    cursor: pointer;
  }
  .code_file{
    display: none;
  }
  .property{
    margin-top: 10px;
    padding-left: 5px;
  }
  .property-select{
    width: 40%;
  }
  .inputCode{
    width: 90%;
    margin: 0 auto;
    height: 280px;
    position: relative;
  }
  .cm-editor{
    margin-top: 5px;
    width: 100%;
    height: 100%;
    margin-left: -5px;
    border: 0.1px solid rgba(210,210,210);
    position: absolute;
    top:0;
    left:0;
    line-height: 1.5;
    overflow-y: scroll;
  }
  .cm-editor:focus{
    outline: 0;
  }
  .send{
    width:94%;
    margin: 0 auto;
    margin-bottom: 20px;
    margin-left: 10px;
    margin-top: 10px;
  }
  .keyboard{
    position: fixed;
    bottom: 10px;
    right:15px;
    color: gray;
  }
</style>