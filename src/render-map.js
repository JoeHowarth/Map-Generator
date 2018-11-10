import * as d3 from 'd3'
import { drawPoly } from './map-utils'
import { edge2tri } from './mesh'
import { downhill, getFlux, getRivers } from './heightmap'

const land = d3.interpolateRgbBasis([
  '#A4D475', //
  '#ACCA89',
  '#FFF1C0',
  '#FCA666',
  '#c54902', // dark red
])
const land2 = d3.interpolateRgbBasis([
  '#94BC71',
  '#A1C37F',
  '#BFCF9D',
  '#E0DFBB',
  // '#EFC297',
  '#DF9666',
])
const water = d3.interpolateRgb('#0084b8', '#0003b8')

function heightToColor(h) {
  if (h >= 0) {
    return land2(h)
  }
  return water(-h * 2)
}


function renderRivers(mesh, h, limit) {
  const ctx = mesh.ctx
  ctx.save();

  ctx.scale(mesh.km2px, mesh.km2px)
  ctx.lineWidth *= mesh.px2km
  let paths = getRivers(mesh, h, limit);

  paths = paths.map(p => p.map(i => mesh.centroids[i]))
  paths = paths.map(relaxPath)

  paths.forEach(path => {

    ctx.beginPath()

    const [x, y] = path[0]
    ctx.moveTo(x, y)

    for (let i = 0; i < path.length; i++) {
      let [x, y] = path[i]
      ctx.lineTo(x, y)
    }

    ctx.stroke()

  })

}

function relaxPath(path) {
  let newpath = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    let newpt = [0.25 * path[i - 1][0] + 0.5 * path[i][0] + 0.25 * path[i + 1][0],
      0.25 * path[i - 1][1] + 0.5 * path[i][1] + 0.25 * path[i + 1][1]];
    newpath.push(newpt);
  }
  newpath.push(path[path.length - 1]);
  return newpath;
}

function contour(mesh, h, level) {
  level = level || 0;
  let edges = [];
  const { halfedges, invTriIDs, triangles, points, triIDs } = mesh
  let done = [];
  for (let e1 = 0; e1 < halfedges.length; e1++) {

    let e2 = halfedges[e1]
    if (done[e1]) continue
    let t1 = triangles[e1]
    let id1 = invTriIDs.get(edge2tri(e1))

    if (id1 === undefined) continue

    let t2 = triangles[e2]
    let id2 = invTriIDs.get(edge2tri(e2))

    if (e2 !== -1 && id2 === undefined) continue

    if ((h[id1] >= level && h[id2] < level)
      || (h[id2] > level && h[id1] < level)) {
      let p = [t1, t2]
      edges.push(p) // id based, lookup with mesh.point_km
      done[e2] = true
    }

  }

  // console.time('mergesegments Time')
  let e = mergeSegments(edges);
  // console.timeEnd('mergesegments Time')
  return e
}

function renderCoastLine(mesh, h, level = 0) {
  const ctx = mesh.ctx
  ctx.save();

  ctx.scale(mesh.km2px, mesh.km2px)
  ctx.lineWidth *= mesh.px2km
  if (level === 0) {
    ctx.lineWidth *= Math.sqrt(mesh.km2px)
  }

  // console.time('contour')
  let paths = contour(mesh, h, level)
  // console.timeEnd('contour')
  // console.log(paths)

  // console.time('render coastline')
  paths.forEach(path => {

    ctx.beginPath()

    const [x, y] = mesh.point_km(path[0])
    ctx.moveTo(x, y)

    for (let i = 0; i < path.length; i++) {
      let [x, y] = mesh.point_km(path[i])
      ctx.lineTo(x, y)
    }

    ctx.stroke()

  })
  // console.timeEnd('render coastline')

  ctx.restore();
}

function showNeighbors(mesh, i) {
  const ctx = mesh.ctx
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
  const ctx = mesh.ctx
  ctx.fillStyle = '#880000'
  mesh.triIDs.forEach((_, v) => {
    const [x, y] = mesh.centroids[v]
    ctx.beginPath()

    ctx.fillRect(x - 7, y - 7, 14, 14)
    ctx.fill()

  })
  ctx.fillStyle = '#000000'
}

function genRenderFns(mesh) {
  const { ctx } = mesh
  mesh.renderMesh = (arr, { a, cfn } = { cfn: heightToColor }) => {
    if (arr) {
      ctx.save()
      cfn = cfn || heightToColor
      ctx.globalAlpha = a ? a : 1
      ctx.scale(mesh.km2px, mesh.km2px)
      // draw array
      for (let i = 0; i < arr.length; i++) {
        drawPoly(mesh.ctx, mesh.triPaths[i], cfn(arr[i]))
      }


      ctx.restore()
    }
  }

  mesh.renderDel = ({ color, alpha } = {}) => {
    ctx.stroke()
    ctx.strokeStyle = color ? color : 'rgb(0,0,0)'
    ctx.globalAlpha = alpha ? alpha : 1
    const { points_px, halfedges, triangles } = mesh;
    halfedges.forEach((j, i) => {
      if (j < i) return;
      const ti = triangles[i] * 2;
      const tj = triangles[j] * 2;
      ctx.moveTo(points_px[ti], points_px[ti + 1]);
      ctx.lineTo(points_px[tj], points_px[tj + 1]);
    })
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  mesh.renderVor = ({ color, alpha, del } = {}) => {
    ctx.save()
    ctx.stroke()
    ctx.strokeStyle = color ? color : 'rgb(0,0,0)'
    ctx.globalAlpha = alpha ? alpha : 1
    ctx.scale(mesh.km2px, mesh.km2px)
    del ? mesh.delaunay.render(ctx) : mesh.render(ctx)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.restore()
  }
  return mesh
}

function mergeSegments(segs) {
  // console.log("segs: ",segs)
  let adj = []
  for (let i = 0; i < segs.length; i++) {
    let [id0, id1] = segs[i];

    let a0 = adj[id0] || []
    a0.push(id1)

    let a1 = adj[id1] || []
    a1.push(id0)

    adj[id0] = a0;
    adj[id1] = a1;
  }
  // console.log("adj: ", adj)

  let paths = []
  let done = []
  let path = null
  // build paths
  for (let iter = 0; iter < 2000; iter++) {
    if (path === null) {
      // start new path
      for (let i = 0; i < segs.length; i++) {
        if (done[i]) continue; // skip until find not added segment

        done[i] = true
        path = segs[i].slice()
        // console.log("new path", path)
        break;
      }
      if (path === null) {
        // console.log("done",done)
        return paths; // all done, so return
      }
    }
    // have path, extend it
    let changed = false;
    for (let i = 0; i < segs.length; i++) {
      if (done[i]) continue;
      // console.log(i, segs[i])

      let len = path.length
      // if last element in path has 2 adjacent ids
      if (adj[path[path.length - 1]].length === 2) {
        // if first id in curr segment equal to last in path
        if (segs[i][0] === path[path.length - 1]) {
          // add it
          path.push(segs[i][1])
          // console.log("push", segs[i][1], path)
        } else if (segs[i][1] === path[path.length - 1]) {
          path.push(segs[i][0])
          // console.log("push", segs[i][0], path)
        }
      } else if (adj[path[0]].length === 2) {
        // same for front
        if (segs[i][0] === path[0]) {
          path.unshift(segs[i][1])
          // console.log("unshift", segs[i][1], path)
        } else if (segs[i][1] === path[0]) {
          path.unshift(segs[i][0])
          // console.log("unshift", segs[i][0], path)
        }
      }

      if (len != path.length) {
        changed = true;
        done[i] = true;
        break;
      }
      // none added
      // console.log("continue")

    }
    if (!changed) {
      paths.push(path)
      path = null
    }

  }


}

export {
  showNeighbors,
  renderCentroid,
  heightToColor,
  genRenderFns,
  contour,
  mergeSegments,
  renderCoastLine,
  renderRivers,
}
