import * as d3 from 'd3'
import { Delaunay, Voronoi } from 'd3-delaunay';
import { drawPoly, randi } from './map-utils'

const defaultExtent = [[0, 0], [800, 500]]



function makeMesh(vor, ctx) {
  let mesh = Object.create(vor.__proto__);
  Object.assign(mesh, vor);
  Object.assign(mesh, vor.delaunay)
  const { halfedges, points, triangles } = mesh

  mesh.extent = [+vor.xmax - +vor.xmin, +vor.ymax - +vor.ymin]
  // adjacent vertices to each vertex
  let adj = []
  // (start v, end v, left tri, right tri, left tri
  // (where v is index into points array)
  let edges = []
  // triangles each point is adjacent to
  let tris = []
  for (let i = 0; i < halfedges.length; i++) {
    let e0 = i;
    let p0 = triangles[i]
    let e1 = halfedges[i]
    if (e1 === -1) e1 = mesh.inedges[p0]
    let p1 = triangles[e1]

    adj[p0] = adj[p0] || [];
    adj[p0].push(p1);
    adj[p1] = adj[p1] || [];
    adj[p1].push(p0);
    let left = edge2tri(e0)
    let right = edge2tri(e1)
    edges.push([p0, p1, left, right]);

    tris[p0] = tris[p0] || [];
    if (!tris[p0].includes(left)) tris[p0].push(left);
    if (right && !tris[p0].includes(right)) tris[p0].push(right);
    tris[p1] = tris[p1] || [];
    if (!tris[p1].includes(left)) tris[p1].push(left);
    if (right && !tris[p1].includes(right)) tris[p1].push(right);
  }
  mesh.edges = edges
  mesh.adj = adj
  mesh.tris = tris
  mesh.ctx = ctx

  mesh.point = i => [points[i*2], points[i*2 + 1]]

  mesh.zero = () => {
    let arr = new Array(mesh.adj.length)
    arr.fill(0)
    return arr;
  }

  mesh.map = (f) => {
    let mapped = new Array(mesh.adj.length)
    for (let i = 0; i < mesh.adj.length; i++) {
      let pt = [mesh.points[i * 2], mesh.points[i * 2 + 1]]
      mapped[i] = f(pt, i, mesh)
    }
    mapped.mesh = mesh;
    return mapped;
  }

  mesh.isEdge = i => adj[i] < 3
  mesh.isNearEdge = i => {
    let x = mesh.points[i*2];
    let y = mesh.points[i*2 + 1];
    let [w,h] = mesh.extent;
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

  mesh.distance = (i,j) => {
    i *= 2
    j *= 2
    const ix = points[i], iy = points[i+1]
    const jx = points[j], jy = points[j+1]
    return Math.sqrt((ix - jx) * (ix - jx) + (iy - jy) * (iy - jy))
  }

  mesh.renderMesh = (arr, {a, cfn} = {cfn: d3.interpolateMagma}) => {
    mesh.ctx.beginPath()
    // mesh.render(ctx)
    mesh.ctx.stroke()
    if (arr) {
      ctx.globalAlpha = a? a : 1
      for (let i = 0; i < arr.length; i++) {
        const poly = mesh.cellPolygon(i)
        drawPoly(mesh.ctx, poly, cfn(arr[i]))
      }
      ctx.globalAlpha = 1
    }
  }



  mesh.renderVor = ({color, alpha, del} = {}) => {
    ctx.stroke()
    ctx.strokeStyle = color? color : 'rgb(0,0,0)'
    ctx.globalAlpha = alpha? alpha : 1
    del? vor.delaunay.render(ctx) : vor.render(ctx)
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
