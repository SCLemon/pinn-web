<template>
    <div class="body" ref="body">
        <div class="title"><div class="top" @click="back()"><i class="fa-solid fa-arrow-left arrow"></i>back</div>專案列表</div>
        <div class="main">
            <el-table empty-text="暫無數據" :data="tableData.filter(data => !search || data.name.toLowerCase().includes(search.toLowerCase()))" style="width: 100%" :height="550" class="table" ref="table">
                <el-table-column label="建立時間" prop="date"></el-table-column>
                <el-table-column label="專案名稱" prop="filename"></el-table-column>
                <el-table-column label="狀態" prop="status"></el-table-column>
                <template slot="empty" slot-scope="scope">
                    <el-skeleton v-if="isLoading" class="skeleton" :loading="isLoading" animated></el-skeleton>
                </template>
                <el-table-column align="right"> 
                    <template slot="header" slot-scope="scope">
                        <el-input v-model="search" size="mini" placeholder="輸入關鍵字搜索"/>
                    </template>
                    <template slot-scope="scope">
                        <el-button size="mini" @click="scope.row.status =='Ready'?handleDownload(scope.row.id,scope.row.filename):''" :disabled="scope.row.status !='Ready'">下載</el-button>
                        <el-button size="mini" type="danger" @click="scope.row.status =='Ready'?handleDelete(scope.row.id):''" :disabled="scope.row.status !='Ready'">刪除</el-button>
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
    },
    data(){
        return {
            tableData: [{}],
            search: '',
            isLoading:true,
        }
    },
    methods:{
        getList(){
            this.isLoading = true;
            axios.get('/run/findAll',{
                headers:{
                    'user-token':jsCookie.get('token')
                }
            })
            .then(res=>{
                this.tableData = res.data;
            })
            .catch(e=>{
                console.log(e)
            })
            .finally(()=>{
                this.isLoading = false;
            })
        },
        back(){
            this.$router.replace('/gate').catch(()=>{});
        },
        handleDownload(idx,filename){
            axios.get(`/run/download/${idx}`,{
                responseType: 'blob',
            })
            .then(res=>{
                const blob = new Blob([res.data], { type: filename.split('.')[1] });
                const url = window.URL.createObjectURL(blob); // 創建下載 URL
                const a = document.createElement('a'); // 創建一個隱藏的連結元素
                a.style.display = 'none';
                a.href = url;
                a.download = filename; // 使用獲取的檔案名
                document.body.appendChild(a);
                a.click(); // 觸發點擊事件以開始下載
                window.URL.revokeObjectURL(url); // 釋放資源
            })
            .catch(e=>console.log(e))
        },
        handleDelete(idx){
            axios.delete(`/run/delete/${idx}`)
            .then(res=>{
                this.getList();
            })
            .catch(e=>console.log(e))
        }
    },
    beforeDestroy(){
      if (this.vantaEffect) {
        this.vantaEffect.destroy()
      }
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