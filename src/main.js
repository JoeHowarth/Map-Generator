import Vue from 'vue';
import App from './App.vue';
import { rand, randi, add, drawPoly, alternate } from './map-utils'
import { Delaunay } from 'd3-delaunay';
import * as d3 from 'd3';
import * as m from './mesh'
import poissonDiscSampler from './poissonDiscSampler'
import * as HM from './heightmap'
import { genHM } from './heightmap'
import { heightToColor, renderCoastLine } from './render-map'
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
  Wpx,
  Hpx,
  Wkm,
  Hkm;


document.addEventListener('DOMContentLoaded', async function (event) {

  mesh = await setup(100, 100, 3.9)
  const { points, triangles, halfedges } = mesh

  console.log(mesh)
  let m = await genHM(mesh)
  exportMesh(mesh)

  console.log(mesh)

  /*
  let slope = HM.getSlope(mesh, m)
  let slope_vis = normalize(slope)
  console.log("slope info", d3.min(slope), d3.max(slope), d3.median(slope))
  */

  console.log("height info", d3.min(m), d3.max(m), d3.median(m))

  if (true) {
    mesh.renderMesh(m)
    renderCoastLine(mesh, m)
    renderCoastLine(mesh, m, 0.3)
    renderCoastLine(mesh, m, 0.6)
  } else {
    alternate([
        () => mesh.renderMesh(m),
        // () => mesh.renderMesh(slope_vis),
        // () => mesh.renderMesh(normalize(er)),
      ],
      2000)
  }
});


/* gets canvas ctx, generates points, sets scale transforms
 * width & height: 100 km
 *
 */
async function setup(Wkm_ = 100, Hkm_ = 100, density = 1) {
  Wkm = Wkm_
  Hkm = Hkm_
  const ratio = Wkm / Hkm;
  Hpx = window.outerHeight * 0.9;
  Wpx = Hpx * ratio
  if (Wpx > window.outerWidth) {
    Wpx = window.outerWidth * 0.9
    Hpx = Wpx / ratio
  }

  const km2px = Wpx / Wkm
  const px2km = Wkm / Wpx

  canvas = document.getElementById('canvasID');
  canvas.width = Wpx;
  canvas.height = Hpx;
  canvas.margin = '5px'
  ctx = canvas.getContext('2d');
  ctx.font = '18px serif';

  console.log('Wpx, Hpx', Wpx, Hpx)
  console.log('Wkm, Hkm', Wkm, Hkm)

  ctx.fillRect(Wpx/2, Hpx/2, 30, 30)
  ctx.strokeRect(0,0, Wpx, Hpx)


  sampler = poissonDiscSampler(Wkm * 0.98, Hkm * 0.98, density);

  console.time("sample points")

  let points = [];
  const max_points = 1000000;
  // let pts = await getPoisson(num_per_gen, sampler);
  let i = 0
  for (let s; i < max_points && (s = sampler()); i++) {
    points.push(s)
  }
  console.timeEnd("sample points")
  console.log('num points: ', i)

  points = points.map(([x,y]) => [x+Wkm * 0.010, y+Hkm * 0.010])

  const delaunay = Delaunay.from(points);
  vor = delaunay.voronoi([0, 0, Wkm, Hkm]);

  ctx.beginPath()
  delaunay.render(ctx)
  ctx.stroke()


  mesh = await makeMesh(vor, ctx, [Wkm, Hkm], [Wpx, Hpx])

  return mesh

}


function exportMesh(mesh) {
  let ret = {}
  ret.adj = mesh.adj
  ret.points = mesh.points
  ret.invTriIDs = mesh.invTriIDs
  ret.triIDs = mesh.triIDs
  ret.Dkm = mesh.Dkm
  ret.centroids = mesh.centroids
  ret.VorCentroids = mesh.VorCentroids

  // exportToJsonFile(ret)
}

function exportToJsonFile(jsonData) {
  let dataStr = JSON.stringify(jsonData);
  let dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

  let exportFileDefaultName = 'data.json';

  let linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}
