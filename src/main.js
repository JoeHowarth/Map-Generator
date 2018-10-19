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

  mesh = setup(50)

  const { points, triangles, halfedges } = mesh

  console.log(mesh)

  let m = genHM(mesh)
  mesh.renderMesh(m)

  // let flux = HM.getFlux(mesh, m)
  // console.log('flux', flux)

  // console.log(d3.max(m), d3.max(flux))
  // let f = HM.peaky(flux)


  // m = erode(mesh, m)
  let er = erosionRate(mesh, m)
  // console.log(er)

  let slope = getSlope(mesh, m)
  console.log("slope",d3.max(slope), d3.min(slope),d3.median(slope), slope[1], slope[20])
  // let slope_vis = normalize(slope)
  let slope_vis = peaky(slope)

  mesh.renderMesh(slope_vis)
  ctx.beginPath()
  mesh.delaunay.render(ctx)
  ctx.stroke()

  let f, eh = m.slice()

  ctx.fillStyle = '#000000'
  mesh.centroids.forEach(([x,y]) => {
    ctx.beginPath()

    ctx.fillRect(x-7,y-7, 14, 14)
    ctx.fill()

  })

  mesh.adj.forEach((_,i) => showNeighbors(mesh,i))
  mesh.renderVor()
  // mesh.renderMesh(m)




  // alternate([
    // () => mesh.renderMesh(m, {a: 0.9}),
    // () => mesh.renderMesh(f, {a: 0.9}),
    // () => mesh.renderMesh(er, 0.9),
    // () => {
    //   eh = HM.doErosion(mesh, eh, 0.01, 1)
    //   f = HM.peaky(HM.getFlux(mesh, eh));
    //   mesh.renderMesh(eh, {a: 0.9})
    // },
    // () => mesh.renderMesh(slope_vis, 0.9),
  // ], 200000)

  // console.log(m)

  window.Vor = vor;
});

function showNeighbors(mesh, i) {
  const nbs = mesh.adj[i]
  const [x,y] = mesh.centroids[i]
  nbs.forEach(j => {
    ctx.beginPath()
    ctx.moveTo(x,y)
    const [x1, y1] = mesh.centroids[j]
    ctx.lineTo(x1, y1)
    ctx.stroke()
  })
}


function setup(density = 20) {
  canvas = document.getElementById('canvasID');
  [W, H] = [window.outerWidth * 0.99, window.outerHeight * 0.8];
  canvas.width = W;
  canvas.height = H;
  canvas.margin = '5px'
  ctx = canvas.getContext('2d');
  ctx.font = '18px serif';

  console.log('W, H', W, H)

  sampler = poissonDiscSampler(W * 0.95, H * 0.95, density);

  let points = [];
  let num_points = 10000;
  // let pts = await getPoisson(num_per_gen, sampler);
  for (let s, i = 0; i < num_points && (s = sampler()); i++) {
    points.push(s)
  }

  let delaunay = Delaunay.from(points);
  vor = delaunay.voronoi([2, 2, W, H]);

  console.log(vor)

  mesh = makeMesh(vor, ctx)

  return mesh

}

