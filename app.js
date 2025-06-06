// Main application script for 3D Shape Editor

// Global variables
let scene, camera, renderer, controls;
let shapes = [];
let selectedShapes = [];
let groups = [];

// Cache system for geometries and materials
const geometryCache = new Map();
const materialCache = new Map();

// Adicione após as variáveis globais
const MAX_HISTORY = 50; // Limite de ações no histórico
let history = [];
let currentHistoryIndex = -1;

// Variáveis para o sistema de Undo simplificado
let lastState = null;

function getCachedGeometry(type, params) {
    const key = `${type}_${JSON.stringify(params)}`;
    if (!geometryCache.has(key)) {
        let geometry;
        switch (type) {
            case 'cube':
                geometry = new THREE.BoxGeometry(params.width, params.height, params.depth);
                break;
            case 'sphere':
                geometry = new THREE.SphereGeometry(params.radius, params.segments, params.segments);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(params.radiusTop, params.radiusBottom, params.height, params.radialSegments);
                break;
            case 'pyramid':
                geometry = new THREE.ConeGeometry(params.radius, params.height, params.sides);
                break;
            case 'plane':
                geometry = new THREE.PlaneGeometry(params.width, params.height, params.widthSegments, params.heightSegments);
                break;
        }
        if (geometry) {
            geometryCache.set(key, geometry);
        }
        return geometry;
    }
    return geometryCache.get(key).clone();
}

function getCachedMaterial(color) {
    if (!materialCache.has(color)) {
        const material = new THREE.MeshStandardMaterial({ color: color });
        materialCache.set(color, material);
    }
    return materialCache.get(color).clone();
}

// Initialize the application
function init() {
    initScene();
    initControls();
    setupEventListeners();
    initHistory();
    animate();
}

// Initialize the Three.js scene
function initScene() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0a0a');

    // Create camera
    const container = document.getElementById('scene-container');
    camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    // Add axes helper
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

// Initialize orbit controls
function initControls() {
    // Create orbit controls first
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;

    // Create transform controls
    try {
        transformControls = new THREE.TransformControls(camera, renderer.domElement);
        
        // Salvar estado ao começar a manipular objetos
        transformControls.addEventListener('mouseDown', function() {
            saveLastState();
        });
        
        // Controla o início e fim do arrasto
        transformControls.addEventListener('dragging-changed', function (event) {
            controls.enabled = !event.value;
        });
        
        // Quando selecionar um objeto, modificar o transformControls
        transformControls.addEventListener('objectChange', function() {
            // Não precisamos fazer nada aqui, o estado já foi salvo no mouseDown
        });
        
        scene.add(transformControls);
    } catch (error) {
        console.error('Error initializing TransformControls:', error);
    }
}

// Set up event listeners for UI controls
// Em setupEventListeners, adicione:
function setupEventListeners() {
    // Shape type selection
    const shapeTypeSelect = document.getElementById('shapeType');
    shapeTypeSelect.addEventListener('change', updateDimensionsControls);
    
    // Add shape button
    document.getElementById('addShape').addEventListener('click', addShape);
    
    // Create group button
    document.getElementById('createGroup').addEventListener('click', createGroup);
    
    // Clear selection button
    document.getElementById('clearSelection').addEventListener('click', clearSelection);
    
    // Delete selection button
    document.getElementById('deleteSelection').addEventListener('click', deleteSelection);
    
    // Export GLB button
    document.getElementById('exportGLB').addEventListener('click', exportAsGLB);
    
    // Generate Code button
    document.getElementById('generateCode').addEventListener('click', showGeneratedCode);

    // Color change for selected object
    const colorPicker = document.getElementById('shapeColor');
    colorPicker.addEventListener('change', updateSelectedObjectColor);

    // Initialize dimensions controls based on default shape
    updateDimensionsControls();

    // Setup raycaster for object selection
    setupRaycaster();
}

// Update dimension controls based on selected shape type
function updateDimensionsControls() {
    const shapeType = document.getElementById('shapeType').value;
    const dimensionsControls = document.getElementById('dimensionsControls');
    
    // Clear existing controls
    dimensionsControls.innerHTML = '<h3>Dimensões</h3>';
    
    // Add controls based on shape type
    switch (shapeType) {
        case 'cube':
            addDimensionControl(dimensionsControls, 'width', 1);
            addDimensionControl(dimensionsControls, 'height', 1);
            addDimensionControl(dimensionsControls, 'depth', 1);
            break;
        case 'sphere':
            addDimensionControl(dimensionsControls, 'radius', 1);
            addDimensionControl(dimensionsControls, 'segments', 32, 8, 64, 1, true);
            break;
        case 'cylinder':
            addDimensionControl(dimensionsControls, 'radiusTop', 1);
            addDimensionControl(dimensionsControls, 'radiusBottom', 1);
            addDimensionControl(dimensionsControls, 'height', 2);
            addDimensionControl(dimensionsControls, 'radialSegments', 32, 8, 64, 1, true);
            break;
        case 'pyramid':
            addDimensionControl(dimensionsControls, 'baseRadius', 1);
            addDimensionControl(dimensionsControls, 'height', 2);
            addDimensionControl(dimensionsControls, 'baseSides', 4, 3, 32, 1, true);
            break;
        case 'plane':
            addDimensionControl(dimensionsControls, 'width', 1);
            addDimensionControl(dimensionsControls, 'height', 1);
            addDimensionControl(dimensionsControls, 'widthSegments', 1, 1, 32, 1, true);
            addDimensionControl(dimensionsControls, 'heightSegments', 1, 1, 32, 1, true);
            break;
    }
}

// Helper function to add dimension control
function addDimensionControl(container, name, defaultValue, min = 0.1, max = 10, step = 0.1, isInteger = false) {
    const controlGroup = document.createElement('div');
    controlGroup.className = 'control-group';
    
    const label = document.createElement('label');
    label.textContent = name.charAt(0).toUpperCase() + name.slice(1) + ':';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.id = name;
    input.value = defaultValue;
    input.min = min;
    input.max = max;
    input.step = step;
    
    if (isInteger) {
        input.step = 1;
        input.min = Math.floor(min);
    }
    
    controlGroup.appendChild(label);
    controlGroup.appendChild(input);
    container.appendChild(controlGroup);
}

// Add a new shape to the scene
function addShape() {
    const shapeType = document.getElementById('shapeType').value;
    const color = document.getElementById('shapeColor').value;
    
    // Get position and rotation values
    const position = {
        x: parseFloat(document.getElementById('posX').value),
        y: parseFloat(document.getElementById('posY').value),
        z: parseFloat(document.getElementById('posZ').value)
    };
    
    const rotation = {
        x: THREE.MathUtils.degToRad(parseFloat(document.getElementById('rotX').value)),
        y: THREE.MathUtils.degToRad(parseFloat(document.getElementById('rotY').value)),
        z: THREE.MathUtils.degToRad(parseFloat(document.getElementById('rotZ').value))
    };
    
    // Create geometry based on shape type
    let geometry;
    let material = new THREE.MeshStandardMaterial({ color: color });
    
    switch (shapeType) {
        case 'cube':
            const width = parseFloat(document.getElementById('width').value);
            const height = parseFloat(document.getElementById('height').value);
            const depth = parseFloat(document.getElementById('depth').value);
            geometry = new THREE.BoxGeometry(width, height, depth);
            break;
        case 'sphere':
            const radius = parseFloat(document.getElementById('radius').value);
            const segments = parseInt(document.getElementById('segments').value);
            // Usando o mesmo valor para widthSegments e heightSegments
            geometry = new THREE.SphereGeometry(
                radius,          // radius
                segments,        // widthSegments
                segments,        // heightSegments
                0,              // phiStart
                Math.PI * 2,    // phiLength
                0,              // thetaStart
                Math.PI         // thetaLength
            );
            break;
        case 'cylinder':
            const radiusTop = parseFloat(document.getElementById('radiusTop').value);
            const radiusBottom = parseFloat(document.getElementById('radiusBottom').value);
            const cylinderHeight = parseFloat(document.getElementById('height').value);
            const radialSegments = parseInt(document.getElementById('radialSegments').value);
            geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, cylinderHeight, radialSegments);
            break;
        case 'pyramid':
            const baseRadius = parseFloat(document.getElementById('baseRadius').value);
            const pyramidHeight = parseFloat(document.getElementById('height').value);
            const baseSides = parseInt(document.getElementById('baseSides').value);
            geometry = new THREE.ConeGeometry(
                baseRadius,      // radius
                pyramidHeight,   // height
                baseSides,      // radialSegments (number of sides)
                1,              // heightSegments
                false           // openEnded
            );
            break;
        case 'plane':
            const planeWidth = parseFloat(document.getElementById('width').value);
            const planeHeight = parseFloat(document.getElementById('height').value);
            const widthSegments = parseInt(document.getElementById('widthSegments').value);
            const heightSegments = parseInt(document.getElementById('heightSegments').value);
            geometry = new THREE.PlaneGeometry(
                planeWidth,
                planeHeight,
                widthSegments,
                heightSegments
            );
            break;
    }
    
    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    mesh.rotation.set(rotation.x, rotation.y, rotation.z);
    
    // Add to scene and shapes array
    scene.add(mesh);
    shapes.push({
        mesh: mesh,
        type: shapeType,
        color: color
    });
    
    // Make the mesh selectable
    mesh.userData.selectable = true;
    mesh.userData.shapeIndex = shapes.length - 1;

    // Adicionar ao final da função
    saveState();
}

// Setup raycaster for object selection
function setupRaycaster() {
    const raycaster = new THREE.Raycaster();
    raycaster.firstHitOnly = true;
    const mouse = new THREE.Vector2();
    
    // Create BVH for all objects
    function updateBVH() {
        shapes.forEach(shape => {
            if (!shape.mesh.geometry.boundsTree) {
                shape.mesh.geometry.computeBoundingSphere();
                shape.mesh.geometry.computeBoundingBox();
                shape.mesh.geometry.boundsTree = new MeshBVH(shape.mesh.geometry);
            }
        });
    }
    
    // Update BVH when objects change
    const observer = new MutationObserver(updateBVH);
    observer.observe(document.getElementById('scene-container'), { childList: true });
    
    renderer.domElement.addEventListener('click', (event) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        const intersects = [];
        for (const shape of shapes) {
            if (shape.mesh.geometry.boundsTree) {
                shape.mesh.raycast(raycaster, intersects);
            } else {
                const regularIntersects = raycaster.intersectObject(shape.mesh);
                intersects.push(...regularIntersects);
            }
        }
        
        intersects.sort((a, b) => a.distance - b.distance);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object.parent instanceof THREE.Group) {
                toggleShapeSelection(object.parent);
            } else if (object.userData.selectable) {
                toggleShapeSelection(object);
            }
        }
    });
}

// Modify toggleShapeSelection function
function toggleShapeSelection(object) {
    // Salvar estado antes de modificar a seleção
    saveLastState();
    
    const index = selectedShapes.indexOf(object);
    
    // If selecting a group, deselect individual objects first
    if (object instanceof THREE.Group) {
        // Deselect any individual objects
        selectedShapes = selectedShapes.filter(shape => !(shape instanceof THREE.Mesh));
    } else {
        // If selecting an individual object, deselect groups first
        selectedShapes = selectedShapes.filter(shape => !(shape instanceof THREE.Group));
    }
    
    if (index === -1) {
        // Add to selection
        selectedShapes.push(object);
        
        if (object instanceof THREE.Group) {
            // Highlight all objects in the group
            object.children.forEach(child => {
                if (child instanceof THREE.Mesh) {
                    highlightShape(child, true);
                }
            });
        } else {
            highlightShape(object, true);
            
            // Update color picker to match selected object's color
            updateColorPickerFromObject(object);
        }
        
        transformControls.attach(object);
        if (!(object instanceof THREE.Group)) {
            updateShapeProperties(object);
        }
    } else {
        // Remove from selection
        selectedShapes.splice(index, 1);
        
        if (object instanceof THREE.Group) {
            // Remove highlight from all objects in the group
            object.children.forEach(child => {
                if (child instanceof THREE.Mesh) {
                    highlightShape(child, false);
                }
            });
        } else {
            highlightShape(object, false);
        }
        
        transformControls.detach();
    }
    
    updateSelectionInfo();
}

// Update selection info in the UI
function updateSelectionInfo() {
    const selectionInfo = document.getElementById('selection-info');
    
    if (selectedShapes.length === 0) {
        selectionInfo.textContent = 'None';
    } else {
        const groupCount = selectedShapes.filter(obj => obj instanceof THREE.Group).length;
        const meshCount = selectedShapes.filter(obj => obj instanceof THREE.Mesh).length;
        
        if (groupCount > 0) {
            selectionInfo.textContent = `Group (${groupCount} group${groupCount > 1 ? 's' : ''})`;
        } else {
            selectionInfo.textContent = `${meshCount} shape${meshCount > 1 ? 's' : ''}`;
        }
    }
}

// Add keyboard controls for transform modes and object duplication
window.addEventListener('keydown', function (event) {
    switch (event.key.toLowerCase()) {
        case 'g':
            saveLastState(); // Salvar antes de mudar para modo translate
            transformControls.setMode('translate');
            break;
        case 'r':
            saveLastState(); // Salvar antes de mudar para modo rotate
            transformControls.setMode('rotate');
            break;
        case 's':
            saveLastState(); // Salvar antes de mudar para modo scale
            transformControls.setMode('scale');
            break;
        case 'd':
            if (event.ctrlKey && selectedShapes.length > 0) {
                event.preventDefault();
                duplicateSelectedObject();
            }
            break;
        case 'z':
            if (event.ctrlKey) {
                event.preventDefault();
                undoLastAction();
            }
            break;
        case 'delete':
        case 'backspace':
            if (selectedShapes.length > 0) {
                event.preventDefault();
                saveLastState(); // Salvar antes de deletar
                deleteSelection();
            }
            break;
    }
});

// Highlight or unhighlight a selected shape
function highlightShape(mesh, highlight) {
    if (highlight) {
        mesh.material.emissive = new THREE.Color(0xffff00);
        mesh.material.emissiveIntensity = 0.5;
    } else {
        mesh.material.emissive = new THREE.Color(0x000000);
        mesh.material.emissiveIntensity = 0;
    }
}

// Update selection info in the UI
function updateSelectionInfo() {
    const selectionInfo = document.getElementById('selection-info');
    
    if (selectedShapes.length === 0) {
        selectionInfo.textContent = 'None';
    } else {
        selectionInfo.textContent = `${selectedShapes.length} shape(s)`;
    }
}

// Clear all selections
function clearSelection() {
    selectedShapes.forEach(mesh => {
        highlightShape(mesh, false);
    });
    
    selectedShapes = [];
    transformControls.detach();  // Add this line
    updateSelectionInfo();
}

// Duplicate selected object
function duplicateSelectedObject() {
    if (selectedShapes.length === 0) return;
    
    // Salvar o estado antes de duplicar
    saveLastState();
    
    const selectedObject = selectedShapes[0];
    let newObject;
    
    if (selectedObject instanceof THREE.Mesh) {
        // Encontrar as informações da forma para o objeto selecionado
        const shapeInfo = shapes.find(s => s.mesh === selectedObject);
        if (!shapeInfo) return;
        
        // Criar uma nova geometria do mesmo tipo
        const geometry = selectedObject.geometry.clone();
        const material = selectedObject.material.clone();
        
        // Criar novo mesh
        newObject = new THREE.Mesh(geometry, material);
        
        // Copiar posição, rotação e escala
        newObject.position.copy(selectedObject.position);
        newObject.rotation.copy(selectedObject.rotation);
        newObject.scale.copy(selectedObject.scale);
        
        // Deslocar ligeiramente para torná-lo visível
        newObject.position.x += 0.5;
        
        // Adicionar à cena e ao array de formas
        scene.add(newObject);
        shapes.push({
            mesh: newObject,
            type: shapeInfo.type,
            color: shapeInfo.color
        });
        
        // Tornar o mesh selecionável
        newObject.userData.selectable = true;
        newObject.userData.shapeIndex = shapes.length - 1;
        
        // Selecionar o novo objeto
        clearSelection();
        toggleShapeSelection(newObject);
    }
    // Nota: A duplicação de grupos poderia ser adicionada aqui no futuro
}

// Update color picker to match selected object's color
function updateColorPickerFromObject(object) {
    if (object instanceof THREE.Mesh && object.material) {
        const colorHex = '#' + object.material.color.getHexString();
        document.getElementById('shapeColor').value = colorHex;
    }
}

// Update selected object color when color picker changes
function updateSelectedObjectColor() {
    if (selectedShapes.length === 0) return;
    
    const newColor = document.getElementById('shapeColor').value;
    
    selectedShapes.forEach(object => {
        if (object instanceof THREE.Mesh) {
            // Update material color
            object.material.color.set(newColor);
            
            // Update color in shapes array
            const shapeInfo = shapes.find(s => s.mesh === object);
            if (shapeInfo) {
                shapeInfo.color = newColor;
            }
        } else if (object instanceof THREE.Group) {
            // Update all meshes in the group
            object.children.forEach(child => {
                if (child instanceof THREE.Mesh) {
                    child.material.color.set(newColor);
                    
                    // Update color in shapes array
                    const shapeInfo = shapes.find(s => s.mesh === child);
                    if (shapeInfo) {
                        shapeInfo.color = newColor;
                    }
                }
            });
        }
    });

    // Adicionar ao final da função
    saveState();
}

// Create a group from selected shapes
function createGroup() {
    if (selectedShapes.length < 2) {
        alert('Please select at least 2 shapes to create a group');
        return;
    }
    
    // Create a new THREE.Group
    const group = new THREE.Group();
    
    // Add selected shapes to the group
    selectedShapes.forEach(mesh => {
        // Remove from scene
        scene.remove(mesh);
        
        // Reset highlight
        highlightShape(mesh, false);
        
        // Add to group
        group.add(mesh);
    });
    
    // Add group to scene
    scene.add(group);
    
    // Add to groups array
    groups.push(group);
    
    // Clear selection
    selectedShapes = [];
    updateSelectionInfo();
    
    alert(`Group created with ${group.children.length} shapes`);

    // Adicionar ao final da função
    saveState();
}

// Export the scene or selected group as GLB
function exportAsGLB() {
    const exportScene = new THREE.Scene();
    
    shapes.forEach(shape => {
        exportScene.add(shape.mesh.clone());
    });
    
    groups.forEach(group => {
        exportScene.add(group.clone());
    });

    const exporter = new THREE.GLTFExporter();
    
    const options = {
        binary: true,
        animations: [],
        onlyVisible: true,
        includeCustomExtensions: true
    };
    
    exporter.parse(exportScene, function(result) {
        if (result instanceof ArrayBuffer) {
            saveArrayBuffer(result, '3d_group.glb');
        } else {
            const output = JSON.stringify(result, null, 2);
            saveString(output, '3d_group.gltf');
        }
    }, options);
}

// Generate Three.js code for recreating objects
function generateThreeJSCode(objects) {
    let code = '';
    let varCounter = {
        geometry: 0,
        material: 0,
        mesh: 0,
        group: 0
    };
    
    // Helper function to generate unique variable names
    function getNextVarName(type) {
        varCounter[type]++;
        return `${type}_${varCounter[type]}`;
    }
    
    // Helper function to format a number with precision
    function formatNumber(num) {
        return parseFloat(num.toFixed(6));
    }
    
    // Helper function to convert color to hex format
    function colorToHex(color) {
        if (typeof color === 'string') {
            // Convert string color to hex
            return color.replace('#', '0x');
        } else if (color && color.isColor) {
            // Convert THREE.Color to hex
            return '0x' + color.getHexString();
        }
        return '0xffffff'; // Default color
    }
    
    // Process a mesh object
    function processMesh(mesh, parentVarName = null) {
        // Find the shape info for this mesh
        const shapeInfo = shapes.find(s => s.mesh.uuid === mesh.uuid);
        const shapeType = shapeInfo ? shapeInfo.type : 'unknown';
        
        // Generate geometry code
        const geometryVar = getNextVarName('geometry');
        const geometry = mesh.geometry;
        const params = geometry.parameters || {};
        
        // Determine geometry type and generate appropriate code
        let geometryCode = '';
        if (shapeType === 'cube' || geometry.type === 'BoxGeometry') {
            geometryCode = `const ${geometryVar} = new THREE.BoxGeometry(
    ${formatNumber(params.width || 1)},
    ${formatNumber(params.height || 1)},
    ${formatNumber(params.depth || 1)}
);
`;
        } else if (shapeType === 'sphere' || geometry.type === 'SphereGeometry') {
            geometryCode = `const ${geometryVar} = new THREE.SphereGeometry(
    ${formatNumber(params.radius || 1)},
    ${params.widthSegments || 32},
    ${params.heightSegments || 32}
);
`;
        } else if (shapeType === 'cylinder' || geometry.type === 'CylinderGeometry') {
            geometryCode = `const ${geometryVar} = new THREE.CylinderGeometry(
    ${formatNumber(params.radiusTop || 1)},
    ${formatNumber(params.radiusBottom || 1)},
    ${formatNumber(params.height || 1)},
    ${params.radialSegments || 32}
);
`;
        } else if (shapeType === 'pyramid' || geometry.type === 'ConeGeometry') {
            geometryCode = `const ${geometryVar} = new THREE.ConeGeometry(
    ${formatNumber(params.radius || 1)},
    ${formatNumber(params.height || 1)},
    ${params.radialSegments || 32},
    ${params.heightSegments || 1},
    ${params.openEnded || false}
);
`;
        } else if (shapeType === 'plane' || geometry.type === 'PlaneGeometry') {
            geometryCode = `const ${geometryVar} = new THREE.PlaneGeometry(
    ${formatNumber(params.width || 1)},
    ${formatNumber(params.height || 1)},
    ${params.widthSegments || 1},
    ${params.heightSegments || 1}
);
`;
        } else {
            // Generic fallback
            geometryCode = `// Unsupported geometry type: ${geometry.type}
const ${geometryVar} = new THREE.BufferGeometry();
`;
        }
        
        // Generate material code
        const materialVar = getNextVarName('material');
        const material = mesh.material;
        let materialCode = '';
        
        if (material) {
            const color = colorToHex(material.color || (shapeInfo ? shapeInfo.color : '#ffffff'));
            materialCode = `const ${materialVar} = new THREE.MeshStandardMaterial({
    color: ${color},
    roughness: ${formatNumber(material.roughness !== undefined ? material.roughness : 0.5)},
    metalness: ${formatNumber(material.metalness !== undefined ? material.metalness : 0.0)}
});
`;
        } else {
            materialCode = `const ${materialVar} = new THREE.MeshStandardMaterial({ color: 0xffffff });
`;
        }
        
        // Generate mesh code
        const meshVar = getNextVarName('mesh');
        let meshCode = `const ${meshVar} = new THREE.Mesh(${geometryVar}, ${materialVar});
`;
        
        // Add position, rotation, and scale
        if (mesh.position) {
            meshCode += `${meshVar}.position.set(${formatNumber(mesh.position.x)}, ${formatNumber(mesh.position.y)}, ${formatNumber(mesh.position.z)});
`;
        }
        
        if (mesh.rotation) {
            meshCode += `${meshVar}.rotation.set(${formatNumber(mesh.rotation.x)}, ${formatNumber(mesh.rotation.y)}, ${formatNumber(mesh.rotation.z)}, 'XYZ');
`;
        }
        
        if (mesh.scale) {
            meshCode += `${meshVar}.scale.set(${formatNumber(mesh.scale.x)}, ${formatNumber(mesh.scale.y)}, ${formatNumber(mesh.scale.z)});
`;
        }
        
        // Add shadow properties
        meshCode += `${meshVar}.castShadow = ${mesh.castShadow || false};
`;
        meshCode += `${meshVar}.receiveShadow = ${mesh.receiveShadow || false};
`;
        
        // Add to parent if provided
        if (parentVarName) {
            meshCode += `${parentVarName}.add(${meshVar});
`;
        }
        
        return {
            code: geometryCode + materialCode + meshCode,
            varName: meshVar
        };
    }
    
    // Process a group object
    function processGroup(group, parentVarName = null) {
        const groupVar = getNextVarName('group');
        let groupCode = `const ${groupVar} = new THREE.Group();
`;
        
        // Add position, rotation, and scale
        if (group.position) {
            groupCode += `${groupVar}.position.set(${formatNumber(group.position.x)}, ${formatNumber(group.position.y)}, ${formatNumber(group.position.z)});
`;
        }
        
        if (group.rotation) {
            groupCode += `${groupVar}.rotation.set(${formatNumber(group.rotation.x)}, ${formatNumber(group.rotation.y)}, ${formatNumber(group.rotation.z)}, 'XYZ');
`;
        }
        
        if (group.scale) {
            groupCode += `${groupVar}.scale.set(${formatNumber(group.scale.x)}, ${formatNumber(group.scale.y)}, ${formatNumber(group.scale.z)});
`;
        }
        
        // Process children
        let childrenCode = '';
        const childVarNames = [];
        
        group.children.forEach(child => {
            let result;
            if (child instanceof THREE.Mesh) {
                result = processMesh(child, groupVar);
            } else if (child instanceof THREE.Group) {
                result = processGroup(child, groupVar);
            }
            
            if (result) {
                childrenCode += result.code;
                childVarNames.push(result.varName);
            }
        });
        
        // Add to parent if provided
        if (parentVarName) {
            groupCode += `${parentVarName}.add(${groupVar});
`;
        }
        
        return {
            code: groupCode + childrenCode,
            varName: groupVar
        };
    }
    
    // Process all objects
    const topLevelVarNames = [];
    
    objects.forEach(obj => {
        let result;
        if (obj instanceof THREE.Mesh) {
            result = processMesh(obj);
        } else if (obj instanceof THREE.Group) {
            result = processGroup(obj);
        }
        
        if (result) {
            code += result.code + '\n';
            topLevelVarNames.push(result.varName);
        }
    });
    
    // Add array of top-level objects
    if (topLevelVarNames.length > 0) {
        code += `\n// Array of all generated objects\nconst generatedObjects = [${topLevelVarNames.join(', ')}];\n`;
    }
    
    return code;
}

// Generate and display Three.js code for the current scene
// Variável global para rastrear o modal de código gerado
// Variável global para rastrear o modal de código gerado
let lastGeneratedCode = null;

function showGeneratedCode() {
    const objectsToExport = getVisibleOrSelectedObjects();

    if (!objectsToExport || objectsToExport.length === 0) {
        alert('No visible or selected objects to generate code.');
        return;
    }

    if (lastGeneratedCode && document.body.contains(lastGeneratedCode)) {
        document.body.removeChild(lastGeneratedCode);
    }

    const code = generateThreeJSCode(objectsToExport);

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-button">&times;</span>
            <h2>Generated Three.js Code</h2>
            <textarea id="generated-code" rows="20" cols="80">${code}</textarea>
            <button id="copy-code" class="primary-button">Copy Code</button>
        </div>
    `;

    document.body.appendChild(modal);
    lastGeneratedCode = modal;

    const closeButton = modal.querySelector('.close-button');
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
        lastGeneratedCode = null;
    });

    const copyButton = modal.querySelector('#copy-code');
    copyButton.addEventListener('click', () => {
        const textarea = modal.querySelector('#generated-code');
        textarea.select();
        document.execCommand('copy');
        alert('Code copied to clipboard!');
    });

    modal.style.display = 'block';
}

function getVisibleOrSelectedObjects() {
    // Se houver objetos selecionados, priorize-os
    if (selectedShapes.length > 0) {
        return selectedShapes;
    }
    
    // Caso contrário, retorne todos os objetos visíveis
    const visibleObjects = [];
    const processedIds = new Set(); // Para evitar duplicação
    
    // Adicionar shapes visíveis que não fazem parte de grupos
    shapes.forEach(shape => {
        if (shape.mesh.visible && !shape.mesh.parent?.isGroup) {
            visibleObjects.push(shape.mesh);
            processedIds.add(shape.mesh.uuid);
        }
    });
    
    // Adicionar grupos visíveis
    groups.forEach(group => {
        if (group.visible && !processedIds.has(group.uuid)) {
            visibleObjects.push(group);
            processedIds.add(group.uuid);
            
            // Marcar todos os objetos do grupo como processados
            group.traverse(child => {
                if (child.uuid) {
                    processedIds.add(child.uuid);
                }
            });
        }
    });
    
    return visibleObjects;
}

// Save array buffer to file
function saveArrayBuffer(buffer, filename) {
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    
    link.href = objectUrl;
    link.download = filename;
    link.click();
    
    // Revoke the URL after the download starts
    setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
    }, 100);
}

// Save string to file
function saveString(text, filename) {
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    
    link.href = objectUrl;
    link.download = filename;
    link.click();
    
    // Revoke the URL after the download starts
    setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
    }, 100);
}

// Handle window resize
function onWindowResize() {
    const container = document.getElementById('scene-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);

    
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Start the application when the page loads
window.addEventListener('load', init);


// Adicione a função deleteSelection após clearSelection:
function deleteSelection() {
    if (selectedShapes.length === 0) {
        alert('No shape or group selected to delete.');
        return;
    }

    transformControls.detach();

    selectedShapes.forEach(objectToDelete => {
        scene.remove(objectToDelete);

        if (objectToDelete instanceof THREE.Mesh && objectToDelete.userData.shapeIndex !== undefined) {
            const index = shapes.findIndex(shapeInfo => shapeInfo.mesh.uuid === objectToDelete.uuid);
            if (index !== -1) {
                shapes.splice(index, 1);
                shapes.forEach((shape, i) => {
                    shape.mesh.userData.shapeIndex = i;
                });
            }
        }

        if (objectToDelete instanceof THREE.Group) {
            const index = groups.findIndex(group => group.uuid === objectToDelete.uuid);
            if (index !== -1) {
                groups.splice(index, 1);
            }
        }
    });

    selectedShapes = [];
    updateSelectionInfo();
    renderer.render(scene, camera);

    // Adicionar ao final da função
    saveState();
}


function updateShapeProperties(mesh) {
    const shapeType = shapes[mesh.userData.shapeIndex].type;
    
    switch (shapeType) {
        case 'cube':
            document.getElementById('width').value = mesh.geometry.parameters.width;
            document.getElementById('height').value = mesh.geometry.parameters.height;
            document.getElementById('widthSegments').value = mesh.geometry.parameters.widthSegments;
            document.getElementById('heightSegments').value = mesh.geometry.parameters.heightSegments;
            break;
        case 'sphere':
            document.getElementById('width').value = mesh.geometry.parameters.width;
            document.getElementById('height').value = mesh.geometry.parameters.height;
            document.getElementById('widthSegments').value = mesh.geometry.parameters.widthSegments;
            document.getElementById('heightSegments').value = mesh.geometry.parameters.heightSegments;
            break;
        case 'cylinder':
            document.getElementById('width').value = mesh.geometry.parameters.width;
            document.getElementById('height').value = mesh.geometry.parameters.height;
            document.getElementById('widthSegments').value = mesh.geometry.parameters.widthSegments;
            document.getElementById('heightSegments').value = mesh.geometry.parameters.heightSegments;
            break;
        case 'pyramid':
            document.getElementById('width').value = mesh.geometry.parameters.width;
            document.getElementById('height').value = mesh.geometry.parameters.height;
            document.getElementById('widthSegments').value = mesh.geometry.parameters.widthSegments;
            document.getElementById('heightSegments').value = mesh.geometry.parameters.heightSegments;
            break;
        case 'plane':
            document.getElementById('width').value = mesh.geometry.parameters.width;
            document.getElementById('height').value = mesh.geometry.parameters.height;
            document.getElementById('widthSegments').value = mesh.geometry.parameters.widthSegments;
            document.getElementById('heightSegments').value = mesh.geometry.parameters.heightSegments;
            break;
    }
}

// Função para salvar o estado atual da cena
function saveState() {
    // Criar uma cópia profunda do estado atual
    const state = {
        shapes: shapes.map(shape => ({
            type: shape.type,
            color: shape.color,
            mesh: {
                position: shape.mesh.position.clone(),
                rotation: shape.mesh.rotation.clone(),
                scale: shape.mesh.scale.clone(),
                geometry: shape.mesh.geometry.clone(),
                material: shape.mesh.material.clone()
            }
        })),
        groups: groups.map(group => ({
            children: group.children.map(child => ({
                position: child.position.clone(),
                rotation: child.rotation.clone(),
                scale: child.scale.clone(),
                geometry: child.geometry ? child.geometry.clone() : null,
                material: child.material ? child.material.clone() : null
            }))
        }))
    };

    // Remover estados futuros se estivermos no meio do histórico
    if (currentHistoryIndex < history.length - 1) {
        history = history.slice(0, currentHistoryIndex + 1);
    }

    // Adicionar novo estado
    history.push(state);
    currentHistoryIndex = history.length - 1;

    // Limitar o tamanho do histórico
    if (history.length > MAX_HISTORY) {
        history.shift();
        currentHistoryIndex--;
    }
}

// Função para restaurar um estado
function restoreState(state) {
    // Limpar a cena atual
    shapes.forEach(shape => scene.remove(shape.mesh));
    groups.forEach(group => scene.remove(group));
    shapes = [];
    groups = [];

    // Restaurar shapes
    state.shapes.forEach(shapeData => {
        const geometry = shapeData.mesh.geometry;
        const material = shapeData.mesh.material;
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.copy(shapeData.mesh.position);
        mesh.rotation.copy(shapeData.mesh.rotation);
        mesh.scale.copy(shapeData.mesh.scale);
        
        scene.add(mesh);
        shapes.push({
            mesh: mesh,
            type: shapeData.type,
            color: shapeData.color
        });
    });

    // Restaurar grupos
    state.groups.forEach(groupData => {
        const group = new THREE.Group();
        groupData.children.forEach(childData => {
            let child;
            if (childData.geometry && childData.material) {
                child = new THREE.Mesh(childData.geometry, childData.material);
            } else {
                child = new THREE.Object3D();
            }
            child.position.copy(childData.position);
            child.rotation.copy(childData.rotation);
            child.scale.copy(childData.scale);
            group.add(child);
        });
        scene.add(group);
        groups.push(group);
    });

    // Limpar seleção
    selectedShapes = [];
    updateSelectionInfo();
}

// Funções de Undo/Redo
function undo() {
    if (currentHistoryIndex > 0) {
        currentHistoryIndex--;
        restoreState(history[currentHistoryIndex]);
    }
}

function redo() {
    if (currentHistoryIndex < history.length - 1) {
        currentHistoryIndex++;
        restoreState(history[currentHistoryIndex]);
    }
}

// Adicione esta função logo após a inicialização da cena
function initHistory() {
    // Salvar o estado inicial vazio
    saveState();
}

// Função para salvar apenas o último estado
function saveLastState() {
    console.log("Salvando estado"); // Para debug
    
    // Criar uma cópia do estado atual
    const state = {
        shapes: shapes.map(shape => ({
            type: shape.type,
            color: shape.color,
            mesh: {
                uuid: shape.mesh.uuid,
                position: shape.mesh.position.clone(),
                rotation: shape.mesh.rotation.clone(),
                scale: shape.mesh.scale.clone()
            }
        })),
        groups: groups.map(group => ({
            uuid: group.uuid,
            position: group.position.clone(),
            rotation: group.rotation.clone(),
            scale: group.scale.clone(),
            children: group.children.map(child => ({
                uuid: child.uuid,
                position: child.position.clone(),
                rotation: child.rotation.clone(),
                scale: child.scale.clone()
            }))
        }))
    };

    lastState = state;
}

// Função para restaurar o último estado
function undoLastAction() {
    if (!lastState) {
        console.log('Nada para desfazer');
        return;
    }

    console.log("Desfazendo última ação"); // Para debug
    
    // Restaurar shapes
    lastState.shapes.forEach(savedShape => {
        // Encontra o mesh correspondente pelo UUID
        const shape = shapes.find(s => s.mesh.uuid === savedShape.mesh.uuid);
        if (shape) {
            // Restaura posição, rotação e escala
            shape.mesh.position.copy(savedShape.mesh.position);
            shape.mesh.rotation.copy(savedShape.mesh.rotation);
            shape.mesh.scale.copy(savedShape.mesh.scale);
        }
    });

    // Restaurar grupos
    lastState.groups.forEach(savedGroup => {
        // Encontra o grupo correspondente pelo UUID
        const group = groups.find(g => g.uuid === savedGroup.uuid);
        if (group) {
            // Restaura as propriedades do próprio grupo
            group.position.copy(savedGroup.position);
            group.rotation.copy(savedGroup.rotation);
            group.scale.copy(savedGroup.scale);
            
            // Restaura os filhos do grupo
            savedGroup.children.forEach(savedChild => {
                // Encontra o filho correspondente pelo UUID
                const child = group.children.find(c => c.uuid === savedChild.uuid);
                if (child) {
                    // Restaura posição, rotação e escala
                    child.position.copy(savedChild.position);
                    child.rotation.copy(savedChild.rotation);
                    child.scale.copy(savedChild.scale);
                }
            });
        }
    });

    // Resetar o último estado
    lastState = null;
    
    // Atualizar a cena
    renderer.render(scene, camera);
}