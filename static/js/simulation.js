// Canvas and rendering variables
const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');
let animationFrameId = null;
let simulationData = [];
let currentFrame = 0;
let totalFrames = 0;
let isPlaying = false;
let playbackSpeed = 1.0;

// Set up canvas dimensions
function setupCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth * 0.95;
    canvas.height = container.clientHeight * 0.95;
    
    // Set canvas aspect ratio to match the typical simulation
    if (canvas.width > canvas.height * 1.5) {
        canvas.width = canvas.height * 1.5;
    } else if (canvas.height > canvas.width / 1.5) {
        canvas.height = canvas.width / 1.5;
    }
}

// Initialize canvas and add resize handling
function initCanvas() {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
}

// Handle colors for bodies
function getBodyColors(numBodies) {
    const colors = [];
    for (let i = 0; i < numBodies; i++) {
        // Generate color from the HSL color space for more distinct colors
        const hue = (i * 360 / numBodies) % 360;
        colors.push(`hsl(${hue}, 80%, 60%)`);
    }
    return colors;
}

// Draw a single frame of the simulation
function drawFrame(frameData, colors) {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!frameData || frameData.length === 0) return;
    
    // Set up coordinate mapping based on boundary size
    const boundary = parseFloat(document.getElementById('boundary').value);
    const scale = Math.min(canvas.width, canvas.height) / (boundary * 2.2);
    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2;
    
    // Calculate center of mass
    let comX = 0;
    let comY = 0;
    for (const body of frameData) {
        comX += body[0];
        comY += body[1];
    }
    comX /= frameData.length;
    comY /= frameData.length;
    
    // Draw trails first (if we have enough data)
    const trailLength = 20;
    if (currentFrame >= 1) {
        // Get up to 'trailLength' previous frames
        for (let i = 0; i < frameData.length; i++) {
            ctx.beginPath();
            
            // Start from the most recent point that's available given our current frame
            const startIdx = Math.max(0, currentFrame - trailLength);
            
            // Draw line segments for the trail
            let firstPoint = true;
            for (let frameIdx = startIdx; frameIdx <= currentFrame; frameIdx++) {
                if (frameIdx >= simulationData.length) continue;
                
                const frame = simulationData[frameIdx];
                if (i >= frame.length) continue;
                
                const x = offsetX + frame[i][0] * scale;
                const y = offsetY - frame[i][1] * scale; // Flip Y coordinate
                
                if (firstPoint) {
                    ctx.moveTo(x, y);
                    firstPoint = false;
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            // Style and draw the trail
            ctx.strokeStyle = colors[i];
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    }
    
    // Draw bodies
    for (let i = 0; i < frameData.length; i++) {
        const [x, y] = frameData[i];
        
        // Convert to canvas coordinates
        const canvasX = offsetX + x * scale;
        const canvasY = offsetY - y * scale; // Flip Y coordinate
        
        // Draw the body
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 10, 0, Math.PI * 2);
        ctx.fillStyle = colors[i];
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    // Draw center of mass
    ctx.beginPath();
    ctx.moveTo(offsetX + comX * scale - 8, offsetY - comY * scale - 8);
    ctx.lineTo(offsetX + comX * scale + 8, offsetY - comY * scale + 8);
    ctx.moveTo(offsetX + comX * scale + 8, offsetY - comY * scale - 8);
    ctx.lineTo(offsetX + comX * scale - 8, offsetY - comY * scale + 8);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw boundary
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
        offsetX - boundary * scale,
        offsetY - boundary * scale,
        boundary * 2 * scale,
        boundary * 2 * scale
    );
    
    // Update frame counter
    document.getElementById('frameCounter').textContent = `${currentFrame + 1}/${totalFrames}`;
    
    // Update time slider if not being dragged
    if (!timeSliderDragging) {
        document.getElementById('timeSlider').value = currentFrame;
    }
}

// Animation loop for playback
function animate() {
    if (isPlaying && simulationData.length > 0) {
        // Increment frame based on playback speed
        currentFrame += playbackSpeed;
        
        // Loop back to beginning if we reach the end
        if (currentFrame >= totalFrames) {
            currentFrame = 0;
        }
        
        // Ensure currentFrame is an integer
        currentFrame = Math.floor(currentFrame);
        
        // Draw the current frame
        drawFrame(simulationData[currentFrame], bodyColors);
    }
    
    // Calculate and update FPS
    updateFPS();
    
    // Continue animation loop
    animationFrameId = requestAnimationFrame(animate);
}

// FPS calculation
let frameCount = 0;
let lastTime = performance.now();
let fps = 0;

function updateFPS() {
    frameCount++;
    const now = performance.now();
    const elapsed = now - lastTime;
    
    if (elapsed >= 1000) {
        fps = Math.round((frameCount * 1000) / elapsed);
        document.getElementById('fpsCounter').textContent = `${fps} FPS`;
        
        frameCount = 0;
        lastTime = now;
    }
}

// Flag to track if the time slider is being dragged
let timeSliderDragging = false;

// Load simulation data
async function loadSimulationData() {
    try {
        const response = await fetch('/api/all_position_data');
        const data = await response.json();
        
        if (data.status === 'success') {
            simulationData = data.data;
            totalFrames = simulationData.length;
            
            // Update the time slider max value
            const timeSlider = document.getElementById('timeSlider');
            timeSlider.max = totalFrames - 1;
            timeSlider.disabled = false;
            
            // Enable play/pause button
            document.getElementById('playPauseButton').disabled = false;
            
            // Update body colors
            bodyColors = getBodyColors(simulationData[0].length);
            
            // Draw the first frame
            currentFrame = 0;
            drawFrame(simulationData[currentFrame], bodyColors);
            
            // Start animation if not already running
            if (!animationFrameId) {
                isPlaying = true;
                animate();
                
                // Update play/pause button
                const playPauseButton = document.getElementById('playPauseButton');
                playPauseButton.innerHTML = '<i class="fa fa-pause"></i>';
            }
            
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

// Check simulation status
async function checkSimulationStatus() {
    try {
        const response = await fetch('/api/simulation_status');
        const data = await response.json();
        
        if (data.running) {
            document.getElementById('simulationStatus').textContent = 'Running';
            document.getElementById('simulationStatus').className = 'badge status-running me-2';
            document.getElementById('loadingOverlay').classList.remove('d-none');
            
            // Disable start button, enable stop button
            document.getElementById('startButton').disabled = true;
            document.getElementById('stopButton').disabled = false;
            
            // Check again after a short delay
            setTimeout(checkSimulationStatus, 1000);
        } else {
            document.getElementById('simulationStatus').textContent = 'Ready';
            document.getElementById('simulationStatus').className = 'badge status-ready me-2';
            document.getElementById('loadingOverlay').classList.add('d-none');
            
            // Enable start button, disable stop button
            document.getElementById('startButton').disabled = false;
            document.getElementById('stopButton').disabled = true;
            
            // Try to load simulation data
            loadSimulationData();
        }
    } catch (error) {
        console.error('Error checking simulation status:', error);
        document.getElementById('simulationStatus').textContent = 'Error';
        document.getElementById('simulationStatus').className = 'badge status-error me-2';
        document.getElementById('loadingOverlay').classList.add('d-none');
        
        // Enable start button, disable stop button
        document.getElementById('startButton').disabled = false;
        document.getElementById('stopButton').disabled = true;
    }
}

// Start the simulation with the current parameters
async function startSimulation() {
    // Get parameters from form
    const numBodies = parseInt(document.getElementById('numBodies').value);
    const timeSteps = parseInt(document.getElementById('timeSteps').value);
    const dt = parseFloat(document.getElementById('dtValue').value);
    const boundary = parseFloat(document.getElementById('boundary').value);
    
    // Validate parameters
    if (isNaN(numBodies) || isNaN(timeSteps) || isNaN(dt) || isNaN(boundary)) {
        alert('Invalid parameters. Please check your inputs.');
        return;
    }
    
    try {
        // Send request to start simulation
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
            
            // Start checking simulation status
            checkSimulationStatus();
        } else {
            console.error('Failed to start simulation:', data.message);
            alert(`Failed to start simulation: ${data.message}`);
        }
    } catch (error) {
        console.error('Error starting simulation:', error);
        alert('Error starting simulation. Please try again.');
    }
}

// Stop the simulation
async function stopSimulation() {
    try {
        const response = await fetch('/api/stop_simulation', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            console.log('Simulation stopping...');
            
            // Check status to update UI
            checkSimulationStatus();
        } else {
            console.error('Failed to stop simulation:', data.message);
            alert(`Failed to stop simulation: ${data.message}`);
        }
    } catch (error) {
        console.error('Error stopping simulation:', error);
        alert('Error stopping simulation. Please try again.');
    }
}

// Reset the simulation view
function resetSimulation() {
    // Cancel animation
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    // Reset variables
    simulationData = [];
    currentFrame = 0;
    totalFrames = 0;
    isPlaying = false;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Reset UI
    document.getElementById('simulationStatus').textContent = 'Ready';
    document.getElementById('simulationStatus').className = 'badge status-ready me-2';
    document.getElementById('loadingOverlay').classList.add('d-none');
    document.getElementById('frameCounter').textContent = '0/0';
    document.getElementById('fpsCounter').textContent = '0 FPS';
    
    // Disable playback controls
    document.getElementById('timeSlider').value = 0;
    document.getElementById('timeSlider').max = 100;
    document.getElementById('timeSlider').disabled = true;
    document.getElementById('playPauseButton').disabled = true;
    document.getElementById('playPauseButton').innerHTML = '<i class="fa fa-play"></i>';
    
    // Enable start button, disable stop button
    document.getElementById('startButton').disabled = false;
    document.getElementById('stopButton').disabled = true;
}

// Toggle play/pause
function togglePlayPause() {
    if (!simulationData.length) return;
    
    isPlaying = !isPlaying;
    
    const playPauseButton = document.getElementById('playPauseButton');
    if (isPlaying) {
        playPauseButton.innerHTML = '<i class="fa fa-pause"></i>';
        document.getElementById('simulationStatus').textContent = 'Playing';
        document.getElementById('simulationStatus').className = 'badge status-running me-2';
        
        // Start animation if not already running
        if (!animationFrameId) {
            animate();
        }
    } else {
        playPauseButton.innerHTML = '<i class="fa fa-play"></i>';
        document.getElementById('simulationStatus').textContent = 'Paused';
        document.getElementById('simulationStatus').className = 'badge status-paused me-2';
    }
}

// Initialize on page load
let bodyColors = [];
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    
    // Set up time slider events
    const timeSlider = document.getElementById('timeSlider');
    timeSlider.addEventListener('mousedown', () => {
        timeSliderDragging = true;
    });
    
    timeSlider.addEventListener('mouseup', () => {
        timeSliderDragging = false;
    });
    
    timeSlider.addEventListener('input', () => {
        if (simulationData.length) {
            currentFrame = parseInt(timeSlider.value);
            drawFrame(simulationData[currentFrame], bodyColors);
        }
    });
    
    // Start the animation loop
    animate();
});

// Export functions for controls.js
window.simulation = {
    startSimulation,
    stopSimulation,
    resetSimulation,
    togglePlayPause,
    setPlaybackSpeed: (speed) => {
        playbackSpeed = speed;
    }
};
