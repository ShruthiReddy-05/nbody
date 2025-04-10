// Handle slider and control interactions
document.addEventListener('DOMContentLoaded', () => {
    // Initialize slider values
    setupRangeSliders();
    initializeSliderValues();
});

function setupRangeSliders() {
    // Add custom styling to range sliders for better visual appearance
    const sliders = document.querySelectorAll('.form-range');
    
    sliders.forEach(slider => {
        // Update slider appearance on input
        slider.addEventListener('input', () => {
            // Calculate percentage position
            const value = parseFloat(slider.value);
            const min = parseFloat(slider.min) || 0;
            const max = parseFloat(slider.max) || 100;
            const percentage = ((value - min) / (max - min)) * 100;
            
            // Apply custom styling with CSS variables
            slider.style.setProperty('--percentage', `${percentage}%`);
        });
        
        // Set initial styling
        const value = parseFloat(slider.value);
        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 100;
        const percentage = ((value - min) / (max - min)) * 100;
        slider.style.setProperty('--percentage', `${percentage}%`);
    });
}

function initializeSliderValues() {
    // Set initial values for all sliders
    const numBodiesSlider = document.getElementById('num-bodies-slider');
    const timeStepsSlider = document.getElementById('time-steps-slider');
    const dtSlider = document.getElementById('dt-slider');
    const boundarySlider = document.getElementById('boundary-slider');
    const playbackSpeedSlider = document.getElementById('playback-speed');
    
    // Update displayed values
    document.getElementById('num-bodies-value').textContent = numBodiesSlider.value;
    document.getElementById('time-steps-value').textContent = timeStepsSlider.value;
    document.getElementById('dt-value').textContent = dtSlider.value;
    document.getElementById('boundary-value').textContent = boundarySlider.value;
    document.getElementById('playback-speed-value').textContent = `${playbackSpeedSlider.value}x`;
}