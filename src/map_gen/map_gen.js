import {Delaunay} from 'd3-delaunay';
import poissonDiscSampler from './poissonDiscSampler'
import {
  displayIDs,
  renderCities, renderCitiesGL, renderCoastLine,
  renderRiversGL
} from './render/render-map'
import {} from './heightmap'
import {
  genHM,
  placeCities,
  downhill, getFlux, getSlope, getRivers,
} from './heightmap'
import {init_babylon} from './render/webgl'
import {makeMesh} from "./mesh";
import store from '../store'

const WEBGL = true;

var canvas,
  sampler,
  ctx,
  vor,
  mesh,
  Wpx,
  Hpx,
  Wkm,
  Hkm;


export default async function (event) {

  mesh = await setup(100, 100, 1.8)
  // const {points, triangles, halfedges} = mesh

  console.log(mesh)
  let h = await genHM(mesh)

  exportMesh(mesh, getSlope(mesh, h), getFlux(mesh, h), downhill(mesh, h))

  setTimeout(() => renderMapGL(mesh, h), 10)
};


export async function renderMapGL(mesh, h) {
  let scene = await init_babylon(mesh, h)

  await renderRiversGL(mesh, h, 0.01, scene)
  renderCoastLine(mesh, h, 0, true, BABYLON.Color3.Black())
  setTimeout(async () => {
    const cities = placeCities(mesh, h, 20)
    // renderCitiesGL(mesh, cities)
  }, 10)
  setTimeout(() => displayIDs(mesh), 0);



  renderCoastLine(mesh, h, 0.3, true)
}

/* gets canvas ctx, generates points, sets scale transforms
 * width & height: 100 km
 *
 */
async function setup(Wkm_ = 100, Hkm_ = 100, density = 1) {
  Wkm = Wkm_
  Hkm = Hkm_
  const ratio = Wkm / Hkm;
  Hpx = window.outerHeight * 0.85;
  Wpx = Hpx * ratio
  if (Wpx > window.outerWidth * 0.9) {
    Wpx = window.outerWidth * 0.9
    Hpx = Wpx / ratio
  }

  const km2px = Wpx / Wkm
  const px2km = Wkm / Wpx

  canvas = document.getElementById('map_canvas');
  canvas.width = Wpx;
  canvas.height = Hpx;
  canvas.margin = '5px'
  if (!WEBGL) {
    ctx = canvas.getContext('2d');
    ctx.font = '18px serif';
    ctx.strokeRect(0, 0, Wpx, Hpx)
  }

  console.log('Wpx, Hpx', Wpx, Hpx)
  console.log('Wkm, Hkm', Wkm, Hkm)


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

  points = points.map(([x, y]) => [x + Wkm * 0.010, y + Hkm * 0.010])

  const delaunay = Delaunay.from(points);
  vor = delaunay.voronoi([0, 0, Wkm, Hkm]);

  mesh = await makeMesh(vor, ctx, [Wkm, Hkm], [Wpx, Hpx])

  return mesh

}


function exportMesh(mesh, slope, flux, downhill, file) {
  let ret = {}
  ret.adj = Array.from(mesh.adj)
  ret.halfedges = Array.from(mesh.halfedges)
  ret.points = Array.from(mesh.points)
  ret.invTriIDs = Array.from(mesh.invTriIDs)
  ret.triIDs = Array.from(mesh.triIDs)
  ret.Dkm = Array.from(mesh.Dkm)
  ret.centroids = mesh.centroids
  ret.triangles = Array.from(mesh.triangles)
  ret.slope = Array.from(slope)
  ret.flux = Array.from(flux)
  ret.downhill = Array.from(downhill)
  // ret.VorCentroids = mesh.VorCentroids

  let dataStr = JSON.stringify({Mesh: ret});
  if (file) {
    exportToJsonFile(ret)
  }
  else {
    store.dispatch('sendMessage', dataStr)
  }
}

function exportToJsonFile(jsonData) {
  let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

  let exportFileDefaultName = 'data.json';

  let linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}
