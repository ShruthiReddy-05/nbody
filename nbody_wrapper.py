import os
import sys
import subprocess
import tempfile
import numpy as np
import logging
import multiprocessing

logger = logging.getLogger(__name__)

def initialize_nbody_system(num_bodies, boundary=20):
    """Initialize a stable orbital system with uniform velocities - exact copy from nbody_mpi.py."""
    positions = np.zeros((num_bodies, 2))
    velocities = np.zeros((num_bodies, 2))
    masses = np.ones(num_bodies) * 5.0e12  # Uniform masses for better stability
    
    # Place bodies in a circular formation
    radius = boundary * 0.7  # Use 70% of the boundary for initial positions
    angle_step = 2 * np.pi / num_bodies
    
    for i in range(num_bodies):
        angle = i * angle_step
        positions[i] = [radius * np.cos(angle), radius * np.sin(angle)]
        
        # Set velocities perpendicular to position for circular orbits
        # Scale velocity by distance to create stable orbits
        orbital_speed = np.sqrt(6.67430e-11 * masses.sum() / radius) * 0.5
        velocities[i] = [-orbital_speed * np.sin(angle), orbital_speed * np.cos(angle)]
    
    return positions, velocities, masses

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
        # Calculate forces on bodies (direct implementation from the original file)
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
