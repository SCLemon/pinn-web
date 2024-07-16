<template>
  <div class="main" ref="main">
    <div class="title">Welcome To Use PINNs Analyzer <div class="out" @click="logout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> Log Out</div></div>
    <div class="blocks">
      <div class="blk1 block" @click="go('/main')">
        <div class="img img1"></div>
        <div class="text">New Topic</div>
      </div>
      <div class="blk1 block" @click="go('/list')">
        <div class="img img2"></div>
        <div class="text">Results</div>
      </div>
      <div class="blk1 block" @click="go('/viewer')">
        <div class="img img4"></div>
        <div class="text">Analyzer</div>
      </div>
    </div>
  </div>
</template>

<script>
import jsCookie from 'js-cookie';
import NET from 'vanta/dist/vanta.net.min'
export default {
    name:'Gate',
    mounted(){
      this.vantaEffect = NET({
          el: this.$refs.main,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00
      })
    },
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
          this.$router.replace('/login').catch(()=>{});
          this.$message({
            type: 'success',
            message: '登出成功!'
          });
        }).catch(() => {});
      },
    },
    beforeDestroy(){
      if (this.vantaEffect) {
        this.vantaEffect.destroy()
      }
    }
}
</script>

<style scoped>
  .main{
    width: 100%;
    height: 100vh;
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
    text-shadow: -5.5px -5.5px 5px rgba(#fff, 0.3), 6.5px 6.5px 1px #ff0054;
    color: transparent;
    -webkit-text-stroke-width: 2px;
    -webkit-text-stroke-color:white;
    font-family: 'Titan One', cursive;
  }
  .out{
    position: absolute;
    height: 30px;
    line-height: 30px;
    top:0;
    right: 70px;
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
  .block:hover{
    cursor: pointer;
  }
  .blk1{
    background:  linear-gradient(rgba(255,255,255,0.05),rgba(255,255,255,0.4));
    animation: bg 7s ease-in-out infinite;
    animation-delay: 0.5s;
  }
  @keyframes bg {
    0% {
        background-color: rgba(255, 255, 255, 0); /* 暗 */
    }
    50% {
        background-color: rgba(255, 255, 255, 0.4); /* 亮 */
    }
    100% {
        background-color: rgba(255, 255, 255, 0); /* 暗 */
    }
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
  .img4{
    background-image: url('/public/img/analyzer.png');
  }
  .text{
    width: 100%;
    height: 40px;
    line-height: 40px;
    text-align: center;
    font-size: 22px;
    text-shadow: -5.5px -5.5px 5px rgba(#fff, 0.3), 6.5px 6.5px 1px #ff0054;
    color: transparent;
    -webkit-text-stroke-width: 1px;
    -webkit-text-stroke-color:white;
    font-family: 'Titan One', cursive;
  }
</style>