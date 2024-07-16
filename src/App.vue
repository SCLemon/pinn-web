<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
import Main from './pages/Main/Main.vue'

export default {
  name: 'App',
  components: {
    Main
  }
}
</script>

<style>
::-webkit-scrollbar{
  display: none;
}
#app {
  overflow: hidden;
}

/* results start */
.el-table__empty-text{
  width: 100% !important;
}
.el-table__row{
  background: transparent !important;
}
.el-table tr{
  background-color:transparent !important;
}
.el-table th.el-table__cell{
  background-color:transparent !important;
}
.el-table__empty-block{
  align-items: start !important;
}
/* results end */
</style>
