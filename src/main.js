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

  // let m = add(
  //   HM.mountains(mesh, 2, 150.1, 0.8),
  //   HM.mountains(mesh, 2, 350.1, 0.4),
  //   HM.mountains(mesh, 5, 101, 1.0),
  //   HM.mountains(mesh, 10, 71, .4),
  //   HM.cone(mesh, 0.0015),
  // )
  // m = peaky(m)
  // m = mesh.relax(m)
  // let dh = downhill(mesh, m)

  // setInterval(() => {
  //   ctx.beginPath()
    // const l = ctx.lineWidth
    // ctx.lineWidth = 1
    // ctx.strokeStyle = 'rgb(0,155,0)'
    // for (let i = 0; i < dh.length; i++) {
    //   ctx.moveTo(points[i * 2], points[i * 2 + 1])
    //   const d = dh[i] * 2
    //   ctx.lineTo(points[d], points[d + 1])
    // }
    // ctx.stroke()
    // ctx.lineWidth = l
  // }, 200)
  console.log(mesh)

  let m = genHM(mesh)

  let flux = HM.getFlux(mesh, m)
  // console.log('flux', flux)

  console.log(d3.max(m), d3.max(flux))
  let f = HM.peaky(flux)


  // m = erode(mesh, m)
  // const er = erosionRate(mesh, m)
  // let slope = getSlope(mesh, m)
  // console.log(slope)
  // let slope_vis = normalize(slope)


  // mesh.renderMesh(m, {cfn: heightToColor, a: 0.9})
  mesh.renderVor({ thickness: 5, color: 'rgb(0,255, 255)', alpha: 1.0 })
  mesh.renderVor({ del: true, alpha: 1.0 })

  // alternate([
  //   () => mesh.renderMesh(m, {cfn: heightToColor, a: 0.9}),
    // () => mesh.renderMesh(m, {cfn: d3.interpolateMagma, a: 0.9}),
    // () => mesh.renderMesh(er, 0.9),
    // () => {
    //   eh = doErosion(mesh, eh, 0.02, 3)
    //   f = peaky(getFlux(mesh, eh));
    //   mesh.renderMesh(eh, {cfn: d3.interpolateMagma, a: 0.9})
    // },
    // () => mesh.renderMesh(slope_vis, 0.9),
  // ], 1500)

  // console.log(m)

  window.Vor = vor;
});


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

