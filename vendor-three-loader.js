// ESM bridge: import Three.js + OrbitControls from node_modules and expose them
// as globals (window.THREE / window.THREE_OrbitControls) so app.js — which is a
// classic non-module script — can use them. Module scripts are deferred by
// default and execute in document order; we tag app.js with `defer` too so
// THREE is guaranteed loaded before any molecular code runs.
import * as THREE from './node_modules/three/build/three.module.min.js';
import { OrbitControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js';
window.THREE = THREE;
window.THREE_OrbitControls = OrbitControls;
