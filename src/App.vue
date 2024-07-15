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
</style>
