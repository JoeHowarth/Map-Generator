import Vue from 'vue';
import App from './App.vue';
import { rand, randi, add, drawPoly, alternate } from './map-utils'
import { Delaunay } from 'd3-delaunay';
import * as d3 from 'd3';
import * as m from './mesh'
import poissonDiscSampler from './poissonDiscSampler'
import * as HM from './heightmap'
import { genHM } from './heightmap'
import { heightToColor } from './render-map'
import { normalize } from './heightmap'
import { getSlope } from './heightmap'
import { erosionRate } from './heightmap'
import { peaky } from './heightmap'
import { erode } from './heightmap'

const { edge2tri, tri2edge, prevEdge, nextEdge, makeMesh } = m;

Vue.config.productionTip = false;

new Vue({
  render: h => h(App),
}).$mount('#app');


var canvas,
  sampler,
  ctx,
  vor,
  mesh,
  W,
  H;


document.addEventListener('DOMContentLoaded', async function (event) {

  mesh = setup(10)
  const { points, triangles, halfedges } = mesh

  console.log(mesh)
  let m = genHM(mesh)

  let m1 = m.slice()

  mesh.renderDel()
  mesh.renderMesh(m)

  window.Vor = vor;
});

function showNeighbors(mesh, i) {
  const nbs = mesh.adj[i]
  const [x, y] = mesh.centroids[i]
  nbs.forEach(j => {
    ctx.beginPath()
    ctx.moveTo(x, y)
    const [x1, y1] = mesh.centroids[j]
    ctx.lineTo(x1, y1)
    ctx.stroke()
  })
}

function renderCentroid(mesh) {
  ctx.fillStyle = '#880000'
  mesh.triIDs.forEach((_, v) => {
    const [x, y] = mesh.centroids[v]
    ctx.beginPath()

    ctx.fillRect(x - 7, y - 7, 14, 14)
    ctx.fill()

  })
  ctx.fillStyle = '#000000'
}

function setup(density = 20) {
  canvas = document.getElementById('canvasID');
  [W, H] = [window.outerWidth * 0.8, window.outerHeight * 0.9];
  canvas.width = W;
  canvas.height = H;
  canvas.margin = '5px'
  ctx = canvas.getContext('2d');
  ctx.font = '18px serif';

  console.log('W, H', W, H)

  sampler = poissonDiscSampler(W * 0.95, H * 0.95, density);

  let points = [];
  let max_points = 1000000;
  // let pts = await getPoisson(num_per_gen, sampler);
  let i = 0
  for (let s; i < max_points && (s = sampler()); i++) {
    points.push(s)
  }
  console.log('num points: ', i)

  let delaunay = Delaunay.from(points);
  vor = delaunay.voronoi([2, 2, W, H]);


  mesh = makeMesh(vor, ctx)

  return mesh

}

