import * as d3 from 'd3'
import { drawPoly } from './map-utils'
import { edge2tri } from './mesh'

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

function mergeSegments(segs) {
  let adj = {};
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]; // adj tri vertices
    let a0 = adj[seg[0]] || [];
    let a1 = adj[seg[1]] || [];
    a0.push(seg[1]);
    a1.push(seg[0]);
    adj[seg[0]] = a0;
    adj[seg[1]] = a1;
  }
  let done = [];
  let paths = [];
  let path = null;
  for (let iter = 0; iter < 200000; iter++) {
    if (path === null) {
      for (let i = 0; i < segs.length; i++) {
        if (done[i]) continue;
        done[i] = true;
        path = [segs[i][0], segs[i][1]];
        break;
      }
      if (path === null) break;
    }
    let changed = false;
    for (let i = 0; i < segs.length; i++) {
      if (done[i]) continue;
      if (adj[path[0]].length === 2 && segs[i][0] === path[0]) {
        path.unshift(segs[i][1]);
      } else if (adj[path[0]].length === 2 && segs[i][1] === path[0]) {
        path.unshift(segs[i][0]);
      } else if (adj[path[path.length - 1]].length === 2 && segs[i][0] === path[path.length - 1]) {
        path.push(segs[i][1]);
      } else if (adj[path[path.length - 1]].length === 2 && segs[i][1] === path[path.length - 1]) {
        path.push(segs[i][0]);
      } else {
        continue;
      }
      done[i] = true;
      changed = true;
      break;
    }
    if (!changed) {
      paths.push(path);
      path = null;
    }
  }
  return paths;
}

function contour(mesh, h, level) {
  level = level || 0;
  let edges = [];
  const { halfedges, invTriIDs, triangles, points, triIDs } = mesh
  for (let e1 = 0; e1 < halfedges.length; e1++) {

    let t1 = triangles[e1]
    let id1 = invTriIDs.get(edge2tri(e1))

    if ( id1 === undefined)  continue

    let e2 = halfedges[e1]
    let t2 = triangles[e2]
    let id2 = invTriIDs.get(edge2tri(e2))

    if (e2 !== -1 && id2 === undefined)  continue

    let p1 = [points[t1 * 2], points[t1 * 2 + 1]]
    let p2 = [points[t2 * 2], points[t2 * 2 + 1]]

    let ctx = mesh.ctx

    // if (mesh.isNearEdge(id1) || mesh.isNearEdge(id2)) continue;

    // console.log("elevations: ", h[id1], " ", h[id2])
    if ((h[id1] >= level && h[id2] < level)
      || (h[id2] > level && h[id1] < level)) {
      let p = [id1, id2]
      edges.push(p)
      // console.log("coast edge" )
    }

  }

  console.time("mergesegments Time")
  console.log("edges", edges)

  return edges

  let e =  mergeSegments(edges);
  console.log(e)
  console.timeEnd("mergesegments Time")
  return e
}

function renderCoastLine(mesh, h, level = 0) {
  const ctx = mesh.ctx
  ctx.save();

  ctx.scale(mesh.km2px, mesh.km2px)
  ctx.lineWidth *= mesh.px2km

  console.time("contour")
  let paths = contour(mesh, h, level)
  console.timeEnd("contour")
  console.log(paths)

  console.time("render coastline")
  paths.forEach(path => {

    ctx.beginPath()
    const [x, y] = mesh.point_km(path.pop())
    ctx.moveTo(x, y)

    path.forEach(i => {
      let [x,y] = mesh.point_km(i)
      ctx.lineTo(x, y)
    });

    ctx.stroke()

  })
  console.timeEnd("render coastline")

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


export {
  showNeighbors,
  renderCentroid,
  heightToColor,
  genRenderFns,
  contour,
  mergeSegments,
  renderCoastLine
}
