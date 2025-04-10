// Simulation canvas setup
let canvas, ctx;
let simulationData = [];
let currentFrame = 0;
let isPlaying = false;
let playbackSpeed = 1;
let animationFrameId = null;
let lastFrameTime = 0;
let fps = 0;
let boundarySize = 20;
let bodyColors = [];

// Setup canvas when the page loads
document.addEventListener('DOMContentLoaded', () => {
    setupCanvas();
    setupEventListeners();
});

function setupCanvas() {
    canvas = document.getElementById('simulation-canvas');
    ctx = canvas.getContext('2d');
    
    // Make canvas responsive
    function resizeCanvas() {
        const container = document.getElementById('canvas-container');
        canvas.width = container.clientWidth;
        canvas.height = container.clientWidth * 0.9;  // 1:1 aspect ratio with a bit of margin
    }
    
    // Initial size and resize on window changes
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initial drawing
    initCanvas();
}

function initCanvas() {
    if (!ctx) return;
    
    boundarySize = parseInt(document.getElementById('boundary-value').textContent);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw coordinate system like in the reference image
    drawCoordinateSystem();
}

function getBodyColors(numBodies) {
    // Generate colors according to the reference image
    const colorMap = [
        '#1f77b4',  // blue
        '#ff7f0e',  // orange
        '#2ca02c',  // green
        '#d62728',  // red
        '#9467bd',  // purple
        '#8c564b',  // brown
        '#e377c2',  // pink
        '#7f7f7f',  // gray
        '#bcbd22',  // olive
        '#17becf'   // cyan
    ];
    
    return Array.from({ length: numBodies }, (_, i) => colorMap[i % colorMap.length]);
}

function drawCoordinateSystem() {
    const width = canvas.width;
    const height = canvas.height;
    const padding = 30;
    
    // Define coordinate system bounds
    const bounds = boundarySize;
    
    // Calculate scale factors
    const xScale = (width - 2 * padding) / (2 * bounds);
    const yScale = (height - 2 * padding) / (2 * bounds);
    
    // Clear canvas with white background like in reference
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Draw border
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, padding, width - 2 * padding, height - 2 * padding);
    
    // Draw axes ticks and labels (x-axis)
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // X-axis ticks
    for (let x = -bounds; x <= bounds; x += 5) {
        const pixelX = padding + (x + bounds) * xScale;
        
        // Draw tick
        ctx.beginPath();
        ctx.moveTo(pixelX, height - padding);
        ctx.lineTo(pixelX, height - padding + 5);
        ctx.stroke();
        
        // Draw label
        if (x % 10 === 0) {
            ctx.fillText(x.toString(), pixelX, height - padding + 7);
        }
    }
    
    // Y-axis ticks
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    for (let y = -bounds; y <= bounds; y += 5) {
        const pixelY = height - padding - (y + bounds) * yScale;
        
        // Draw tick
        ctx.beginPath();
        ctx.moveTo(padding, pixelY);
        ctx.lineTo(padding - 5, pixelY);
        ctx.stroke();
        
        // Draw label
        if (y % 10 === 0) {
            ctx.fillText(y.toString(), padding - 7, pixelY);
        }
    }
}

function drawFrame(frameData, colors) {
    if (!ctx || !frameData) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = 30;
    
    // Define coordinate system bounds
    const bounds = boundarySize;
    
    // Calculate scale factors
    const xScale = (width - 2 * padding) / (2 * bounds);
    const yScale = (height - 2 * padding) / (2 * bounds);
    
    // Clear canvas and redraw coordinate system
    drawCoordinateSystem();
    
    // Draw bodies at their positions
    frameData.forEach((position, index) => {
        const x = position[0];
        const y = position[1];
        
        // Convert from simulation coordinates to canvas coordinates
        const pixelX = padding + (x + bounds) * xScale;
        const pixelY = height - padding - (y + bounds) * yScale;
        
        // Draw body
        ctx.fillStyle = colors[index];
        ctx.beginPath();
        ctx.arc(pixelX, pixelY, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw trails if we have history
        if (simulationData.length > 1) {
            // Calculate how many frames to include in trail
            const trailLength = Math.min(20, currentFrame);
            
            if (trailLength > 0) {
                // Draw trail
                ctx.strokeStyle = colors[index];
                ctx.lineWidth = 2;
                ctx.beginPath();
                
                // Start from current position
                ctx.moveTo(pixelX, pixelY);
                
                // Draw trail lines backward through frames
                for (let i = 1; i <= trailLength; i++) {
                    const trailFrameIndex = currentFrame - i;
                    if (trailFrameIndex >= 0) {
                        const trailPos = simulationData[trailFrameIndex][index];
                        const trailX = padding + (trailPos[0] + bounds) * xScale;
                        const trailY = height - padding - (trailPos[1] + bounds) * yScale;
                        ctx.lineTo(trailX, trailY);
                    }
                }
                
                ctx.stroke();
            }
        }
    });
    
    // Update frame counter
    document.getElementById('current-frame').textContent = currentFrame + 1;
    document.getElementById('total-frames').textContent = simulationData.length;
}

// Track time for frame advancement
let lastFrameChangeTime = 0;

function animate(timestamp) {
    // Calculate FPS
    if (lastFrameTime) {
        const deltaTime = timestamp - lastFrameTime;
        fps = Math.round(1000 / deltaTime);
        document.getElementById('fps-counter').textContent = fps;
    }
    lastFrameTime = timestamp;
    
    if (isPlaying && simulationData.length > 0) {
        // Draw current frame
        drawFrame(simulationData[currentFrame], bodyColors);
        
        // Increment frame based on playback speed (adjust for smoother animation)
        if (!lastFrameChangeTime) {
            lastFrameChangeTime = timestamp;
        }
        
        // Use a fixed frame rate based on playback speed
        const frameDuration = 1000 / (10 * playbackSpeed); // 10 FPS base rate * speed
        if (timestamp - lastFrameChangeTime > frameDuration) {
            currentFrame = (currentFrame + 1) % simulationData.length;
            lastFrameChangeTime = timestamp;
        }
    }
    
    // Continue animation loop
    animationFrameId = requestAnimationFrame(animate);
}

function updateFPS() {
    document.getElementById('fps-counter').textContent = fps;
    setTimeout(updateFPS, 500);  // Update every half second
}

async function loadSimulationData() {
    try {
        const response = await fetch('/api/all_position_data');
        const data = await response.json();
        
        if (data.status === 'success') {
            simulationData = data.data;
            currentFrame = 0;
            
            // Generate colors for bodies
            bodyColors = getBodyColors(simulationData[0].length);
            
            // Update UI
            document.getElementById('total-frames').textContent = simulationData.length;
            document.getElementById('play-pause-button').disabled = false;
            
            // Start animation and automatically start playing
            isPlaying = true;
            const playButton = document.getElementById('play-pause-button');
            playButton.innerHTML = '<i class="bi bi-pause-fill"></i> Pause';
            
            if (!animationFrameId) {
                animationFrameId = requestAnimationFrame(animate);
            }
            
            // Show first frame immediately
            drawFrame(simulationData[0], bodyColors);
            
            console.log(`Loaded ${simulationData.length} frames of simulation data`);
            return true;
        } else {
            console.error('Failed to load simulation data:', data);
            return false;
        }
    } catch (error) {
        console.error('Error loading simulation data:', error);
        return false;
    }
}

async function checkSimulationStatus() {
    try {
        const response = await fetch('/api/simulation_status');
        const data = await response.json();
        
        if (!data.running) {
            // Simulation is done, load data
            await loadSimulationData();
            
            // Update UI
            document.getElementById('start-button').disabled = false;
            document.getElementById('stop-button').disabled = true;
            
            return true;
        }
        
        // If still running, check again in a moment
        setTimeout(checkSimulationStatus, 1000);
        return false;
    } catch (error) {
        console.error('Error checking simulation status:', error);
        setTimeout(checkSimulationStatus, 2000);  // Retry after error
        return false;
    }
}

async function startSimulation() {
    try {
        // Get parameters from sliders
        const numBodies = parseInt(document.getElementById('num-bodies-slider').value);
        const timeSteps = parseInt(document.getElementById('time-steps-slider').value);
        const dt = parseFloat(document.getElementById('dt-slider').value);
        const boundary = parseInt(document.getElementById('boundary-slider').value);
        
        boundarySize = boundary;
        
        // Update UI
        document.getElementById('start-button').disabled = true;
        document.getElementById('stop-button').disabled = false;
        document.getElementById('play-pause-button').disabled = true;
        
        // Clear previous data
        simulationData = [];
        currentFrame = 0;
        document.getElementById('current-frame').textContent = '0';
        document.getElementById('total-frames').textContent = '0';
        
        // Draw empty canvas with proper bounds
        initCanvas();
        
        // Start simulation
        const response = await fetch('/api/start_simulation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                num_bodies: numBodies,
                time_steps: timeSteps,
                dt: dt,
                boundary: boundary
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            console.log('Simulation started successfully');
            
            // Start checking status
            checkSimulationStatus();
            return true;
        } else {
            console.error('Failed to start simulation:', data);
            document.getElementById('start-button').disabled = false;
            return false;
        }
    } catch (error) {
        console.error('Error starting simulation:', error);
        document.getElementById('start-button').disabled = false;
        return false;
    }
}

async function stopSimulation() {
    try {
        const response = await fetch('/api/stop_simulation', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            console.log('Simulation stopping...');
            
            // Update UI
            document.getElementById('stop-button').disabled = true;
            
            // Check status for completion
            checkSimulationStatus();
            return true;
        } else {
            console.error('Failed to stop simulation:', data);
            return false;
        }
    } catch (error) {
        console.error('Error stopping simulation:', error);
        return false;
    }
}

function resetSimulation() {
    // Clear data
    simulationData = [];
    currentFrame = 0;
    
    // Update UI
    document.getElementById('current-frame').textContent = '0';
    document.getElementById('total-frames').textContent = '0';
    document.getElementById('play-pause-button').disabled = true;
    document.getElementById('start-button').disabled = false;
    document.getElementById('stop-button').disabled = true;
    
    // Redraw empty canvas
    initCanvas();
}

function togglePlayPause() {
    if (simulationData.length === 0) return;
    
    isPlaying = !isPlaying;
    const button = document.getElementById('play-pause-button');
    
    if (isPlaying) {
        button.innerHTML = '<i class="bi bi-pause-fill"></i> Pause';
    } else {
        button.innerHTML = '<i class="bi bi-play-fill"></i> Play';
    }
}

function setupEventListeners() {
    // Buttons
    document.getElementById('start-button').addEventListener('click', startSimulation);
    document.getElementById('stop-button').addEventListener('click', stopSimulation);
    document.getElementById('reset-button').addEventListener('click', resetSimulation);
    document.getElementById('play-pause-button').addEventListener('click', togglePlayPause);
    
    // Sliders
    document.getElementById('num-bodies-slider').addEventListener('input', (e) => {
        document.getElementById('num-bodies-value').textContent = e.target.value;
    });
    
    document.getElementById('time-steps-slider').addEventListener('input', (e) => {
        document.getElementById('time-steps-value').textContent = e.target.value;
    });
    
    document.getElementById('dt-slider').addEventListener('input', (e) => {
        document.getElementById('dt-value').textContent = e.target.value;
    });
    
    document.getElementById('boundary-slider').addEventListener('input', (e) => {
        document.getElementById('boundary-value').textContent = e.target.value;
    });
    
    document.getElementById('playback-speed').addEventListener('input', (e) => {
        playbackSpeed = parseFloat(e.target.value);
        document.getElementById('playback-speed-value').textContent = `${playbackSpeed}x`;
    });
    
    // Start FPS counter
    updateFPS();
    
    // Start animation loop
    animationFrameId = requestAnimationFrame(animate);
}