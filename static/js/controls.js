document.addEventListener('DOMContentLoaded', () => {
    // Range slider value display updates
    setupRangeSliders();
    
    // Button event handlers
    document.getElementById('startButton').addEventListener('click', () => {
        window.simulation.startSimulation();
    });
    
    document.getElementById('stopButton').addEventListener('click', () => {
        window.simulation.stopSimulation();
    });
    
    document.getElementById('resetButton').addEventListener('click', () => {
        window.simulation.resetSimulation();
    });
    
    document.getElementById('playPauseButton').addEventListener('click', () => {
        window.simulation.togglePlayPause();
    });
    
    // Update simulation speed when the speed slider changes
    document.getElementById('simSpeed').addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        window.simulation.setPlaybackSpeed(speed);
    });
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

// Set up display value updates for range sliders
function setupRangeSliders() {
    // Number of Bodies slider
    const numBodiesSlider = document.getElementById('numBodies');
    const numBodiesValue = document.getElementById('numBodiesValue');
    
    numBodiesSlider.addEventListener('input', () => {
        numBodiesValue.textContent = numBodiesSlider.value;
    });
    
    // Simulation Speed slider
    const simSpeedSlider = document.getElementById('simSpeed');
    const simSpeedValue = document.getElementById('simSpeedValue');
    
    simSpeedSlider.addEventListener('input', () => {
        simSpeedValue.textContent = `${simSpeedSlider.value}x`;
    });
    
    // Boundary Size slider
    const boundarySlider = document.getElementById('boundary');
    const boundaryValue = document.getElementById('boundaryValue');
    
    boundarySlider.addEventListener('input', () => {
        boundaryValue.textContent = boundarySlider.value;
    });
    
    // Time Steps slider
    const timeStepsSlider = document.getElementById('timeSteps');
    const timeStepsValue = document.getElementById('timeStepsValue');
    
    timeStepsSlider.addEventListener('input', () => {
        timeStepsValue.textContent = timeStepsSlider.value;
    });
    
    // dt Value slider
    const dtSlider = document.getElementById('dtValue');
    const dtValue = document.getElementById('dtValueDisplay');
    
    dtSlider.addEventListener('input', () => {
        dtValue.textContent = parseFloat(dtSlider.value).toFixed(3);
    });
}

// Set initial values for all sliders
function initializeSliderValues() {
    document.getElementById('numBodiesValue').textContent = document.getElementById('numBodies').value;
    document.getElementById('simSpeedValue').textContent = `${document.getElementById('simSpeed').value}x`;
    document.getElementById('boundaryValue').textContent = document.getElementById('boundary').value;
    document.getElementById('timeStepsValue').textContent = document.getElementById('timeSteps').value;
    document.getElementById('dtValueDisplay').textContent = parseFloat(document.getElementById('dtValue').value).toFixed(3);
}

// Call initialization
initializeSliderValues();
