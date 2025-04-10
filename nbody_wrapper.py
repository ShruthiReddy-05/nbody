import os
import sys
import subprocess
import tempfile
import numpy as np
import logging
import multiprocessing

logger = logging.getLogger(__name__)

def initialize_nbody_system(num_bodies, boundary=20):
    """Initialize a stable orbital system with uniform velocities - exact copy from nbody_mpi.py
    but with a multiplier for more visible movement"""
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
        # Use multiplier to make movement more visible
        velocity_multiplier = 1.5  # Makes orbits more elliptical and movement more visible
        orbital_speed = np.sqrt(6.67430e-11 * masses.sum() / radius) * 0.5 * velocity_multiplier
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
    Run the simulation directly in the current process, with enhanced visualization
    and containment to keep bodies within boundaries
    
    Args:
        num_bodies: Number of bodies (integer)
        time_steps: Number of time steps (integer)
        dt: Time step size (float)
        boundary: Boundary size (float)
    """
    # Initialize with stable orbital system
    positions, velocities, masses = initialize_nbody_system(num_bodies, boundary)
    
    # Setup save interval - use a smaller value to show more frames
    save_interval = max(1, time_steps // 500)  # Store at most 500 frames
    position_history = [positions.copy()]
    
    # Set boundary containment strength
    boundary_strength = 0.2  # How strongly balls get pushed back inside boundary
    
    # Run simulation for specified time steps
    for step in range(time_steps):
        # Calculate forces on bodies
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
            # Use slightly lower gravitational constant to prevent bodies from escaping
            G = 6.67430e-11 * 1.2  # Multiplier for more visible movement but not too fast
            force_magnitudes = G * masses[mask] / (r_magnitudes**3)
            force_vectors = r_vectors * force_magnitudes[:, np.newaxis]
            
            # Sum all force contributions
            forces[i] = np.sum(force_vectors, axis=0)
            
            # Add containment force - push bodies back when they approach boundary
            distance_to_center = np.linalg.norm(positions[i])
            if distance_to_center > boundary * 0.8:  # Start pushing back at 80% of boundary
                # Calculate direction to center
                direction_to_center = -positions[i] / max(distance_to_center, 1e-10)
                # Scale force by how close to boundary (increases as approaches boundary)
                boundary_factor = ((distance_to_center / boundary) ** 4) * boundary_strength
                # Add containment force
                forces[i] += direction_to_center * boundary_factor * masses[i]
        
        # Update velocities by half step (leapfrog integration)
        velocities += forces * dt * 0.5
        
        # Update positions by full step
        positions += velocities * dt
        
        # Hard boundary check - if body escapes, place back inside with reversed velocity
        for i in range(num_bodies):
            distance_to_center = np.linalg.norm(positions[i])
            if distance_to_center >= boundary * 0.95:  # If very close to boundary
                # Set position to 90% of boundary in same direction
                direction = positions[i] / max(distance_to_center, 1e-10)
                positions[i] = direction * (boundary * 0.9)
                # Dampen and reverse velocity component toward boundary
                radial_velocity = np.dot(velocities[i], direction)
                if radial_velocity > 0:  # Moving outward
                    velocities[i] -= direction * radial_velocity * 1.5  # Reverse with dampening
        
        # Update velocities by another half step
        velocities += forces * dt * 0.5
        
        # Save position history at reduced frequency
        if step % save_interval == 0:
            position_history.append(positions.copy())
            
        # Add occasional perturbation to make orbits more interesting but not too much
        if step % 800 == 0 and step > 0:
            # Smaller random perturbation
            velocities += np.random.normal(0, 0.000005 * velocities.std(), velocities.shape)
    
    return np.array(position_history)
