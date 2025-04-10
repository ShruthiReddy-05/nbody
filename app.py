import os
import json
import logging
import subprocess
import threading
import time
from flask import Flask, render_template, request, jsonify
import nbody_wrapper

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev_key_for_debugging")

# Global variables for simulation state
simulation_running = False
simulation_thread = None
latest_positions = []
simulation_lock = threading.Lock()

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/api/start_simulation', methods=['POST'])
def start_simulation():
    """Start the N-body simulation with the given parameters"""
    global simulation_running, simulation_thread, latest_positions
    
    if simulation_running:
        return jsonify({"status": "error", "message": "Simulation already running"}), 400
    
    # Get parameters from the request
    data = request.get_json()
    num_bodies = int(data.get('num_bodies', 4))
    time_steps = int(data.get('time_steps', 10000))
    dt = float(data.get('dt', 0.01))
    boundary = float(data.get('boundary', 20))
    
    # Reset position data
    with simulation_lock:
        latest_positions = []
    
    # Start simulation in a separate thread
    def run_simulation():
        global simulation_running, latest_positions
        try:
            simulation_running = True
            position_history = nbody_wrapper.run_simulation(
                num_bodies, time_steps, dt, boundary
            )
            
            # Store position data for streaming to the client
            with simulation_lock:
                latest_positions = position_history
                
            logger.debug(f"Simulation completed with {len(position_history)} frames")
        except Exception as e:
            logger.error(f"Error in simulation: {str(e)}")
        finally:
            simulation_running = False
    
    simulation_thread = threading.Thread(target=run_simulation)
    simulation_thread.daemon = True
    simulation_thread.start()
    
    return jsonify({"status": "success", "message": "Simulation started"})

@app.route('/api/stop_simulation', methods=['POST'])
def stop_simulation():
    """Stop the running simulation"""
    global simulation_running
    
    if not simulation_running:
        return jsonify({"status": "error", "message": "No simulation running"}), 400
    
    # Set flag to stop the simulation
    simulation_running = False
    
    return jsonify({"status": "success", "message": "Simulation stopping..."})

@app.route('/api/simulation_status', methods=['GET'])
def simulation_status():
    """Check if a simulation is running"""
    return jsonify({
        "running": simulation_running
    })

@app.route('/api/position_data', methods=['GET'])
def get_position_data():
    """Get the latest position data from the simulation"""
    with simulation_lock:
        if not latest_positions:
            return jsonify({"status": "waiting", "data": []})
        
        # Get frame index from request, default to latest
        frame = int(request.args.get('frame', len(latest_positions) - 1))
        if frame >= len(latest_positions):
            frame = len(latest_positions) - 1
        
        # Convert numpy arrays to lists for JSON serialization
        position_data = latest_positions[frame].tolist() if frame >= 0 and latest_positions else []
        
        return jsonify({
            "status": "success", 
            "frame": frame,
            "total_frames": len(latest_positions),
            "data": position_data
        })

@app.route('/api/all_position_data', methods=['GET'])
def get_all_position_data():
    """Get all position data for the complete simulation"""
    with simulation_lock:
        if not latest_positions:
            return jsonify({"status": "waiting", "data": []})
        
        # Convert all numpy arrays to lists for JSON serialization
        all_positions = [frame.tolist() for frame in latest_positions]
        
        return jsonify({
            "status": "success",
            "total_frames": len(latest_positions),
            "data": all_positions
        })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
