import * as THREE from 'three';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// --- Module Variables ---
let mainScene = null; // To store the scene reference from main.js
let hotAirBalloon = null;
const simpleBalloons = [];
const airplanes = [];

const animationBounds = { // Define movement boundaries
    minX: -120, maxX: 120,
    minY: 30, maxY: 80, // Altitude range
    minZ: -120, maxZ: 120
};

// --- Load Hot Air Balloon ---
function loadHotAirBalloon() {
    if (!mainScene) return;

    const mtlLoader = new MTLLoader();
    mtlLoader.setPath('models/'); // Assuming models are in 'models/' folder
    mtlLoader.load('1390 Airship.mtl', (materials) => { // *** NEED hot_air_balloon.mtl ***
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath('models/');
        objLoader.load('1390 Airship.obj', (object) => { // *** NEED hot_air_balloon.obj ***
            hotAirBalloon = object;
            hotAirBalloon.scale.set(0.2, 0.2, 0.2); // --- Adjust scale as needed ---
            hotAirBalloon.position.set(0, 50, -80); // Initial position (high up)

            // Enable shadows (optional)
            hotAirBalloon.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                }
            });

            mainScene.add(hotAirBalloon);
            console.log("Hot Air Balloon loaded.");
        }, undefined, (error) => {
            console.error('Error loading hot air balloon OBJ:', error);
        });
    }, undefined, (error) => {
        console.error('Error loading hot air balloon MTL:', error);
        // Optionally load OBJ without MTL or show a placeholder
    });
}

// --- Create Simple Balloons ---
function createSimpleBalloons() {
    if (!mainScene) return;

    const balloonCount = 0;
    const balloonGeometry = new THREE.SphereGeometry(1.5, 16, 12); // Simple sphere

    for (let i = 0; i < balloonCount; i++) {
        const balloonMaterial = new THREE.MeshStandardMaterial({
            color: Math.random() * 0xffffff, // Random color
            roughness: 0.8,
            metalness: 0.1
        });
        const balloon = new THREE.Mesh(balloonGeometry, balloonMaterial);

        // Random initial position within bounds
        balloon.position.set(
            THREE.MathUtils.randFloat(animationBounds.minX, animationBounds.maxX),
            THREE.MathUtils.randFloat(animationBounds.minY, animationBounds.maxY - 10), // Start slightly lower
            THREE.MathUtils.randFloat(animationBounds.minZ, animationBounds.maxZ)
        );

        // Store random drift speed/direction for each balloon
        balloon.userData.drift = new THREE.Vector3(
            THREE.MathUtils.randFloat(-0.5, 0.5), // Sideways drift
            THREE.MathUtils.randFloat(0.8, 1.5),   // Upward drift
            THREE.MathUtils.randFloat(-0.5, 0.5)  // Sideways drift
        );
        // Store random oscillation parameters
        balloon.userData.oscillationSpeed = THREE.MathUtils.randFloat(0.5, 1.5);
        balloon.userData.oscillationAmount = THREE.MathUtils.randFloat(0.5, 1.5);
        balloon.userData.time = Math.random() * Math.PI * 2; // Random start time for oscillation

        balloon.castShadow = true;
        mainScene.add(balloon);
        simpleBalloons.push(balloon);
    }
    console.log(`${balloonCount} simple balloons created.`);
}

// --- Create Simple Airplanes ---
function createAirplanes() {
    if (!mainScene) return;

    const airplaneCount = 5;
    // Simple airplane shape (using boxes)
    const bodyGeometry = new THREE.BoxGeometry(5, 1, 1);
    const wingGeometry = new THREE.BoxGeometry(1, 0.2, 8);
    const tailGeometry = new THREE.BoxGeometry(1, 0.2, 2);
    const airplaneMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5, metalness: 0.5 });

    for (let i = 0; i < airplaneCount; i++) {
        const airplane = new THREE.Group(); // Use a group to hold parts

        const body = new THREE.Mesh(bodyGeometry, airplaneMaterial);
        const wing = new THREE.Mesh(wingGeometry, airplaneMaterial);
        wing.position.y = 0; // Attach wings
        const tail = new THREE.Mesh(tailGeometry, airplaneMaterial);
        tail.position.set(-2.5, 0.4, 0); // Attach tail slightly back and up
        tail.rotation.z = Math.PI / 10; // Angle tail slightly

        airplane.add(body);
        airplane.add(wing);
        airplane.add(tail);

        // Initial position and direction
        const startSide = Math.random() < 0.5 ? -1 : 1; // Start from left or right
        airplane.position.set(
            animationBounds.maxX * startSide * 1.2, // Start off-screen
            THREE.MathUtils.randFloat(animationBounds.minY + 20, animationBounds.maxY), // Altitude
            THREE.MathUtils.randFloat(animationBounds.minZ, animationBounds.maxZ)
        );
        airplane.lookAt(
             -airplane.position.x, // Look towards opposite side
             airplane.position.y,
             airplane.position.z
        );

        // Store speed
        airplane.userData.speed = THREE.MathUtils.randFloat(20, 40); // Speed

        airplane.castShadow = true; // Optional shadow for group parts
        airplane.traverse(child => { if(child.isMesh) child.castShadow = true; });

        mainScene.add(airplane);
        airplanes.push(airplane);
    }
     console.log(`${airplaneCount} simple airplanes created.`);
}

// --- Animation Functions ---
function animateHotAirBalloon(delta, time) {
    if (!hotAirBalloon) return;

    // Gentle circular motion + vertical bobbing
    const radius = 70;
    const speed = 5;
    hotAirBalloon.position.x = Math.cos(time * speed) * radius;
    hotAirBalloon.position.z = Math.sin(time * speed) * radius - 80; // Center Z offset
    hotAirBalloon.position.y = 50 + Math.sin(time * speed * 1.5) * 3; // Bobbing motion

    // Optional: Gentle rotation
    hotAirBalloon.rotation.y += delta * 0.05;
}

function animateBalloons(delta) {
    const driftSpeedFactor = 3;
    simpleBalloons.forEach(balloon => {
        // Apply drift
        balloon.position.x += balloon.userData.drift.x * delta * driftSpeedFactor;
        balloon.position.y += balloon.userData.drift.y * delta * driftSpeedFactor;
        balloon.position.z += balloon.userData.drift.z * delta * driftSpeedFactor;

        // Apply oscillation
        balloon.userData.time += delta * balloon.userData.oscillationSpeed;
        balloon.position.x += Math.sin(balloon.userData.time) * delta * balloon.userData.oscillationAmount;
        balloon.position.z += Math.cos(balloon.userData.time * 0.7) * delta * balloon.userData.oscillationAmount; // Slightly different oscillation on Z

        // Check bounds and reset if needed
        if (balloon.position.y > animationBounds.maxY + 10 || // Gone too high
            Math.abs(balloon.position.x) > animationBounds.maxX * 1.5 || // Gone too far sideways
            Math.abs(balloon.position.z) > animationBounds.maxZ * 1.5)
        {
            // Reset below bottom bound to float up again
            balloon.position.set(
                THREE.MathUtils.randFloat(animationBounds.minX, animationBounds.maxX),
                animationBounds.minY - 15, // Start below visible area
                THREE.MathUtils.randFloat(animationBounds.minZ, animationBounds.maxZ)
            );
            // Keep same drift/oscillation params for consistency
            balloon.userData.time = Math.random() * Math.PI * 2; // Reset oscillation phase
        }
    });
}

function animateAirplanes(delta) {
    airplanes.forEach(airplane => {
        // Move forward based on current direction
        const forward = new THREE.Vector3(0, 0, -1); // Airplane local forward is -Z
        forward.applyQuaternion(airplane.quaternion); // Rotate forward vector by airplane's orientation
        forward.multiplyScalar(airplane.userData.speed * delta);
        airplane.position.add(forward);

        // Check bounds and reset
        const resetX = animationBounds.maxX * 1.3; // Reset position slightly further out
        if (airplane.position.x > resetX && forward.x > 0) { // Moving right, went off right side
            airplane.position.x = -resetX; // Reset to left side
            airplane.position.z = THREE.MathUtils.randFloat(animationBounds.minZ, animationBounds.maxZ); // Randomize Z
        } else if (airplane.position.x < -resetX && forward.x < 0) { // Moving left, went off left side
            airplane.position.x = resetX; // Reset to right side
            airplane.position.z = THREE.MathUtils.randFloat(animationBounds.minZ, animationBounds.maxZ); // Randomize Z
        }
        // Optional: Reset Z or Y if they drift too far (unlikely with straight flight)
    });
}

// --- Exported Functions ---

/**
 * Initializes ambient animations by loading models and creating objects.
 * @param {THREE.Scene} sceneRef - The main scene object from main.js.
 */
export function initAmbientAnimations(sceneRef) {
    if (!sceneRef) {
        console.error("Scene reference is required for initAmbientAnimations!");
        return;
    }
    mainScene = sceneRef; // Store the scene reference

    // Load/Create assets
    loadHotAirBalloon();
    createSimpleBalloons();
    createAirplanes();
}

/**
 * Updates the position and rotation of ambient animation objects.
 * Call this function from the main animation loop in main.js.
 * @param {number} delta - Time elapsed since the last frame.
 * @param {number} time - Total elapsed time (optional, for complex animations).
 */
export function updateAmbientAnimations(delta, time) {
    if (!mainScene) return; // Don't run if not initialized

    animateHotAirBalloon(delta, time);
    animateBalloons(delta);
    animateAirplanes(delta);
}