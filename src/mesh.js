import * as d3 from 'd3'
import { drawPoly } from './map-utils'
import { heightToColor } from './render-map'
import { normalize } from './heightmap'

const defaultExtent = [[0, 0], [800, 500]]

const angCutoff = 3.14 * 0.7

function makeMesh(vor, ctx) {

  console.log('in make mesh')
  console.time('makeMesh')
  console.time('goodTris')

  let mesh = Object.create(vor.__proto__);
  Object.assign(mesh, vor);
  Object.assign(mesh, vor.delaunay)
  const { halfedges, points, triangles } = mesh

  /// re-index based off triIDs instead of original
  let goodTris = []
  Array.from(vor.delaunay.trianglePolygons())
    .forEach((pts, i) => {
      const [a, b, c] = pts;

      let a2 = lengthSquared(b, c)
      let b2 = lengthSquared(a, c)
      let c2 = lengthSquared(a, b)

      let al = Math.sqrt(a2)
      let bl = Math.sqrt(b2)
      let cl = Math.sqrt(c2)

      let alpha = Math.acos((b2 + c2 - a2) / (2 * bl * cl))
      let beta = Math.acos((a2 + c2 - b2) / (2 * al * cl))
      let gamma = Math.acos((a2 + b2 - c2) / (2 * al * bl))

      if (alpha < angCutoff && gamma < angCutoff && beta < angCutoff) {
        goodTris.push(i)
      }
    })

  mesh.extent = [+vor.xmax - +vor.xmin, +vor.ymax - +vor.ymin]
  mesh.triIDs = new Uint32Array(goodTris)
  let invTriIds = new Map()
  for (let i = 0; i < mesh.triIDs.length; i++) {
    invTriIds.set(mesh.triIDs[i], i)
  }
  mesh.invTriIds = invTriIds

  console.timeEnd('goodTris')

  console.time('adj')
  // adjacent tris to each tri
  let adj = []
  for (let i = 0; i < halfedges.length; i++) {
    let e0 = i;
    let t0_ = invTriIds.get(edge2tri(i))
    if (t0_ === undefined) continue

    let e1 = halfedges[e0]
    if (e1 === -1) continue

    let t1_ = invTriIds.get(edge2tri(e1))
    if (t1_ === undefined) continue

    adj[t0_] = adj[t0_] || [];
    if (!adj[t0_].includes(t1_)) {
      adj[t0_].push(t1_);
    }
    adj[t1_] = adj[t1_] || [];
    if (!adj[t1_].includes(t0_)) {
      adj[t1_].push(t0_);
    }
  }


  console.timeEnd('adj')
  mesh.adj = adj
  mesh.ctx = ctx


  console.time('everything else in makeMesh')
  mesh.zero = () => {
    let arr = new Array(mesh.triIDs.length)
    arr.fill(0.0)
    return arr;
  }

  mesh.point = i => {
    i = mesh.triIDs[i]
    return [points[i * 2], points[i * 2 + 1]]
  }
  mesh.triPaths = Array.from(mesh.triIDs)
    .map(v => mesh.delaunay.trianglePolygon(v))
  mesh.hullPoly = mesh.delaunay.hullPolygon()

  let centroids = mesh.triPaths.map(centroid)

  mesh.vorCentroids = Array.from(mesh.cellPolygons())
    .map(centroid)

  mesh.centroids = centroids
  {
    let xs = []
    let ys = []

    centroids.forEach(([x, y]) => {
      xs.push(x);
      ys.push(y);
    })
    xs = xs.slice()
    ys = ys.slice()
    let max = d3.max(xs.slice()
      .concat(ys))
    xs = normalize(xs, 0, max)
    ys = normalize(ys, 0, max)

    mesh.normPts = xs.map((x, i) => [x, ys[i]])
    mesh.normPts = mesh.normPts.map(v => [v[0] * 2.0 - 1.0, v[1] * 2 - 1])
  }


  mesh.map = (f) => {
    let mapped = new Array(mesh.adj.length)
    for (let i = 0; i < mapped.length; i++) {
      mapped[i] = f(centroids[i], i, mesh)
    }
    mapped.mesh = mesh;
    return mapped;
  }

  mesh.isEdge = i => !adj[i] || adj[i].length < 3
  mesh.isNearEdge = i => {
    let x = mesh.centroids[i * 2];
    let y = mesh.centroids[i * 2 + 1];
    let [w, h] = mesh.extent;
    return mesh.isEdge(i) || x < 0.05 * w || x > 0.95 * w || y < 0.05 * h || y > 0.95 * h;
  }


  mesh.relax = (h) => {
    let newh = mesh.zero()
    for (let i = 0; i < newh.length; i++) {
      const nbs = mesh.adj[i];
      if (nbs.length < 3 && nbs.length > 0) {
        let di = nbs.slice()
        di.push(i)
        newh[i] = d3.mean(di.map(v => h[v] * 0.99));
        continue;
      } else if (nbs.length < 3) {
        newh[i] = 0;
        continue;
      }
      newh[i] = d3.mean(nbs.map(j => h[j]))
    }
    return newh;
  }

  mesh.distance = (i, j) => {
    const [ix, iy] = mesh.normPts[i]
    const [jx, jy] = mesh.normPts[j]
    return Math.sqrt((ix - jx) * (ix - jx) + (iy - jy) * (iy - jy))
  }

  mesh.trislope = (h, i) => {
    let nbs = mesh.adj[i]
    if (nbs.length !== 3) return [0, 0];
    let p0 = mesh.normPts[nbs[0]];
    let p1 = mesh.normPts[nbs[1]];
    let p2 = mesh.normPts[nbs[2]];

    let x1 = p1[0] - p0[0];
    let x2 = p2[0] - p0[0];
    let y1 = p1[1] - p0[1];
    let y2 = p2[1] - p0[1];

    let det = x1 * y2 - x2 * y1;
    let h1 = h[nbs[1]] - h[nbs[0]];
    let h2 = h[nbs[2]] - h[nbs[0]];

    return [(y2 * h1 - y1 * h2) / det,
      (-x2 * h1 + x1 * h2) / det];
  }

  mesh.renderMesh = (arr, { a, cfn } = { cfn: heightToColor }) => {
    if (arr) {
      mesh.ctx.beginPath()
      cfn = cfn || heightToColor
      mesh.ctx.stroke()
      ctx.globalAlpha = a ? a : 1

      for (let i = 0; i < arr.length; i++) {
        drawPoly(mesh.ctx, mesh.triPaths[i], cfn(arr[i]))
      }
      ctx.globalAlpha = 1
    }
  }

  mesh.renderDel = ({ color, alpha } = {}) => {
    ctx.stroke()
    ctx.strokeStyle = color ? color : 'rgb(0,0,0)'
    ctx.globalAlpha = alpha ? alpha : 1
    const { points, halfedges, triangles } = mesh;
    halfedges.forEach((j, i) => {
      if (j < i) return;
      const ti = triangles[i] * 2;
      const tj = triangles[j] * 2;
      ctx.moveTo(points[ti], points[ti + 1]);
      ctx.lineTo(points[tj], points[tj + 1]);
    })
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  mesh.renderVor = ({ color, alpha, del } = {}) => {
    ctx.stroke()
    ctx.strokeStyle = color ? color : 'rgb(0,0,0)'
    ctx.globalAlpha = alpha ? alpha : 1
    del ? vor.delaunay.render(ctx) : vor.render(ctx)
    ctx.stroke()
    ctx.globalAlpha = 1
  }


  console.timeEnd('everything else in makeMesh')
  console.timeEnd('makeMesh')
  console.log(mesh)
  return mesh;

}

function contour(mesh, h, level) {
  level = level || 0;
  let edges = [];
  const {halfedges, invTriIds, triangles, points, triIds} = mesh
  halfedges.map((e1,i) => {
    if (invTriIds(e1/3) === undefined){
      return
    } else if (invTriIds(halfedges[e1]/3) === undefined) {
      return
    }

    let e2 = halfedges[e1]
    let t1 = triangles[e1/3]
    let t2 = triangles[e2/3]
    let p1 = [points[t1 * 2], points[t1 * 2 + 1]]
    let p2 = [points[t2 * 2], points[t2 * 2 + 1]]

    if (h[invTriIds[t1]])

    if (e[3] === undefined) return;
    if (mesh.isNearEdge(e[0]) || mesh.isNearEdge(h.mesh, e[1])) return;
    if ((h[e[0]] > level && h[e[1]] <= level) ||
      (h[e[1]] > level && h[e[0]] <= level)) {
      edges.push([e[2], e[3]]);
    }
  })
  return mergeSegments(edges);
}

function lengthSquared([ax, ay], [bx, by]) {
  let dx = ax - bx
  let dy = ay - by
  return dx * dx + dy * dy
}

// half edge id to triangle id
function edge2tri(e) {
  return Math.floor(e / 3)
}

// triangle id to array of half edge ids
function tri2edge(t) {
  const e0 = t * 3;
  return [e0, e0 + 1, e0 + 2];
}

function nextEdge(e) {
  return (e % 3 === 2) ? e - 2 : e + 1
}

function prevEdge(e) {
  return (e % 3 === 0) ? e + 2 : e - 1
}

function centroid(pts) {
  let x = 0;
  let y = 0;
  for (let i = 0; i < pts.length; i++) {
    x += pts[i][0];
    y += pts[i][1];
  }
  return [x / pts.length, y / pts.length];
}

export { nextEdge, prevEdge, tri2edge, edge2tri, makeMesh };


