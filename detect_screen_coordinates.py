#!/usr/bin/env python
"""
Detect screen coordinates in device frame PNG images.

This script analyzes PNG device frame files to extract the transparent screen cutout
coordinates using flood-fill algorithm on the alpha channel.

Usage:
    python detect_screen_coordinates.py <path_to_png>
    
Example:
    python detect_screen_coordinates.py static/models/2d/apple-iphone-17-pro-2025-medium.png
"""

import sys
from pathlib import Path
from collections import deque
import numpy as np
from PIL import Image


def detect_screen_coordinates(image_path: str, alpha_threshold: int = 20, verbose: bool = True) -> dict:
    """
    Detect screen coordinates in a device frame PNG.
    
    Args:
        image_path: Path to the device frame PNG file
        alpha_threshold: Alpha value threshold for transparency (0-255). Pixels with 
                        alpha < threshold are considered transparent.
        verbose: Print detailed analysis information
        
    Returns:
        Dictionary containing:
            - size: (width, height) of the frame
            - screen_bbox: (x_min, y_min, x_max, y_max) of screen cutout
            - screen_width: Width of screen area
            - screen_height: Height of screen area
            - inner_pixel_count: Number of transparent pixels in screen area
            - inset_ratios: Normalized inset ratios (x/w, y/h, width/w, height/h)
    """
    
    # Load image and extract alpha channel
    img = Image.open(image_path).convert('RGBA')
    alpha = np.array(img)[:, :, 3]
    h, w = alpha.shape
    
    if verbose:
        print(f"Image size: {w}×{h}")
        print(f"Alpha threshold: {alpha_threshold}")
    
    # Find transparent pixels (alpha < threshold)
    transparent = alpha < alpha_threshold
    
    # Flood-fill from edges to find external transparent area
    visited = np.zeros_like(transparent, dtype=bool)
    queue = deque()
    
    # Start from all edge transparent pixels
    for x in range(w):
        if transparent[0, x]:
            visited[0, x] = True
            queue.append((0, x))
        if transparent[h - 1, x] and not visited[h - 1, x]:
            visited[h - 1, x] = True
            queue.append((h - 1, x))
    
    for y in range(h):
        if transparent[y, 0] and not visited[y, 0]:
            visited[y, 0] = True
            queue.append((y, 0))
        if transparent[y, w - 1] and not visited[y, w - 1]:
            visited[y, w - 1] = True
            queue.append((y, w - 1))
    
    # BFS to mark all connected external transparent pixels
    while queue:
        y, x = queue.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and transparent[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))
    
    # Internal transparent area = transparent but not visited (not connected to edges)
    internal = transparent & (~visited)
    inner_pixel_count = np.count_nonzero(internal)
    
    if verbose:
        print(f"Internal transparent pixels: {inner_pixel_count}")
    
    # Find bounding box of internal transparent area
    rows_with_internal = np.where(internal.any(axis=1))[0]
    cols_with_internal = np.where(internal.any(axis=0))[0]
    
    if len(rows_with_internal) == 0 or len(cols_with_internal) == 0:
        raise ValueError("No internal transparent screen area detected in image")
    
    y_min = int(rows_with_internal.min())
    y_max = int(rows_with_internal.max()) + 1
    x_min = int(cols_with_internal.min())
    x_max = int(cols_with_internal.max()) + 1
    
    screen_width = x_max - x_min
    screen_height = y_max - y_min
    
    # Calculate normalized inset ratios for responsive scaling
    inset_ratios = {
        'x': x_min / w,
        'y': y_min / h,
        'width': screen_width / w,
        'height': screen_height / h
    }
    
    result = {
        'size': (w, h),
        'screen_bbox': (x_min, y_min, x_max, y_max),
        'screen_width': screen_width,
        'screen_height': screen_height,
        'inner_pixel_count': inner_pixel_count,
        'inset_ratios': inset_ratios
    }
    
    if verbose:
        print(f"\nScreen bounding box: ({x_min}, {y_min}) to ({x_max}, {y_max})")
        print(f"Screen dimensions: {screen_width}×{screen_height}")
        print(f"\nNormalized inset ratios:")
        print(f"  x: {x_min}/{w} = {inset_ratios['x']:.6f}")
        print(f"  y: {y_min}/{h} = {inset_ratios['y']:.6f}")
        print(f"  width: {screen_width}/{w} = {inset_ratios['width']:.6f}")
        print(f"  height: {screen_height}/{h} = {inset_ratios['height']:.6f}")
    
    return result


def analyze_corner_radius(image_path: str, alpha_threshold: int = 20, num_samples: int = 7, verbose: bool = True) -> dict:
    """
    Analyze corner radius progression by sampling screen cutout width at different heights.
    
    Args:
        image_path: Path to the device frame PNG file
        alpha_threshold: Alpha value threshold for transparency
        num_samples: Number of rows to sample from top/bottom corners
        verbose: Print sampling information
        
    Returns:
        Dictionary with 'top_samples' and 'bottom_samples' lists of (y, x_min, x_max, width) tuples
    """
    
    img = Image.open(image_path).convert('RGBA')
    alpha = np.array(img)[:, :, 3]
    h, w = alpha.shape
    
    transparent = alpha < alpha_threshold
    
    # Flood-fill to find internal area (same as detect_screen_coordinates)
    visited = np.zeros_like(transparent, dtype=bool)
    queue = deque()
    
    for x in range(w):
        if transparent[0, x]:
            visited[0, x] = True
            queue.append((0, x))
        if transparent[h - 1, x] and not visited[h - 1, x]:
            visited[h - 1, x] = True
            queue.append((h - 1, x))
    
    for y in range(h):
        if transparent[y, 0] and not visited[y, 0]:
            visited[y, 0] = True
            queue.append((y, 0))
        if transparent[y, w - 1] and not visited[y, w - 1]:
            visited[y, w - 1] = True
            queue.append((y, w - 1))
    
    while queue:
        y, x = queue.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and transparent[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))
    
    internal = transparent & (~visited)
    rows_with_internal = np.where(internal.any(axis=1))[0]
    
    if len(rows_with_internal) == 0:
        return {'top_samples': [], 'bottom_samples': []}
    
    y_min = int(rows_with_internal.min())
    y_max = int(rows_with_internal.max())
    
    # Sample from top corner
    top_samples = []
    for i in range(num_samples):
        y = y_min + i
        if y <= y_max:
            xs = np.where(internal[y])[0]
            if xs.size > 0:
                x_start, x_end = int(xs.min()), int(xs.max()) + 1
                top_samples.append({
                    'y': y,
                    'x_min': x_start,
                    'x_max': x_end,
                    'width': x_end - x_start
                })
    
    # Sample from bottom corner
    bottom_samples = []
    for i in range(num_samples):
        y = y_max - (num_samples - 1) + i
        if y >= y_min:
            xs = np.where(internal[y])[0]
            if xs.size > 0:
                x_start, x_end = int(xs.min()), int(xs.max()) + 1
                bottom_samples.append({
                    'y': y,
                    'x_min': x_start,
                    'x_max': x_end,
                    'width': x_end - x_start
                })
    
    if verbose:
        print("\n--- Top Corner Analysis ---")
        for sample in top_samples:
            print(f"y={sample['y']:3d}: x=[{sample['x_min']:3d}, {sample['x_max']:3d}], width={sample['width']:3d}")
        
        print("\n--- Bottom Corner Analysis ---")
        for sample in bottom_samples:
            print(f"y={sample['y']:3d}: x=[{sample['x_min']:3d}, {sample['x_max']:3d}], width={sample['width']:3d}")
    
    return {'top_samples': top_samples, 'bottom_samples': bottom_samples}


def main():
    """CLI entry point."""
    if len(sys.argv) < 2:
        print(__doc__)
        print("Error: Please provide path to PNG file")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not Path(image_path).exists():
        print(f"Error: File not found: {image_path}")
        sys.exit(1)
    
    try:
        # Detect screen coordinates
        coords = detect_screen_coordinates(image_path, verbose=True)
        
        # Analyze corner radius
        print("\n" + "="*50)
        analyze_corner_radius(image_path, verbose=True)
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
