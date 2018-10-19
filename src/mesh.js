import * as d3 from 'd3'
import { Delaunay, Voronoi, } from 'd3-delaunay';
import { drawPoly, randi } from './map-utils'
import { heightToColor } from './render-map'
import { normalize } from './heightmap'

const defaultExtent = [[0, 0], [800, 500]]


function makeMesh(vor, ctx) {
  let mesh = Object.create(vor.__proto__);
  Object.assign(mesh, vor);
  Object.assign(mesh, vor.delaunay)
  const { halfedges, points, triangles } = mesh

  mesh.extent = [+vor.xmax - +vor.xmin, +vor.ymax - +vor.ymin]
  // adjacent tris to each tri
  let adj = []
  for (let i = 0; i < halfedges.length; i++) {
    let e0 = i;
    let t0 = edge2tri(i)
    const p0 = triangles[e0]
    let e1 = halfedges[e0]
    // if (e1 === -1) e1 = mesh.inedges[p0]
    if (e1 === -1) continue
    let t1 = edge2tri(e1)

    adj[t0] = adj[t0] || [];
    if (!adj[t0].includes(t1)) {
      adj[t0].push(t1);
    }
    adj[t1] = adj[t1] || [];
    if (!adj[t1].includes(t0)) {
      adj[t1].push(t0);
    }
    // let left = edge2tri(e0)
    // let right = edge2tri(e1)
    // edges.push([p0, p1, left, right]);

    // tris[p0] = tris[p0] || [];
    // if (!tris[p0].includes(left)) tris[p0].push(left);
    // if (right && !tris[p0].includes(right)) tris[p0].push(right);
    // tris[p1] = tris[p1] || [];
    // if (!tris[p1].includes(left)) tris[p1].push(left);
    // if (right && !tris[p1].includes(right)) tris[p1].push(right);
  }
  mesh.adj = adj
  mesh.ctx = ctx


  mesh.zero = () => {
    let arr = new Array(mesh.adj.length)
    arr.fill(0)
    return arr;
  }

  mesh.point = i => [points[i * 2], points[i * 2 + 1]]
  mesh.triPaths = Array.from(mesh.delaunay.trianglePolygons())
  mesh.hullPoly = mesh.delaunay.hullPolygon()

  let centroids = mesh.triPaths.map(path => {
    let p0 = path[0]
    let p1 = path[1]
    let p2 = path[2]
    let x = p0[0] + p1[0] + p2[0]
    let y = p0[1] + p1[1] + p2[1]
    return [x/3,y/3]
  })


  mesh.centroids = centroids
  let xs = []
  let ys = []
  for (let i = 0; i < centroids.length; i++) {

  }
  centroids.forEach(([x,y]) => {xs.push(x); ys.push(y);})
  xs = xs.slice()
  ys = ys.slice()
  let max = d3.max(xs.slice().concat(ys))
  xs = normalize(xs, 0, max)
  ys = normalize(ys, 0, max)

  mesh.normPts = xs.map((x,i) => [x,ys[i]])
  mesh.normPts = mesh.normPts.map(v => [v[0] * 2.0 - 1.0, v[1] * 2 - 1])



  mesh.map = (f) => {
    let mapped = new Array(mesh.adj.length)
    for (let i = 0; i < mesh.adj.length; i++) {
      let pt = [mesh.centroids[i * 2], mesh.centroids[i * 2 + 1]]
      mapped[i] = f(pt, i, mesh)
    }
    mapped.mesh = mesh;
    return mapped;
  }

  mesh.isEdge = i => adj[i].length < 3
  mesh.isNearEdge = i => {
    let x = mesh.centroids[i * 2];
    let y = mesh.centroids[i * 2 + 1];
    let [w, h] = mesh.extent;
    return x < 0.05 * w || x > 0.95 * w || y < 0.05 * h || y > 0.95 * h;
  }


  mesh.relax = (h) => {
    let newh = mesh.zero()
    for (let i = 0; i < h.length; i++) {
      const nbs = mesh.adj[i];
      if (nbs.length < 3) {
        newh[i] = 0;
        continue;
      }
      newh[i] = d3.mean(nbs.map(j => h[j]))
    }
    return newh;
  }

  mesh.distance = (i, j) => {
    i *= 2
    j *= 2
    const ix = mesh.normPts[i],
      iy = mesh.normPts[i + 1]
    const jx = mesh.normPts[j],
      jy = mesh.normPts[j + 1]
    return Math.sqrt((ix - jx) * (ix - jx) + (iy - jy) * (iy - jy))
  }

  mesh.trislope = (h, i) => {
    var nbs = mesh.adj[i]
    // console.log(i, nbs.length)
    if (nbs.length !== 3) return [0, 0];
    var p0 = mesh.normPts[nbs[0]];
    var p1 = mesh.normPts[nbs[1]];
    var p2 = mesh.normPts[nbs[2]];

    var x1 = p1[0] - p0[0];
    var x2 = p2[0] - p0[0];
    var y1 = p1[1] - p0[1];
    var y2 = p2[1] - p0[1];

    var det = x1 * y2 - x2 * y1;
    var h1 = h[nbs[1]] - h[nbs[0]];
    var h2 = h[nbs[2]] - h[nbs[0]];
    console.log(det, h2, h2)

    return [(y2 * h1 - y1 * h2) / det,
      (-x2 * h1 + x1 * h2) / det];
  }

  mesh.renderMesh = (arr, { a, cfn } = { cfn: heightToColor }) => {
    mesh.ctx.beginPath()
    cfn = cfn || heightToColor
    // mesh.render(ctx)
    mesh.ctx.stroke()
    if (arr) {
      ctx.globalAlpha = a ? a : 1
      for (let i = 0; i < arr.length; i++) {
        drawPoly(mesh.ctx, mesh.triPaths[i], cfn(arr[i]))
      }
      ctx.globalAlpha = 1
    }
  }


  mesh.renderVor = ({ color, alpha, del } = {}) => {
    ctx.stroke()
    ctx.strokeStyle = color ? color : 'rgb(0,0,0)'
    ctx.globalAlpha = alpha ? alpha : 1
    del ? vor.delaunay.render(ctx) : vor.render(ctx)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  console.log(mesh)
  return mesh;

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

export { nextEdge, prevEdge, tri2edge, edge2tri, makeMesh };

// function makeMesh(pts, extent) {
//   extent = extent || defaultExtent;
//   const delaunay = Delaunay.from(pts)
//
//   const vor = delaunay.voronoi(extent)
//   let vxs = []
//   let vxids = {};
//   let adj = [];
//   let edges = [];
//   let tris = [];
//   for (let i = 0; i < vor.halfedges.length; i++) {
//     let e = vor.halfedges[i];
//     if (e === undefined) continue;
//     let e0 = vxids[e[0]];
//     let e1 = vxids[e[1]];
//     if (e0 === undefined) {
//       e0 = vxs.length;
//       vxids[e[0]] = e0;
//       vxs.push(e[0]);
//     }
//     if (e1 === undefined) {
//       e1 = vxs.length;
//       vxids[e[1]] = e1;
//       vxs.push(e[1]);
//     }
//     adj[e0] = adj[e0] || [];
//     adj[e0].push(e1);
//     adj[e1] = adj[e1] || [];
//     adj[e1].push(e0);
//     edges.push([e0, e1, e.left, e.right]);
//     tris[e0] = tris[e0] || [];
//     if (!tris[e0].includes(e.left)) tris[e0].push(e.left);
//     if (e.right && !tris[e0].includes(e.right)) tris[e0].push(e.right);
//     tris[e1] = tris[e1] || [];
//     if (!tris[e1].includes(e.left)) tris[e1].push(e.left);
//     if (e.right && !tris[e1].includes(e.right)) tris[e1].push(e.right);
//   }
//
//   let mesh = {
//     pts: pts,
//     vor: vor,
//     vxs: vxs,
//     adj: adj,
//     tris: tris,
//     edges: edges,
//     extent: extent
//   }
//   mesh.map = function (f) {
//     let mapped = vxs.map(f);
//     mapped.mesh = mesh;
//     return mapped;
//   }
//   return mesh;
// }
