<template>
    <div class="body" ref="body">
        <div class="title"><div class="top" @click="back()"><i class="fa-solid fa-arrow-left arrow"></i>back</div>專案列表</div>
        <div class="main">
            <el-table empty-text="暫無數據" :data="tableData.filter(data => !search || data.name.toLowerCase().includes(search.toLowerCase()))" style="width: 100%" :height="550" class="table" ref="table">
                <el-table-column label="建立時間" prop="date"></el-table-column>
                <el-table-column label="專案名稱" prop="name"></el-table-column>
                <el-table-column label="狀態" prop="status"></el-table-column>
                <template slot="empty" slot-scope="scope">
                    <el-skeleton class="skeleton" :loading="true" animated></el-skeleton>
                </template>
                <el-table-column align="right"> 
                    <template slot="header" slot-scope="scope">
                        <el-input v-model="search" size="mini" placeholder="輸入關鍵字搜索"/>
                    </template>
                    <template slot-scope="scope">
                        <el-button size="mini" @click="scope.row.status=='Ready'?handleDownload(scope.row.id):''" :disabled="scope.row.status!='Ready'">下載</el-button>
                        <el-button size="mini" type="danger" @click="scope.row.status=='Ready'?handleDelete(scope.row.id):''" :disabled="scope.row.status!='Ready'">刪除</el-button>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </div>
</template>

<script>
import DOT from 'vanta/dist/vanta.dots.min'
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
    },
    data(){
        return {
            tableData: [{
                id:'001',
                date: '2016-05-02',
                name: 'VTP.file',
                status:'Ready'
            },{
                id:'001',
                date: '2016-05-02',
                name: 'VTP.file',
                status:'Running'
            },{
                id:'001',
                date: '2016-05-02',
                name: 'VTP.file',
                status:'Queuing'
            }],
            search: ''
        }
    },
    methods:{
        back(){
            this.$router.replace('/gate').catch(()=>{});
        },
        handleDownload(idx){
            console.log(idx)
        },
        handleDelete(idx){

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