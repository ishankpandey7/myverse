import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  groundGeometry,
  createGroundSampler,
} from "../src/world/three/landscape.ts";
import { createNaturalMaterials } from "../src/world/three/natural-materials.ts";
import { LAND, PLACES, walkable } from "../src/world/navigation.ts";
import { toWorld } from "../src/world/three/coordinates.ts";
import { disposeObject } from "../src/world/three/models.ts";
import { batchStaticSurfaces } from "../src/world/three/batching.ts";

test("walking heights match rendered hills and destination landings stay level", () => {
  const geometry = groundGeometry(LAND.map(toWorld));
  const mesh = new T.Mesh(geometry, new T.MeshBasicMaterial());
  const heightAt = createGroundSampler(geometry),
    ray = new T.Raycaster();
  mesh.updateMatrixWorld();
  let highest = 0,
    checked = 0;
  for (let x = 170; x < 1220; x += 47)
    for (let y = 300; y < 720; y += 43) {
      if (!walkable({ x, y })) continue;
      const p = toWorld({ x, y });
      ray.set(new T.Vector3(p.x, 10, p.z), new T.Vector3(0, -1, 0));
      const hit = ray.intersectObject(mesh)[0];
      assert.ok(hit, "walkable land has a rendered surface");
      assert.ok(
        Math.abs(hit.point.y - heightAt(p.x, p.z)) < 1e-5,
        "feet follow the actual triangles",
      );
      highest = Math.max(highest, hit.point.y);
      checked++;
    }
  assert.ok(checked > 100);
  assert.ok(highest > 1, "the landscape has real elevation");
  for (const place of Object.values(PLACES)) {
    const p = toWorld(place.entrance);
    assert.ok(Math.abs(heightAt(p.x, p.z)) < 1e-5, place.name);
  }
  disposeObject(mesh);
});

test("static batching preserves world bounds, material ownership and named/instanced models", () => {
  const root = new T.Group(),
    nested = new T.Group();
  root.position.set(3, 1, -4);
  root.rotation.y = 0.4;
  nested.position.set(2, 0, 1);
  nested.rotation.z = 0.2;
  root.add(nested);
  const material = new T.MeshStandardMaterial(),
    geometry = new T.BoxGeometry();
  const retained = new T.Mesh(geometry, material);
  retained.name = "pitched-roof";
  retained.userData.surface = "stone";
  root.add(retained);
  const instanced = new T.InstancedMesh(geometry, material, 1);
  instanced.userData.surface = "stone";
  root.add(instanced);
  for (let i = 0; i < 3; i++) {
    const mesh = new T.Mesh(geometry, material);
    mesh.userData.surface = "stone";
    mesh.position.set(i, i * 0.5, i * -0.2);
    mesh.scale.set(1, i + 1, 1);
    nested.add(mesh);
  }
  root.updateMatrixWorld(true);
  const before = new T.Box3().setFromObject(root, true);
  let geometryDisposals = 0,
    materialDisposals = 0;
  geometry.addEventListener("dispose", () => geometryDisposals++);
  material.addEventListener("dispose", () => materialDisposals++);
  batchStaticSurfaces(root);
  root.updateMatrixWorld(true);
  const after = new T.Box3().setFromObject(root, true);
  assert.ok(before.min.distanceTo(after.min) < 1e-5);
  assert.ok(before.max.distanceTo(after.max) < 1e-5);
  assert.equal(root.getObjectByName("pitched-roof"), retained);
  assert.equal(root.children.includes(instanced), true);
  assert.equal(nested.children.length, 0);
  assert.equal(
    geometryDisposals,
    0,
    "retained objects still need the original geometry",
  );
  assert.equal(materialDisposals, 0);
  disposeObject(root);
  assert.equal(geometryDisposals, 1);
  assert.equal(materialDisposals, 1);
});

function surface(kind = "rock") {
  const map = new T.Texture(),
    bumpMap = new T.Texture();
  const material = new T.MeshStandardMaterial({ map, bumpMap });
  const mesh = new T.Mesh(new T.BoxGeometry(), material);
  mesh.userData.surface = kind;
  return { mesh, material, map, bumpMap };
}
function trackedTexture() {
  const texture = new T.Texture();
  texture.userData.disposals = 0;
  texture.addEventListener("dispose", () => texture.userData.disposals++);
  return texture;
}

test("photographic maps are shared across replaceable models and released by their world once", async () => {
  const loaded = [],
    pool = createNaturalMaterials(
      () => {},
      async () => {
        const texture = trackedTexture();
        loaded.push(texture);
        return texture;
      },
    );
  const first = surface(),
    fallback = [first.map, first.bumpMap];
  let retired = 0;
  fallback.forEach((t) => t.addEventListener("dispose", () => retired++));
  pool.apply(first.mesh);
  await pool.ready;
  assert.deepEqual(pool.status, { loaded: 4, failed: 0, total: 4 });
  assert.equal(retired, 2);
  assert.equal(first.material.map.colorSpace, T.SRGBColorSpace);
  assert.equal(first.material.normalMap.colorSpace, T.NoColorSpace);
  assert.equal(first.material.bumpMap, null);
  const shared = first.material.map;
  disposeObject(first.mesh);
  assert.ok(loaded.every((t) => t.userData.disposals === 0));
  const next = surface();
  pool.apply(next.mesh);
  assert.equal(
    next.material.map,
    shared,
    "a replaced Workshop reuses loaded textures",
  );
  disposeObject(next.mesh);
  pool.dispose();
  pool.dispose();
  assert.equal(loaded.length, 12);
  assert.ok(loaded.every((t) => t.userData.disposals === 1));
});

test("a failed local texture keeps procedural fallback and releases its partial bundle", async () => {
  const partial = [],
    pool = createNaturalMaterials(
      () => {},
      async (url) => {
        if (url.includes("rock_face_03_nor_gl"))
          throw new Error("missing local file");
        const texture = trackedTexture();
        if (url.includes("rock_face_03")) partial.push(texture);
        return texture;
      },
    );
  const rock = surface();
  pool.apply(rock.mesh);
  await pool.ready;
  assert.deepEqual(pool.status, { loaded: 3, failed: 1, total: 4 });
  assert.equal(rock.material.map, rock.map);
  assert.equal(rock.material.bumpMap, rock.bumpMap);
  assert.ok(partial.every((t) => t.userData.disposals === 1));
  disposeObject(rock.mesh);
  pool.dispose();
});

test("leaving the 3D world while textures load discards late arrivals without callbacks or leaks", async () => {
  const pending = [],
    loaded = [];
  let callbacks = 0;
  const pool = createNaturalMaterials(
    () => callbacks++,
    () => new Promise((resolve) => pending.push(resolve)),
  );
  pool.dispose();
  for (const resolve of pending) {
    const texture = trackedTexture();
    loaded.push(texture);
    resolve(texture);
  }
  await pool.ready;
  assert.equal(callbacks, 0);
  assert.equal(loaded.length, 12);
  assert.ok(loaded.every((t) => t.userData.disposals === 1));
});
