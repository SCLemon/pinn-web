<template>
  <div ref='vantaRef' class="body">
    <div class="loginBox">
        <div>
            <div class="title">Login Form</div>
            <div class="inputBox">
                <div class="input-title">Mail Address</div>
                <el-input v-model="mail" placeholder="请輸入電子信箱"></el-input>
                <div class="input-title">Password</div>
                <el-input placeholder="請輸入密碼" v-model="password" show-password></el-input>
                <div class="input-title">Verify Code</div>
                <div class="verifyCode">
                    <div class="vc"><el-input v-model="verifyCode" clear="vc-input" placeholder="請輸入驗證碼"></el-input></div>
                    <div class="vc vc2" ref="canvas"><canvas id="canvas" @click="handleClick"></canvas></div>
                </div>
                <el-button type="primary" class="btn" :loading="isLoading" @click="login()">{{ isLoading?'登入請求中...':'註冊 / 登入' }}</el-button>
                <div class="subTitle">
                    Powered By NCHC
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script>
import Globe from 'vanta/dist/vanta.globe.min'
import ImageVerify from './js/imageVerify.js'
import axios from 'axios'
import jsCookie from 'js-cookie'
export default {
    name:'Login',
    data(){
        return{
            mail:'',
            password:'',
            verifyCode:'',
            isLoading:false,
            imageVerify:''
        }
    },
    mounted(){
        this.vantaEffect = Globe({
            el: this.$refs.vantaRef,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: 1.00,
            scaleMobile: 1.00
        })
        var canvasWidth = this.$refs.canvas.clientWidth;
        this.imageVerify = new ImageVerify({
            id: 'canvas',
            width: canvasWidth,
            height: 42,
        });
    },
    methods:{
        handleClick() {
            this.imageVerify.start();
        },
        login(){
            if(this.verifyCode != this.imageVerify.code){
                this.$message({type: 'error',message: '驗證碼錯誤'});
            }
            else if(this.mail.trim()=='' || this.password.trim()=='' || this.verifyCode.trim()==''){
                this.$message({type: 'warning',message: '資料不可為空'});
            }
            else{
                axios.post('/verify/register',{
                    mail:this.mail,
                    password:this.password
                })
                .then(res=>{
                    if(typeof res.data =='object'){
                        this.$message({type: 'success',message: res.data.message});
                        jsCookie.set('token',res.data.token);
                        this.$router.replace('/gate')
                    }
                    else{
                        this.$message({type: 'error',message: res.data});
                    }
                })
                .catch((e)=>{
                    console.log(e)
                })
            }
        }
    },
    beforeDestroy(){
        if (this.vantaEffect) {
            this.vantaEffect.destroy()
        }
    }
}
</script>

<style scoped>
    .body{
        width: 100vw;
        height: 100vh;
        position: relative;
    }
    .loginBox{
        width: 450px;
        height: 600px;
        position: absolute;
        top:100px;
        left: 150px;
        background-color: rgba(255,255,255,0.1);
        border-radius: 10px;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .title{
        height: 80px;
        line-height: 80px;
        text-align: center;
        font-size: 28px;
        color: white;
        width: 80%;
        margin: 0 auto;
        border-bottom: 1px solid rgba(150,150,150);
    }
    .inputBox{
        width: 80%;
        margin: 0 auto;
        height: calc(100% - 80px);
    }
    .input-title{
        height: 70px;
        line-height: 70px;
        color: white;
    }
    .verifyCode{
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 40px;
    }
    .vc{
        width: 60%;
        height: 100%;
    }
    .vc2{
        width: 35%;
        height: 100%;
    }
    .vc2:hover{
        cursor: pointer;
    }
    .btn{
        margin-top: 30px;
        width: 100%;
    }
    .subTitle{
        width: 100%;
        text-align: center;
        height: 100px;
        line-height: 100px;
        color: rgba(190,190,190);
        font-size: 14px;
    }
</style>