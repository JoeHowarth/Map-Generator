<template>
  <canvas ref="Rcanvas">

  </canvas>
</template>

<script>
  import * as d3 from 'd3';
  import { Delaunay } from 'd3-delaunay';
  // import TWEEN from '@tweenjs/tween.js';

  export default {
    name: 'Map',
    data() {
      return {
        data: [99, 71, 78, 25, 36, 92],
        line: '',
      };
    },
    mounted: function () {
      // const points = [[0, 0], [0, 1], [1, 0], [1, 1]];
      // const delaunay = Delaunay.from(points);
      // const voronoi = delaunay.voronoi([0, 0, 960, 500]);
      // const p = voronoi.render();
      // console.table(p);
      // console.log('hi');
      //
      // this.line = p;
      this.render()
    },
    computed: {
//       sites() {
//         d3.range(100)
//           .map(d => [math.random() * width, math.random() * height]);
//         return sites;
//       },
//       veroni() {
//         return d3.voronoi()
//           .extent([[0, 0], [this.width, this.height]])
//       },
//       veroniDiagram() {
//         let svg = d3.select("svg"),
//           width = +svg.attr("width"),
//           height = +svg.attr("height"),
//           sites = d3.range(100).map(function(d) {
//             return [Math.random() * width, Math.random() * height];
//           }),
//           voronoi = d3.voronoi().extent([[0, 0], [width, height]]),
//           diagram = voronoi(sites),
//           polygons = diagram.polygons();
//
// // Draw the polygons
//         polygons.map(function(i) {
//           svg.append("path")
//             .attr("d", "M" + i.join("L") + "Z");
//         });
//       }
    },
    methods: {
      render() {
        let ctx = this.$refs['Rcanvas'].getContext("2d")
        const points = [[0, 0], [0, 1], [1, 0], [1, 1]];
        const delaunay = Delaunay.from(points);
        const voronoi = delaunay.voronoi([0, 0, 960, 500]);
        const p = voronoi.render(ctx);
        console.table(p);
        console.log('hi');

        this.line = p;
      },
    },
  }
  ;
  // const _ = () => {
  //   const svg = d3.select('svg')
  //   const width = +svg.attr('width')
  //   const height = +svg.attr('height')
  //   let sites = d3.range(100)
  //       .map(d => [math.random() * width, math.random() * height]),
  //     voronoi = d3.voronoi()
  //       .extent([[0, 0], [width, height]]),
  //     diagram = voronoi(sites),
  //     polygons = diagram.polygons();
  //
  //     // Draw the polygons
  //   polygons.map((i) => {
  //     svg.append('path')
  //       .attr('d', `M${i.join('L')}Z`);
  //   });

</script>

<style scoped>
  svg {
    margin: 25px;
    background-color: aliceblue;

  }

  path {
    fill: none;
    stroke: #76BF8A;
    stroke-width: 3px;
  }
</style>

