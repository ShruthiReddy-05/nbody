import os
import sys
import subprocess
import tempfile
import numpy as np
import logging
from mpi4py import MPI
import multiprocessing

# Import the N-body simulation code
from attached_assets.nbody_mpi import initialize_nbody_system, compute_forces, nbody_simulation

logger = logging.getLogger(__name__)

def run_simulation(num_bodies=4, time_steps=10000, dt=0.01, boundary=20.0):
    """
    Wrapper to run the N-body simulation
    
    Args:
        num_bodies: Number of bodies in the simulation
        time_steps: Number of time steps to simulate
        dt: Time step size
        boundary: Boundary size for the simulation
        
    Returns:
        List of position arrays for each time step
    """
    logger.debug(f"Starting simulation with {num_bodies} bodies for {time_steps} steps")
    
    # Use the direct simulation method instead of MPI for reliability
    return run_simulation_direct(num_bodies, time_steps, dt, boundary)

def launch_mpi_simulation(num_bodies, time_steps, dt, boundary):
    """Launch the MPI simulation as a subprocess and return the results"""
    logger.debug("Launching MPI simulation subprocess")
    
    # Create a temporary file to store the simulation results
    with tempfile.NamedTemporaryFile(suffix='.npy', delete=False) as tmp_file:
        output_path = tmp_file.name
    
    # Create a small Python script to run the simulation with MPI
    script_content = f"""
import sys
import numpy as np
from mpi4py import MPI
from attached_assets.nbody_mpi import nbody_simulation

# Run simulation
num_bodies = {num_bodies}
time_steps = {time_steps}
dt = {dt}
boundary = {boundary}
position_history = nbody_simulation(num_bodies, time_steps, dt, boundary)

# Only root process saves results
if MPI.COMM_WORLD.Get_rank() == 0 and position_history is not None:
    np.save("{output_path}", position_history)
"""
    
    # Write the script to a temporary file
    with tempfile.NamedTemporaryFile(suffix='.py', delete=False) as script_file:
        script_file.write(script_content.encode())
        script_path = script_file.name
    
    try:
        # Determine number of processes to use
        num_processes = min(4, multiprocessing.cpu_count())
        
        # Run the MPI command
        cmd = ['mpiexec', '-n', str(num_processes), sys.executable, script_path]
        logger.debug(f"Running command: {' '.join(cmd)}")
        
        process = subprocess.Popen(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE
        )
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            logger.error(f"MPI process failed with code {process.returncode}")
            logger.error(f"STDOUT: {stdout.decode()}")
            logger.error(f"STDERR: {stderr.decode()}")
            raise RuntimeError(f"MPI simulation failed: {stderr.decode()}")
        
        # Load the simulation results
        if os.path.exists(output_path):
            position_history = np.load(output_path)
            logger.debug(f"Loaded position history with shape {position_history.shape}")
            return position_history
        else:
            logger.error("Output file not found after simulation")
            raise FileNotFoundError("Simulation output file not found")
        
    finally:
        # Clean up temporary files
        if os.path.exists(script_path):
            os.unlink(script_path)
        if os.path.exists(output_path):
            os.unlink(output_path)

def run_simulation_direct(num_bodies, time_steps, dt, boundary):
    """
    Run the simulation directly in the current process, exactly matching the nbody_mpi.py implementation
    but without the MPI parallelization
    
    Args:
        num_bodies: Number of bodies (integer)
        time_steps: Number of time steps (integer)
        dt: Time step size (float)
        boundary: Boundary size (float)
    """
    # Initialize with stable orbital system exactly as in the original implementation
    positions, velocities, masses = initialize_nbody_system(num_bodies, boundary)
    
    # Setup save interval to match MPI implementation
    save_interval = max(1, time_steps // 500)  # Store at most 500 frames
    position_history = [positions.copy()]
    
    # Run simulation for specified time steps
    for step in range(time_steps):
        # Calculate forces on bodies (direct implementation of compute_forces but without MPI)
        forces = np.zeros_like(positions)
        for i in range(num_bodies):
            # Create a mask to exclude self-interaction
            mask = np.ones(num_bodies, dtype=bool)
            mask[i] = False
            
            # Calculate displacement vectors (vectorized)
            r_vectors = positions[mask] - positions[i]
            
            # Calculate distances (vectorized)
            r_magnitudes = np.linalg.norm(r_vectors, axis=1)
            r_magnitudes = np.maximum(r_magnitudes, 1e-10)  # Prevent division by zero
            
            # Calculate force contributions (vectorized)
            G = 6.67430e-11
            force_magnitudes = G * masses[mask] / (r_magnitudes**3)
            force_vectors = r_vectors * force_magnitudes[:, np.newaxis]
            
            # Sum all force contributions
            forces[i] = np.sum(force_vectors, axis=0)
        
        # Update velocities by half step - exactly as in nbody_mpi.py
        velocities += forces * dt * 0.5
        
        # Update positions by full step - exactly as in nbody_mpi.py
        positions += velocities * dt
        
        # Update velocities by another half step - exactly as in nbody_mpi.py
        velocities += forces * dt * 0.5
        
        # Save position history at reduced frequency - exactly as in nbody_mpi.py
        if step % save_interval == 0:
            position_history.append(positions.copy())
    
    return np.array(position_history)
