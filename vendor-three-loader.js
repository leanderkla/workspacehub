// ESM bridge: import Three.js + OrbitControls from node_modules and expose them
// as globals (window.THREE / window.THREE_OrbitControls) so app.js — which is a
// classic non-module script — can use them. esbuild bundles this into
// vendor/three.bundle.js as a single IIFE; the renderer loads that script
// before app.js so THREE is guaranteed available before any molecular code runs.
//
// Both imports use the bare specifier 'three' (not an explicit file path).
// OrbitControls internally does `import * as THREE from 'three'` and esbuild
// resolves it via the package main. If we import three by file path here,
// the bundler treats it as a different module than what OrbitControls
// resolves — two copies, and Three.js prints "Multiple instances of Three.js
// being imported" at runtime. Bare 'three' makes both resolutions hit the
// same module record so only one copy lands in the bundle.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
window.THREE = THREE;
window.THREE_OrbitControls = OrbitControls;
