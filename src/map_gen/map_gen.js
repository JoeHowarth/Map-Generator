import {Delaunay} from 'd3-delaunay';
import poissonDiscSampler from './poissonDiscSampler'
import {
  displayIDs,
  renderCities, renderCitiesGL, renderCoastLine,
  renderRiversGL
} from './render/render-map'
import {} from './heightmap'
import {
  genHM, peaky, erosionRate,
  placeCities,
  downhill, getFlux, getSlope, getRivers,
} from './heightmap'
import {init_babylon, updateColorsFun} from './render/webgl'
import {makeMesh} from "./mesh";
import store from '../store'
import {refinement} from "./kirkpatrick";
import {
  dist_from_last_query,
  pt2triangle,
  pt2triangle_animated,
  pt2triangle_grid_animated,
  pt2triangle_naive,
  pt2triangle_no_grid
} from "./planar-point-by-vec";
import {} from "./heightmap";

const WEBGL = true;

var canvas, ctx,
  sampler,
  vor, mesh,
  Wpx, Hpx,
  Wkm, Hkm;

var h

export function getHeight() {return h.slice()}
export function getMesh() {return mesh}
export function getER() {
  const ER = erosionRate(mesh, h)
  return peaky(ER)
}
export var showCities



export default async function (event) {

  mesh = await setup(100, 100, 0.7)
  // const {points, triangles, halfedges} = mesh

  console.log(mesh)
  h = await genHM(mesh)

  // exportMesh(mesh, getSlope(mesh, h), getFlux(mesh, h), downhill(mesh, h))

  // console.time("refinement")
  // refinement(mesh)
  // console.timeEnd("refinement")

  setTimeout(() => renderMapGL(mesh, h), 0)

  console.log("Dfakasacckvjaxcvkjvk")
  const click_loc = [13, 10]


  setTimeout(() => {
    let box = BABYLON.MeshBuilder.CreatePlane("", {width: 0.9, height: 0.9}, window.scene);
    let box2 = BABYLON.MeshBuilder.CreatePlane("", {width: 1.5, height: 2.5}, window.scene);
    let box3 = BABYLON.MeshBuilder.CreatePlane("", {width: 2.5, height: 1.5}, window.scene);
    box2.position.z = -3
    box3.position.z = -3

    canvas.addEventListener("click", (e) => {
      const scene = window.scene
      const {hit, pickedPoint, pickedMesh} = scene.pick(scene.pointerX, scene.pointerY);
      if (hit) {
        var X = pickedPoint.x
        var Y = pickedPoint.y
      }

      console.log('dist from last Q', dist_from_last_query([X,Y]))

      console.time("point loc no_grid")
      let t_1 = pt2triangle_no_grid(mesh, [X, Y])
      console.timeEnd("point loc no_grid")

      console.time("grid ")
      let t = pt2triangle(mesh, [X, Y], box2)
      console.timeEnd("grid ")

      let highlight = h.slice()
      highlight[t] = 1.0
      updateColorsFun(highlight)

      let t_2 = pt2triangle_animated(mesh, [X, Y], box2)
      let t_3 = pt2triangle_grid_animated(mesh, [X, Y], box3)

      console.time("point loc naive")
      let t_ = pt2triangle_naive(mesh, [X, Y])
      console.timeEnd("point loc naive")

      // console.log("triangle", t, t_1, t_)
      box.position = new BABYLON.Vector3(X, Y, -3);
    }, {capture: true})

  }, 2);

  console.log("num_tris", mesh.triIDs.length)

};


export async function renderMapGL(mesh, h) {
  let scene = await init_babylon(mesh, h)

  await renderRiversGL(mesh, h, 0.01, scene)
  renderCoastLine(mesh, h, 0, true, BABYLON.Color3.Black())

  showCities = () => {
    const cities = placeCities(mesh, h, 20)
    renderCitiesGL(mesh, cities, 10)
  }

  // setTimeout(showCities, 10)
  // setTimeout(() => displayIDs(mesh), 0);


  renderCoastLine(mesh, h, 0.20, true)
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
  if (Wpx > window.outerWidth * 0.95) {
    Wpx = window.outerWidth * 0.95
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
  const max_points = 10000000;
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

function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect(), // abs. size of element
    scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for X
    scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y

  return {
    x: (evt.clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
    y: (evt.clientY - rect.top) * scaleY     // been adjusted to be relative to element
  }
}
