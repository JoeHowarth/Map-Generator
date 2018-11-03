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

  mesh = setup(130)

  const { points, triangles, halfedges } = mesh

  console.log(mesh)

  // let delaunay2 = Delaunay.from(mesh.vorCentroids)
  // let vor2 = delaunay2.voronoi([2, 2, W, H])
  // let mesh2 = makeMesh(vor2, ctx)

  // let delaunay3 = Delaunay.from(mesh2.vorCentroids)
  // let vor3 = delaunay3.voronoi([2, 2, W, H])
  // let mesh3 = makeMesh(vor3, ctx)

  // const mesh1 = mesh3
  // mesh = mesh3

  let m = genHM(mesh)
  // let m1 = genHM(mesh1)
  // let m2 = genHM(mesh2)


  let flux = HM.getFlux(mesh, m)

  console.log(d3.max(m), d3.max(flux))
  let f = HM.peaky(flux)


  // m = erode(mesh, m)
  let er = erosionRate(mesh, m)

  let slope = getSlope(mesh, m)
  let slope_vis = normalize(slope)
  // let slope_vis = peaky(slope)


  // mesh.renderVor({ color: '#440000' });

  function renderCentroid(mesh) {
    ctx.fillStyle = '#880000'
    mesh.triIDs.forEach((_,v) => {
      const [x, y] = mesh.centroids[v]
      ctx.beginPath()

      ctx.fillRect(x - 7, y - 7, 14, 14)
      ctx.fill()

    })
    ctx.fillStyle = '#000000'
  }
  let m1 = m.slice()

  // renderCentroid(mesh3)

  if (false) {
    alternate([
      // () => {
        // mesh.renderMesh(slope_vis);
        // mesh.adj.forEach((_, i) => showNeighbors(mesh, i))
      // },
      () => {
        mesh.renderDel()
        mesh.renderMesh(m)
        // mesh.adj.forEach((_, i) => showNeighbors(mesh, i))
      },
      () => {
        mesh.renderDel()
        m1 = HM.doErosion(mesh, m1, 0.07, 1);
        m1 = HM.cleanCoast(mesh, m1, 1)
        er = HM.erosionRate(mesh, m1)
        flux = HM.getFlux(mesh, m1)
        mesh.renderMesh(m1)
      },
      // () => {
      //   mesh.renderMesh(peaky(er))
      // },
      // () => {
      //   mesh.renderDel()
      //   mesh.renderMesh(peaky(flux))
      // }
    ], 2500)
  }
  else {
    mesh.renderDel()
    mesh.renderMesh(m)
  }

  /*
  if (false) {

    ctx.beginPath()
    ctx.clearRect(0, 0, W, H);
    ctx.fill()
    // mesh.renderVor();
    alternate([
      () => {
        ctx.beginPath()
        ctx.clearRect(0, 0, W, H);
        ctx.fill()
        // mesh.renderVor();
        mesh1.renderVor({ del: true })
        mesh1.renderMesh(m1)
        renderCentroid(mesh1)
        // mesh.renderDel()
      },
      () => {
        ctx.beginPath()
        ctx.clearRect(0, 0, W, H);
        ctx.fill()
        // mesh2.renderVor({color: '#440000'});
        mesh2.renderVor({
          color: '#440000',
          del: true
        })
        mesh2.renderMesh(m2)
        renderCentroid(mesh2)
        // mesh2.renderDel()
      },
      () => {
        ctx.beginPath()
        ctx.clearRect(0, 0, W, H);
        ctx.fill()
        //   mesh3.renderVor({color: '#00FF00'});
        mesh3.renderVor({
          color: '#00FF00',
          del: true
        })
        mesh.renderMesh(m)
        renderCentroid(mesh3)
      },
    ], 3000)

    */



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
  const [x, y] = mesh.centroids[i]
  nbs.forEach(j => {
    ctx.beginPath()
    ctx.moveTo(x, y)
    const [x1, y1] = mesh.centroids[j]
    ctx.lineTo(x1, y1)
    ctx.stroke()
  })
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
  let num_points = 1000000;
  // let pts = await getPoisson(num_per_gen, sampler);
  let i = 0
  for (let s; i < num_points && (s = sampler()); i++) {
    points.push(s)
  }
  console.log("num points: ", i)

  let delaunay = Delaunay.from(points);
  vor = delaunay.voronoi([2, 2, W, H]);


  mesh = makeMesh(vor, ctx)

  return mesh

}

