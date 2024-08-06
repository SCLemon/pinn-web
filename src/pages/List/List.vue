<template>
    <div class="body" ref="body">
        <div class="title"><div class="top" @click="back()"><i class="fa-solid fa-arrow-left arrow"></i>back</div>專案列表</div>
        <div class="main">
            <el-table empty-text="暫無數據" :data="tableData.filter(data => !search || data.filename.toLowerCase().includes(search.toLowerCase()))" style="width: 100%" :height="550" class="table" ref="table">
                <el-table-column label="建立時間" prop="date"></el-table-column>
                <el-table-column label="專案名稱" prop="filename"></el-table-column>
                <el-table-column label="狀態" prop="status"></el-table-column>
                <el-table-column label="輸出檔案" prop="output"></el-table-column>
                <template slot="empty" slot-scope="scope">
                    <el-skeleton v-if="isLoading" class="skeleton" :loading="isLoading" animated></el-skeleton>
                </template>
                <el-table-column align="right"> 
                    <template slot="header" slot-scope="scope">
                        <el-input v-model="search" size="mini" placeholder="輸入關鍵字搜索"/>
                    </template>
                    <template slot-scope="scope">
                        <el-button size="mini" @click="(scope.row.status =='Ready' && !isDownload[scope.$index])?handleDownload(scope.row.output,scope.row.outputRoute,scope.$index):''" :disabled="scope.row.status !='Ready' || isDownload[scope.$index]">下載</el-button>
                        <el-button size="mini" type="danger" @click="scope.row.status =='Ready'?handleDelete(scope.row.id,scope.row.inputRoute):''" :disabled="scope.row.status !='Ready'">刪除</el-button>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </div>
</template>

<script>
import DOT from 'vanta/dist/vanta.dots.min'
import axios from 'axios'
import jsCookie from 'js-cookie';
export default {
    name:'List',
    mounted(){
      this.vantaEffect = DOT({
        el: this.$refs.body,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        scale: 1.00,
        scaleMobile: 1.00,
        color: 0x20e4ff,
        color2: 0xe3e3,
        backgroundColor: 0xffffff
      })
      this.getList();
      this.timer = setInterval(() => {
        this.getList();
      }, 3000);
    },
    data(){
        return {
            isDownload:[],
            tableData: [],
            search: '',
            isLoading:true,
            timer:0,
        }
    },
    methods:{
        getList(){
            axios.get('/run/findAll',{
                headers:{'user-token':jsCookie.get('token')}
            })
            .then(res=>{this.tableData = res.data.reverse();})
            .catch(e=>{console.log(e)})
            .finally(()=>{this.isLoading = false;})
        },
        back(){
            this.$router.replace('/gate').catch(()=>{});
        },
        handleDownload(output,route,idx){
            this.isDownload[idx] = true;
            axios.post(`/run/download`,{name:output,route:route},{responseType: 'blob'})
            .then(res=>{
                const blob = new Blob([res.data], { type: output.split('.')[1] });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = output;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            })
            .catch(e=>console.log(e))
            .finally(()=>{
                this.isDownload[idx] = false;
            })
        },
        handleDelete(idx,route){
            this.$confirm('確認刪除?', '提示', {confirmButtonText: '確定',cancelButtonText: '取消',type: 'warning'})
            .then(() => {
                axios.delete(`/run/delete`,{data: {fileId: idx,route: route}})
                .then(res=>{
                    this.$message({type: 'success',message: '刪除成功!'});
                    this.getList();
                })
            .catch(e=>console.log(e))
            }).catch(() => {});
        },
    },
    beforeDestroy(){
      if (this.vantaEffect) this.vantaEffect.destroy();
      clearInterval(this.timer)
    },
    updated(){
        this.$refs.table.style='background:transparent;'
    }
}
</script>

<style scoped>
    .body{
        width: 100vw;
        height: 100vh;
    }
    .main{
        width: 95%;
        margin: 0 auto;
    }
    .title{
        width: 100%;
        height: 200px;
        font-size: 32px;
        text-align: center;
        line-height: 200px;
        position: relative;
    }
    .top{
        position: absolute;
        top:0;
        left: 3%;
        height: 200px;
        line-height: 200px;
        font-size: 18px;
    }
    .top:hover{
        cursor: pointer;
    }
    .arrow{
        margin-right: 5px;
    }
    .table{
        background: transparent !important;
    }
    .skeleton{
        text-align: left;
        
    }
</style>