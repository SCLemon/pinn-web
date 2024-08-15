<template>
    <div>
        <div v-html="code" class="codeBlock" v-if="code!=''"></div>
        <el-empty description="Nothing Here" class="codeBlock"></el-empty>
    </div>
</template>

<script>
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
export default {
    name:'CodeViewer',
    data(){
        return{
            code:'',
        }
    },
    mounted(){
        this.$bus.$on('setCode',this.setCode);
        hljs.highlightAll();
    },
    methods:{
        setCode(code){
            this.code = code;
        }
    },
    updated(){
        hljs.highlightAll();
        this.$nextTick(()=>{
            document.querySelector('.codeBlock').classList.add('font');
        })
    }
}
</script>

<style scoped>
    .codeBlock{
        z-index: 1000;
        width: 100%;
        height: 100vh;
        overflow-y: scroll;
        line-height: 1.5;
    }
    .font {
        font-family:  monospace;
    }
</style>