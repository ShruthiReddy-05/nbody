
# N-Body Simulation Web Application

An interactive web-based N-body gravitational simulation using Flask, Python, and JavaScript. This application visualizes the gravitational interactions between multiple bodies in a 2D space.

## Features

- Real-time visualization of gravitational interactions
- Adjustable simulation parameters:
  - Number of bodies (2-10)
  - Time steps (1000-10000)
  - Time step size (dt)
  - Boundary size
  - Playback speed
- Interactive controls for starting, stopping, and resetting the simulation
- Frame-by-frame playback controls
- FPS counter
- Responsive design for different screen sizes

## Technologies Used

- Backend:
  - Flask (Python web framework)
  - NumPy (numerical computations)
  - MPI4py (parallel computing support)
  - Gunicorn (WSGI HTTP Server)

- Frontend:
  - HTML5 Canvas
  - JavaScript
  - Bootstrap (CSS framework)

## Getting Started

1. Click the "Run" button to start the server
2. The application will be available at port 5000
3. Use the control panel to adjust simulation parameters
4. Click "Start Simulation" to begin

## Controls

- **Start Simulation**: Begins a new simulation with current parameters
- **Stop Simulation**: Halts the current simulation
- **Reset**: Resets the visualization to initial state
- **Play/Pause**: Controls animation playback
- **Speed**: Adjusts animation playback speed (0.25x to 3x)

## Simulation Parameters

- **Number of Bodies**: 2-10 bodies in the simulation
- **Time Steps**: 1000-10000 steps in the simulation
- **Time Step Size (dt)**: 0.001-0.05 (affects simulation precision)
- **Boundary Size**: 10-50 units (affects simulation space)

## Development

The project structure follows a standard Flask application layout with:
- `main.py`: Application entry point
- `app.py`: Flask application and API routes
- `nbody_wrapper.py`: Core simulation logic
- `static/`: Frontend assets (JavaScript, CSS)
- `templates/`: HTML templates

## Deployment

The application is configured to run with Gunicorn in production mode. The deployment settings are already configured in the `.replit` file.
