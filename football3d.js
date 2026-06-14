// World Cup Pixel Ball - 3D Engine (Three.js)

// Global 3D references
let scene, camera, renderer, controls;
let footballGroup;
let innerBallMesh;
let pixelMeshes = [];
let starfield;
let particleSystems = []; // For 100% celebration fireworks
let isCelebrating = false;
let spaceLightingMode = true;

// Lighting references
let ambientLight, dirLight1, dirLight2, pointLight, spotLight;

// Raycasting for pixel selection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredPixel = null;
let selectedPixel = null;

// Initialize 3D Scene
function init3DEngine() {
    const container = document.querySelector('.canvas-wrapper');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040408, 0.015);

    // Create Camera
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 9.5);

    // Create Renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('ball-canvas'), antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // Add Orbit Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5.0;
    controls.maxDistance = 15.0;
    controls.enablePan = false;

    // Create Football Master Group
    footballGroup = new THREE.Group();
    scene.add(footballGroup);

    // Add Lights
    setupLighting();

    // Add Starfield Background
    createStarfield();

    // Add Procedural Soccer Ball (Inner Core)
    createInnerFootball();

    // Add 2000 Interactive Pixel Meshes
    createPixelGrid();

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    
    const canvas = renderer.domElement;
    
    // Drag detection state
    let isDragging = false;
    let dragStartPos = new THREE.Vector2();

    canvas.addEventListener('mousedown', (e) => {
        isDragging = false;
        dragStartPos.set(e.clientX, e.clientY);
    });

    canvas.addEventListener('mousemove', (e) => {
        onMouseMove(e);
        if (e.buttons === 1) {
            const dist = Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y);
            if (dist > 6) {
                isDragging = true;
            }
        }
    });

    canvas.addEventListener('click', (e) => {
        if (isDragging) {
            isDragging = false;
            return;
        }
        onCanvasClick(e);
    });

    canvas.addEventListener('mouseleave', () => {
        if (window.hideTooltipUI) window.hideTooltipUI();
        if (hoveredPixel && hoveredPixel !== selectedPixel) {
            resetPixelVisuals(hoveredPixel);
            hoveredPixel = null;
        }
    });

    // Touch support (Unique mobile / Farcaster Touch refinement)
    let touchStartPos = new THREE.Vector2();
    let touchIsDragging = false;

    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            touchIsDragging = false;
            touchStartPos.set(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            const dist = Math.hypot(e.touches[0].clientX - touchStartPos.x, e.touches[0].clientY - touchStartPos.y);
            if (dist > 8) {
                touchIsDragging = true;
            }
        }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
        if (touchIsDragging) {
            touchIsDragging = false;
            return;
        }
        // Unified clean tap selection
        triggerRaycastSelect(touchStartPos.x, touchStartPos.y);
    });

    // Setup HUD Button Controls
    document.getElementById('ctrl-rotate').addEventListener('click', toggleAutoRotate);
    document.getElementById('ctrl-reset').addEventListener('click', resetViewAngle);
    document.getElementById('ctrl-theme').addEventListener('click', toggleLightingTheme);

    // Start Loop
    animate();
}

// Set up detailed lighting
function setupLighting() {
    ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);

    // Main floodlight 1 (Cyan tint)
    dirLight1 = new THREE.DirectionalLight(0x00f5ff, 1.2);
    dirLight1.position.set(10, 8, 5);
    scene.add(dirLight1);

    // Main floodlight 2 (Deep Blue tint)
    dirLight2 = new THREE.DirectionalLight(0x0052ff, 1.0);
    dirLight2.position.set(-10, -5, -5);
    scene.add(dirLight2);

    // Spotlight directly from above for dramatic stadium feel
    spotLight = new THREE.SpotLight(0xffffff, 3.0);
    spotLight.position.set(0, 10, 0);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.8;
    spotLight.castShadow = true;
    scene.add(spotLight);

    // Floating dynamic point light (Gold) to create beautiful luxury specs
    pointLight = new THREE.PointLight(0xffd700, 1.5, 15);
    pointLight.position.set(4, 3, 4);
    scene.add(pointLight);
}

// Procedural starfield for outer space atmosphere
function createStarfield() {
    const starsCount = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starsCount * 3);
    const colors = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i += 3) {
        // Distribute stars far away in a shell
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 30 + Math.random() * 20;

        positions[i] = r * Math.sin(phi) * Math.cos(theta);
        positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i + 2] = r * Math.cos(phi);

        // Twinkling colors (mostly white, some blue, some gold)
        const rand = Math.random();
        if (rand > 0.85) {
            // Cyan/Blue star
            colors[i] = 0.5; colors[i + 1] = 0.8; colors[i + 2] = 1.0;
        } else if (rand > 0.7) {
            // Gold star
            colors[i] = 1.0; colors[i + 1] = 0.9; colors[i + 2] = 0.6;
        } else {
            // White star
            colors[i] = 0.9; colors[i + 1] = 0.9; colors[i + 2] = 1.0;
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });

    starfield = new THREE.Points(geometry, material);
    scene.add(starfield);
}

// Create a high-quality procedural soccer ball inner core
function createInnerFootball() {
    // Generate a 2D canvas texture with a high-tech soccer ball grid
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base background: premium dark leather texture
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw some subtle noise/texture lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for(let i = 0; i < 50; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, 0);
        ctx.lineTo(Math.random() * canvas.width, canvas.height);
        ctx.stroke();
    }

    // Drawing soccer ball panels (Pentagon & Hexagon layout) on equirectangular map
    // We'll draw a repeating grid of panels to simulate the layout on a sphere projection
    const rows = 6;
    const cols = 12;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cx = c * cellW + cellW/2;
            const cy = r * cellH + cellH/2;
            
            // Check if this cell should be a black panel (pentagon) or white panel (hexagon)
            // Classic pattern alternation
            const isPentagon = (r + c) % 2 === 0;
            
            ctx.fillStyle = isPentagon ? '#0f1015' : '#1e212b';
            ctx.strokeStyle = '#2b303e';
            ctx.lineWidth = 4;

            // Draw panel outline
            ctx.beginPath();
            const sides = isPentagon ? 5 : 6;
            const radius = Math.min(cellW, cellH) * 0.4;
            for (let s = 0; s <= sides; s++) {
                const angle = (s * 2 * Math.PI / sides) - Math.PI / 2;
                const px = cx + radius * Math.cos(angle);
                const py = cy + radius * Math.sin(angle);
                if (s === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Add center panel highlights
            ctx.fillStyle = isPentagon ? '#1a1d26' : '#272c3a';
            ctx.beginPath();
            const innerRadius = radius * 0.7;
            for (let s = 0; s <= sides; s++) {
                const angle = (s * 2 * Math.PI / sides) - Math.PI / 2;
                const px = cx + innerRadius * Math.cos(angle);
                const py = cy + innerRadius * Math.sin(angle);
                if (s === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    
    // Create inner sphere mesh
    const innerBallGeo = new THREE.SphereGeometry(2.98, 48, 48);
    const innerBallMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.4,
        metalness: 0.6,
        bumpMap: texture,
        bumpScale: 0.05,
        color: 0xffffff
    });
    
    innerBallMesh = new THREE.Mesh(innerBallGeo, innerBallMat);
    innerBallMesh.castShadow = true;
    innerBallMesh.receiveShadow = true;
    footballGroup.add(innerBallMesh);
}

// Generate the 2,000 interactive pixel meshes
function createPixelGrid() {
    const numPixels = 2000;
    const sphereRadius = 3.03; // Placed slightly above the inner core
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    
    // Geometry for a single pixel (thin square tile)
    const pixelGeo = new THREE.BoxGeometry(0.11, 0.11, 0.04);

    for (let i = 0; i < numPixels; i++) {
        // Fibonacci Spiral algorithm to distribute 2000 points uniformly on sphere
        const theta = 2.0 * Math.PI * i / goldenRatio;
        const phi = Math.acos(1.0 - 2.0 * (i + 0.5) / numPixels);
        
        const x = sphereRadius * Math.cos(theta) * Math.sin(phi);
        const y = sphereRadius * Math.sin(theta) * Math.sin(phi);
        const z = sphereRadius * Math.cos(phi);
        
        // Material configuration based on initial state (simulating some already minted)
        // Global pixel data array is stored in app.js. We pull initial state.
        const pixelData = window.getPixelData(i);
        
        let color = new THREE.Color(0x3a3d52); // Default unminted greyish
        let opacity = 0.5;
        let transparent = true;

        if (pixelData.minted) {
            color = new THREE.Color(pixelData.color);
            opacity = 0.95;
            transparent = false;
        }

        const pixelMat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.2,
            metalness: 0.8,
            transparent: transparent,
            opacity: opacity,
            emissive: pixelData.minted ? color : new THREE.Color(0x000000),
            emissiveIntensity: pixelData.minted ? 0.35 : 0
        });

        const pixelMesh = new THREE.Mesh(pixelGeo, pixelMat);
        pixelMesh.position.set(x, y, z);
        
        // Orient the tile to face outwards from the sphere's center
        const target = new THREE.Vector3(x, y, z).multiplyScalar(2.0);
        pixelMesh.lookAt(target);
        
        // Save ID details inside object userData for Raycaster lookup
        pixelMesh.userData = { 
            id: i,
            originalColor: color.clone(),
            originalOpacity: opacity,
            originalEmissive: pixelMat.emissive.clone()
        };

        pixelMeshes.push(pixelMesh);
        footballGroup.add(pixelMesh);
    }
}

// Handle Raycast Hover
function onMouseMove(event) {
    // Get mouse position relative to canvas
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Reset previous hovered pixel
    if (hoveredPixel && hoveredPixel !== selectedPixel) {
        resetPixelVisuals(hoveredPixel);
        hoveredPixel = null;
        document.body.style.cursor = 'grab';
    }

    if (isCelebrating) return; // Disable inspection during full explosion

    // Update dynamic PointLight position based on cursor (Flashlight effect)
    if (pointLight) {
        pointLight.position.x = mouse.x * 6;
        pointLight.position.y = mouse.y * 6;
    }

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(pixelMeshes);

    if (intersects.length > 0) {
        const hitPixel = intersects[0].object;
        const hitId = hitPixel.userData.id;
        document.body.style.cursor = 'pointer';

        // Show floating custom tooltip (Human Touch)
        if (window.showTooltipUI) {
            window.showTooltipUI(hitId, event.clientX, event.clientY);
        }

        if (hitPixel !== selectedPixel) {
            hoveredPixel = hitPixel;
            highlightPixel(hoveredPixel, 'hover');
        }
    } else {
        // Hide floating custom tooltip
        if (window.hideTooltipUI) {
            window.hideTooltipUI();
        }
    }
}

// Handle Click Selection
function onCanvasClick(event) {
    triggerRaycastSelect(event.clientX, event.clientY);
}

// Unified Raycast Selector
function triggerRaycastSelect(clientX, clientY) {
    if (isCelebrating) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(pixelMeshes);

    if (intersects.length > 0) {
        const clickedPixel = intersects[0].object;
        
        // Deselect previous
        if (selectedPixel && selectedPixel !== clickedPixel) {
            resetPixelVisuals(selectedPixel);
        }

        selectedPixel = clickedPixel;
        highlightPixel(selectedPixel, 'select');
        
        // Trigger UI callback in app.js
        window.selectPixelUI(clickedPixel.userData.id);
    } else {
        // Clicking in space deselects
        if (selectedPixel) {
            resetPixelVisuals(selectedPixel);
            selectedPixel = null;
            window.deselectPixelUI();
        }
    }
}

// Highlight a pixel when hovered or selected
function highlightPixel(pixelMesh, mode) {
    const id = pixelMesh.userData.id;
    const pixelData = window.getPixelData(id);
    const mat = pixelMesh.material;
    
    // Choose neon color based on rarity
    let highlightColor = new THREE.Color(0xffffff); // Default normal
    if (pixelData.rarity === 'GOLDEN') highlightColor = new THREE.Color(0xffd700);
    else if (pixelData.rarity === 'CAPTAIN') highlightColor = new THREE.Color(0x00f5ff);
    else if (pixelData.rarity === 'CHAMPION') highlightColor = new THREE.Color(0x10b981);
    else if (pixelData.rarity === 'TROPHY') highlightColor = new THREE.Color(0xef4444);

    mat.color.copy(highlightColor);
    mat.emissive.copy(highlightColor);
    mat.transparent = false;
    mat.opacity = 1.0;

    if (mode === 'hover') {
        mat.emissiveIntensity = 0.8;
        pixelMesh.scale.set(1.3, 1.3, 1.3);
    } else if (mode === 'select') {
        mat.emissiveIntensity = 1.2;
        pixelMesh.scale.set(1.5, 1.5, 1.5);
    }
}

// Reset pixel back to original visual states
function resetPixelVisuals(pixelMesh) {
    const id = pixelMesh.userData.id;
    const pixelData = window.getPixelData(id);
    const mat = pixelMesh.material;
    
    pixelMesh.scale.set(1.0, 1.0, 1.0);
    
    if (pixelData.minted) {
        const mintedColor = new THREE.Color(pixelData.color);
        mat.color.copy(mintedColor);
        mat.emissive.copy(mintedColor);
        mat.opacity = 0.95;
        mat.transparent = false;
        mat.emissiveIntensity = 0.35;
    } else {
        mat.color.setHex(0x3a3d52);
        mat.emissive.setHex(0x000000);
        mat.opacity = 0.5;
        mat.transparent = true;
        mat.emissiveIntensity = 0;
    }
}

// Public API called from app.js when a pixel gets minted
window.updatePixelMinted3D = function(id, hexColor) {
    const mesh = pixelMeshes[id];
    if (!mesh) return;

    const mintedColor = new THREE.Color(hexColor);
    mesh.material.color.copy(mintedColor);
    mesh.material.emissive.copy(mintedColor);
    mesh.material.opacity = 0.95;
    mesh.material.transparent = false;
    mesh.material.emissiveIntensity = 0.35;
    
    // Save original visual properties inside mesh userdata
    mesh.userData.originalColor = mintedColor.clone();
    mesh.userData.originalOpacity = 0.95;
    mesh.userData.originalEmissive = mintedColor.clone();

    // Trigger cool little physical pop effect
    mesh.scale.set(1.8, 1.8, 1.8);
    let scaleTime = 0;
    const popInterval = setInterval(() => {
        scaleTime += 0.1;
        const currentScale = 1.8 - (0.8 * Math.sin(scaleTime * Math.PI));
        if (scaleTime >= 1.0) {
            mesh.scale.set(1.0, 1.0, 1.0);
            clearInterval(popInterval);
        } else {
            mesh.scale.set(currentScale, currentScale, currentScale);
        }
    }, 20);
};

// UI Toggles
let autoRotate = true;
function toggleAutoRotate() {
    autoRotate = !autoRotate;
    const btn = document.getElementById('ctrl-rotate');
    if (autoRotate) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
}

function resetViewAngle() {
    controls.reset();
    footballGroup.rotation.set(0, 0, 0);
}

function toggleLightingTheme() {
    spaceLightingMode = !spaceLightingMode;
    const btn = document.getElementById('ctrl-theme');
    
    if (spaceLightingMode) {
        btn.classList.add('active');
        scene.fog.color.setHex(0x040408);
        renderer.setClearColor(0x000000, 0);
        pointLight.intensity = 1.5;
        dirLight1.intensity = 1.2;
        dirLight2.intensity = 1.0;
        starfield.visible = true;
    } else {
        // Cyber Neon Bright lighting theme
        btn.classList.remove('active');
        scene.fog.color.setHex(0x090915);
        renderer.setClearColor(0x090915, 1);
        pointLight.intensity = 3.0;
        dirLight1.intensity = 2.0;
        dirLight2.intensity = 1.5;
        starfield.visible = false;
    }
}

// Window resizing
function onWindowResize() {
    const container = document.querySelector('.canvas-wrapper');
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// 100% Mint Celebration Fireworks effect
window.trigger100PercentCelebration3D = function() {
    isCelebrating = true;
    autoRotate = false;

    // Deselect if active
    if (selectedPixel) {
        resetPixelVisuals(selectedPixel);
        selectedPixel = null;
    }

    // 1. Zoom camera in and shake
    let shakeCount = 0;
    const originalPos = camera.position.clone();
    const shakeInterval = setInterval(() => {
        camera.position.x = originalPos.x + (Math.random() - 0.5) * 0.15;
        camera.position.y = originalPos.y + (Math.random() - 0.5) * 0.15;
        shakeCount++;
        if (shakeCount > 30) {
            clearInterval(shakeInterval);
            camera.position.copy(originalPos);
        }
    }, 30);

    // 2. Explode pixels outwards into space temporarily, then pull them back!
    pixelMeshes.forEach(mesh => {
        const dir = mesh.position.clone().normalize();
        const dist = 0.5 + Math.random() * 1.5;
        const targetPos = mesh.position.clone().add(dir.multiplyScalar(dist));
        const startPos = mesh.position.clone();

        let t = 0;
        const explodeTimer = setInterval(() => {
            t += 0.05;
            // Outward curve
            if (t <= 1.0) {
                mesh.position.lerpVectors(startPos, targetPos, t);
                mesh.scale.set(1 + t * 0.5, 1 + t * 0.5, 1 + t * 0.5);
            } 
            // Inward pull back
            else if (t <= 2.0) {
                mesh.position.lerpVectors(targetPos, startPos, t - 1.0);
                mesh.scale.set(1.5 - (t - 1.0) * 0.5, 1.5 - (t - 1.0) * 0.5, 1.5 - (t - 1.0) * 0.5);
            } else {
                mesh.position.copy(startPos);
                mesh.scale.set(1.0, 1.0, 1.0);
                clearInterval(explodeTimer);
                isCelebrating = false;
                autoRotate = true;
            }
        }, 15);
    });

    // 3. Launch fireworks!
    for (let i = 0; i < 8; i++) {
        setTimeout(() => {
            createFireworkBurst();
        }, i * 350);
    }
};

function createFireworkBurst() {
    const particleCount = 150;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    // Burst origin is random near the ball
    const ox = (Math.random() - 0.5) * 6;
    const oy = (Math.random() - 0.5) * 6;
    const oz = (Math.random() - 0.5) * 6;

    const color = new THREE.Color();
    // Cyan, gold, emerald, or red bursts
    const rand = Math.random();
    if (rand > 0.75) color.setHex(0x00f5ff);      // Cyan
    else if (rand > 0.5) color.setHex(0xffd700);  // Gold
    else if (rand > 0.25) color.setHex(0x10b981); // Emerald
    else color.setHex(0xef4444);                  // Red

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = ox;
        positions[i * 3 + 1] = oy;
        positions[i * 3 + 2] = oz;

        // Velocity vectors radiating outwards
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = 0.05 + Math.random() * 0.08;

        velocities.push(new THREE.Vector3(
            speed * Math.sin(phi) * Math.cos(theta),
            speed * Math.sin(phi) * Math.sin(theta),
            speed * Math.cos(phi)
        ));
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        size: 0.12,
        color: color,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particleSystems.push({ system: particles, velocities: velocities, age: 0 });
}

// Animation Loop
function animate() {
    requestAnimationFrame(animate);

    // Damping controls update
    controls.update();

    // Rotate ball automatically if active
    if (autoRotate && footballGroup && !isCelebrating) {
        footballGroup.rotation.y += 0.0035;
        footballGroup.rotation.x += 0.001;
    }

    // Floating animation
    if (footballGroup && !isCelebrating) {
        const time = Date.now() * 0.001;
        footballGroup.position.y = Math.sin(time) * 0.15;
    }

    // Rotate starfield slowly for cosmic feeling
    if (starfield) {
        starfield.rotation.y += 0.0003;
    }

    // Update fireworks systems
    for (let i = particleSystems.length - 1; i >= 0; i--) {
        const ps = particleSystems[i];
        const positions = ps.system.geometry.attributes.position.array;
        ps.age += 0.016; // Approx 60fps frame delta

        for (let j = 0; j < ps.velocities.length; j++) {
            positions[j * 3] += ps.velocities[j].x;
            positions[j * 3 + 1] += ps.velocities[j].y;
            positions[j * 3 + 2] += ps.velocities[j].z;
            
            // Add gravity pull downward
            ps.velocities[j].y -= 0.0015;
        }

        ps.system.geometry.attributes.position.needsUpdate = true;
        
        // Fade out
        ps.system.material.opacity = Math.max(0, 1.0 - ps.age / 1.5);

        // Remove old fireworks
        if (ps.age > 1.5) {
            scene.remove(ps.system);
            ps.system.geometry.dispose();
            ps.system.material.dispose();
            particleSystems.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    init3DEngine();
});
