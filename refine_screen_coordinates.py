#!/usr/bin/env python
"""
Refine screen coordinates by analyzing alpha channel histogram and finding
the solid transparent core area (excluding anti-aliased edges).
"""

import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage


def refine_screen_coordinates(image_path: str, alpha_threshold: int = 50) -> dict:
    """
    Find the solid transparent screen area, excluding anti-aliased edges.
    
    Uses a more conservative alpha threshold to find the "core" transparent area
    where the screen truly is, ignoring semi-transparent anti-aliasing pixels.
    
    Args:
        image_path: Path to device frame PNG
        alpha_threshold: Alpha threshold for "fully transparent" (higher = stricter)
        
    Returns:
        Dictionary with refined screen coordinates
    """
    
    img = Image.open(image_path).convert('RGBA')
    alpha = np.array(img)[:, :, 3]
    h, w = alpha.shape
    
    print(f"Image size: {w}×{h}")
    print(f"Alpha threshold for solid transparency: {alpha_threshold}")
    
    # Find fully transparent pixels (solid screen area)
    solid_transparent = alpha < alpha_threshold
    
    # Label connected components
    labeled, num_features = ndimage.label(solid_transparent)
    
    # Find the largest component (should be the screen)
    if num_features > 0:
        component_sizes = np.bincount(labeled.ravel())
        # Largest component is at index with max size (excluding 0 which is background)
        screen_label = np.argmax(component_sizes[1:]) + 1
        screen_area = labeled == screen_label
        
        # Find bounding box
        rows = np.where(screen_area.any(axis=1))[0]
        cols = np.where(screen_area.any(axis=0))[0]
        
        if len(rows) > 0 and len(cols) > 0:
            y_min, y_max = int(rows.min()), int(rows.max()) + 1
            x_min, x_max = int(cols.min()), int(cols.max()) + 1
            
            screen_width = x_max - x_min
            screen_height = y_max - y_min
            
            print(f"\nSolid transparent area (alpha < {alpha_threshold}):")
            print(f"Screen bounding box: ({x_min}, {y_min}) to ({x_max}, {y_max})")
            print(f"Screen dimensions: {screen_width}×{screen_height}")
            print(f"Pixels in solid area: {np.count_nonzero(screen_area)}")
            
            # Normalized ratios
            insets = {
                'x': x_min / w,
                'y': y_min / h,
                'width': screen_width / w,
                'height': screen_height / h
            }
            
            print(f"\nNormalized inset ratios:")
            print(f"  x: {x_min}/{w} = {insets['x']:.6f}")
            print(f"  y: {y_min}/{h} = {insets['y']:.6f}")
            print(f"  width: {screen_width}/{w} = {insets['width']:.6f}")
            print(f"  height: {screen_height}/{h} = {insets['height']:.6f}")
            
            return {
                'size': (w, h),
                'screen_bbox': (x_min, y_min, x_max, y_max),
                'screen_width': screen_width,
                'screen_height': screen_height,
                'inset_ratios': insets
            }
    
    raise ValueError("Could not detect screen area")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("Usage: python refine_screen_coordinates.py <path_to_png>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not Path(image_path).exists():
        print(f"Error: File not found: {image_path}")
        sys.exit(1)
    
    try:
        result = refine_screen_coordinates(image_path, alpha_threshold=50)
        
        print("\n" + "="*50)
        print("CODE TO USE:")
        print("="*50)
        print(f"screen: {{")
        print(f"    x: {result['screen_bbox'][0]} / {result['size'][0]},")
        print(f"    y: {result['screen_bbox'][1]} / {result['size'][1]},")
        print(f"    width: {result['screen_width']} / {result['size'][0]},")
        print(f"    height: {result['screen_height']} / {result['size'][1]}")
        print(f"}}")
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
