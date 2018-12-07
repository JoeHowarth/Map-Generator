<template>
  <v-app>
    <v-toolbar app>
      <v-toolbar-title class="headline text-uppercase">
        <span>Map </span>
        <span class="font-weight-light">Generator</span>
      </v-toolbar-title>
      <v-btn color="info" @click="setHeight">Height Map</v-btn>
      <v-btn color="info" @click="setER">Erosion Rate</v-btn>
      <v-btn color="info" @click="setFlux">Water Flux</v-btn>
      <v-btn color="info" @click="setSlope">Slope</v-btn>
      <v-btn color="warn" @click="regen">Regen</v-btn>
      <v-spacer></v-spacer>
    </v-toolbar>

    <!--<v-spacer></v-spacer>-->

    <!--<Drawer/>-->

    <v-content>
        <canvas id="map_canvas"></canvas>
    </v-content>

    <!--<v-content>-->
      <!--<v-container>-->
        <!--<v-data-table-->
            <!--:headers="headers"-->
            <!--:items="positions"-->
            <!--hide-actions-->
            <!--class="elevation-1"-->
        <!--&gt;-->
          <!--<template slot="items" slot-scope="props">-->
            <!--<td>{{ props.item.x }}</td>-->
            <!--<td class="text-xs-right">{{ props.item.x }}</td>-->
            <!--<td class="text-xs-right">{{ props.item.y }}</td>-->
          <!--</template>-->
        <!--</v-data-table>-->
      <!--</v-container>-->
    <!--</v-content>-->
  </v-app>
</template>

<script>
  import Drawer from './components/Drawer'
  import { mapState } from 'vuex'
  import {updateColorsFun} from "./map_gen/render/webgl";
  import {getER, getHeight, getMesh} from "./map_gen/map_gen";
  import mapGen from './map_gen/map_gen'
  import {getFlux, getSlope, normalize, peaky} from "./map_gen/heightmap";

  export default {
    name: 'App',
    components: {
      Drawer,
    },
    data() {
      return {
        components: [
          {name: 'Home', icon: 'dashboard'},
          {name: 'About', icon: 'question_answer'}
        ],
        drawer: true,
        headers: [
          {
            text: 'IDs ',
            align: 'left',
            sortable: false,
            value: 'id'
          },
          {text: 'X', value: 'x'},
          {text: 'Y', value: 'y'},
        ],
      }
    },
    methods: {
      logClick() {
        console.log("Clicked")
      },
      setHeight() {
        updateColorsFun(getHeight())
      },
      setER() {
        updateColorsFun(getER())
      },
      setFlux() {
        updateColorsFun(peaky(peaky(getFlux(getMesh(), getHeight()))))
      },
      setSlope() {
        const vals = normalize(getSlope(getMesh(), getHeight()), 0.5)
        updateColorsFun(vals)
        console.log("slope", vals)
      },
      regen() {
        mapGen()
      }
    },
    computed: mapState(["positions"]),

  }
</script>
