<template>
  <div id="app">
    <!--<img alt="Vue logo" src="./assets/logo.png">-->
    <p>Vue</p>
    <!--<Map/>-->
  </div>
</template>

<script>
import Map from './components/Map.vue';

export default {
  name: 'app',
  components: {
    Map,
  },
};
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  display: flex;
  flex-direction: column;
  /*align-content: center;*/
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
  img {
    align-self: center;
    height: 100px;
  }
</style>
