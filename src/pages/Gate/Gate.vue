<template>
  <div class="main">
    <div class="title">Welcome To Use PINNs Analyzer <div class="out" @click="logout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> Log Out</div></div>
    <div class="blocks">
      <div class="blk1 block" @click="go('/main')">
        <div class="img img1"></div>
        <div class="text">新增文件</div>
      </div>
      <div class="blk2 block">
        <div class="img img2"></div>
        <div class="text">歷史紀錄</div>
      </div>
      <div class="blk1 block">
        <div class="img img3"></div>
        <div class="text">演算結果</div>
      </div>
      <div class="blk2 block" @click="go('/viewer')">
        <div class="img img4"></div>
        <div class="text">視覺分析</div>
      </div>
    </div>
  </div>
</template>

<script>
import jsCookie from 'js-cookie';

export default {
    name:'Gate',
    methods:{
      go(path){
        this.$router.replace(path).catch(()=>{})
      },
      logout(){
        this.$confirm('確認登出?', '提示', {
          confirmButtonText: '確定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          jsCookie.set('token','');
          this.$router.replace('/').catch(()=>{});
          this.$message({
            type: 'success',
            message: '登出成功!'
          });
        }).catch(() => {});
      },
    }
}
</script>

<style scoped>
  .main{
    width: 100%;
    height: 70vh;
    margin: auto;
    padding: 20px;
    display: grid;
    justify-items: center; /* 水平居中 */
    align-items: center; /* 垂直居中 */
  }
  .title{
    width: 100%;
    text-align: center;
    height: 30px;
    line-height: 30px;
    font-size: 32px;
    position: relative;
  }
  .out{
    position: absolute;
    height: 30px;
    line-height: 30px;
    top:0;
    right: 60px;
    font-size: 18px;
  }
  .out:hover{
    cursor: pointer;
  }
  .blocks{
    width: calc(100% - 40px);
    height: 100px;
    display: flex;
    justify-content: space-evenly;
    align-items: center;
  }
  .block{
    width: 22.5%;
    height: 22.5vw;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    align-items: center;
    border-radius: 10px;
  }
  .block{
    cursor: pointer;
  }
  .blk1{
    background: #fcf4e8;
  }
  .blk2{
    background: #fffaf4;
  }
  .img{
    width: 60%;
    height: 60%;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    margin: 0 auto;
  }
  .img1{
    background-image: url('/public/img/edit.png');
  }
  .img2{
    background-image: url('/public/img/history.png');
  }
  .img3{
    background-image: url('/public/img/folder.png');
  }
  .img4{
    background-image: url('/public/img/viewer.png');
  }
  .text{
    width: 100%;
    height: 40px;
    line-height: 40px;
    text-align: center;
    font-size: 22px;
    color:rgba(150,150,150);
  }
</style>