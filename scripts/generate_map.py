import sys
import json
import logging
from typing import Optional, Tuple, Any, Dict
import matplotlib.pyplot as plt
from matplotlib.figure import Figure
import osmnx as ox
import geopandas as gpd
from shapely.geometry import Point, box
import numpy as np
from contextlib import contextmanager
import matplotlib.patches as patches
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configure OSMnx
ox.settings.log_console = True
ox.settings.use_cache = True

@contextmanager
def figure_context():
    """Context manager for handling matplotlib figures."""
    fig = plt.figure(figsize=(10, 10), dpi=300, facecolor='none')
    try:
        yield fig
    finally:
        plt.close(fig)

def validate_input(address: str, map_type: str, scale_meters: float) -> Optional[str]:
    """Validate input parameters."""
    if not address or len(address) > 200:
        return "Invalid address length"
    valid_styles = [
        'default', 'minimal', 'detailed', 'retro', 'modern', 
        'nature', 'dark', 'light', 'colorful', 'monochrome'
    ]
    if map_type not in valid_styles:
        return f"Invalid map type. Must be one of: {', '.join(valid_styles)}"
    if not (50 <= scale_meters <= 1000):
        return "Scale must be between 50 and 1000 meters"
    return None

def get_location_point(address: str) -> Tuple[float, float]:
    """Get the latitude and longitude for an address."""
    try:
        # Clean up the address first
        address = address.strip()
        address = re.sub(r'\s+', ' ', address)  # Replace multiple spaces with single space
        address = re.sub(r',\s*,', ',', address)  # Remove empty components
        address = re.sub(r'\'|\"', '', address)  # Remove any quotes
        
        logger.info(f"Original address: {address}")
        
        # Parse address components
        components = [comp.strip() for comp in address.split(',') if comp.strip()]
        logger.info(f"Address components: {components}")
        
        # Try to identify if we have a Canadian address
        canadian_provinces = {
            'ON', 'BC', 'AB', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'PE', 'QC', 'SK', 'YT',
            'ONTARIO', 'BRITISH COLUMBIA', 'ALBERTA', 'MANITOBA', 'NEW BRUNSWICK', 
            'NEWFOUNDLAND AND LABRADOR', 'NOVA SCOTIA', 'NORTHWEST TERRITORIES', 
            'NUNAVUT', 'PRINCE EDWARD ISLAND', 'QUEBEC', 'SASKATCHEWAN', 'YUKON',
            'CANADA'
        }
        
        # Check if any component (normalized) matches a Canadian province
        is_canadian = any(comp.strip().upper() in canadian_provinces for comp in components)
        logger.info(f"Is Canadian address: {is_canadian}")
        
        # Build address variations
        address_variations = []
        
        if is_canadian:
            # Format for Canadian addresses
            if len(components) >= 3:
                # Remove any USA mentions and ensure Canada is at the end
                components = [c for c in components if 'USA' not in c.upper()]
                if 'Canada' not in components[-1]:
                    components.append('Canada')
                
                # Try full address
                clean_address = ', '.join(components)
                address_variations.append(clean_address)
                
                # Try without street number
                parts = components[0].split(' ')
                if len(parts) > 1 and parts[0].isdigit():
                    without_number = ', '.join([' '.join(parts[1:])] + components[1:])
                    address_variations.append(without_number)
                
                # Try with just city and province
                city_province = f"{components[-3]}, {components[-2]}, Canada"
                address_variations.append(city_province)
        else:
            # Format for US addresses
            clean_components = []
            for comp in components:
                if 'Canada' not in comp.upper():
                    clean_components.append(comp)
            if 'USA' not in clean_components[-1].upper():
                clean_components.append('USA')
            
            # Try full address
            clean_address = ', '.join(clean_components)
            address_variations.append(clean_address)
            
            # Try simplified version
            if len(clean_components) >= 3:
                simple_address = f"{clean_components[0]}, {clean_components[1]}, {clean_components[-2]}, USA"
                address_variations.append(simple_address)
        
        logger.info(f"Trying these address variations: {address_variations}")
        
        last_error = None
        for addr in address_variations:
            try:
                logger.info(f"Attempting to geocode: {addr}")
                location = ox.geocode(addr)
                if location and len(location) == 2:
                    lat, lon = location
                    if -90 <= lat <= 90 and -180 <= lon <= 180:
                        logger.info(f"Successfully geocoded to: ({lat}, {lon})")
                        return lat, lon
                    else:
                        logger.warning(f"Invalid coordinates returned: {location}")
                else:
                    logger.warning(f"Invalid location format returned: {location}")
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Failed to geocode {addr}: {last_error}")
                continue
        
        # If we get here, none of the variations worked
        error_msg = (
            "Could not find this location. Please ensure the address is correct and try these formats:\n"
            "For US addresses: '1234 Street Name, City, State, USA'\n"
            "For Canadian addresses: '1234 Street Name, City, Province, Canada'\n"
            f"Last error: {last_error}"
        )
        logger.error(error_msg)
        raise ValueError(error_msg)
        
    except Exception as e:
        logger.error(f"Error in geocoding process: {str(e)}")
        raise

def create_graph(lat: float, lon: float, dist: float) -> Any:
    """Create a graph from a point with error handling."""
    try:
        G = ox.graph_from_point(
            (lat, lon),
            dist=dist,
            network_type='all',
            simplify=True,
            retain_all=False,
            truncate_by_edge=True
        )
        
        if not G or G.number_of_nodes() == 0:
            raise ValueError("No street network found in the area")
            
        logger.info(f"Successfully created graph with {G.number_of_nodes()} nodes")
        return G
    except Exception as e:
        logger.error(f"Error creating graph: {str(e)}")
        raise

def get_geometries(lat: float, lon: float, dist: float) -> Dict[str, Any]:
    """Get the geometries for the map."""
    try:
        tags = {
            'building': True,
            'natural': ['water', 'bay'],
            'leisure': ['park', 'garden', 'playground', 'recreation_ground'],
            'landuse': ['grass', 'meadow', 'forest', 'farmland']
        }
        
        gdf = ox.geometries_from_point((lat, lon), tags, dist)
        logger.info(f"Successfully fetched geometries with {len(gdf)} features")
        
        # Ensure we have all required columns with default values
        if 'building' not in gdf.columns:
            gdf['building'] = ''
        if 'natural' not in gdf.columns:
            gdf['natural'] = ''
        if 'leisure' not in gdf.columns:
            gdf['leisure'] = ''
        if 'landuse' not in gdf.columns:
            gdf['landuse'] = ''
            
        # Convert all columns to string type and handle NaN values
        for col in ['building', 'natural', 'leisure', 'landuse']:
            gdf[col] = gdf[col].fillna('').astype(str)
        
        # Create masks for each feature type
        water = gdf['natural'].isin(['water', 'bay'])
        parks = gdf['leisure'].isin(['park', 'garden', 'playground', 'recreation_ground']) | \
               gdf['landuse'].isin(['grass', 'meadow', 'forest', 'farmland'])
        buildings = gdf['building'] != ''
        
        # Split into separate GeoDataFrames
        geometries = {
            'water': gdf[water],
            'parks': gdf[parks],
            'buildings': gdf[buildings]
        }
        
        return geometries
    except Exception as e:
        logger.error(f"Error getting geometries: {str(e)}")
        raise

def generate_map(
    address: str,
    map_type: str = 'default',
    scale_meters: float = 1000,
    custom_colors: Optional[Dict[str, str]] = None
) -> Figure:
    """
    Generate a map for the given address and style.
    
    Args:
        address: The address to generate the map for
        map_type: The style of map to generate
        scale_meters: The scale of the map in meters
        custom_colors: Optional dictionary of custom colors for map elements
    
    Returns:
        The generated map figure
    """
    try:
        # Validate input
        error = validate_input(address, map_type, scale_meters)
        if error:
            raise ValueError(error)

        # Get the location coordinates
        lat, lon = get_location_point(address)
        logger.info(f"Location found: ({lat}, {lon})")

        # Calculate the distance in meters for the bounding box
        dist = scale_meters * 1.5  # Make the box slightly larger than requested scale

        # Create the base graph
        G = create_graph(lat, lon, dist)

        # Define map styles with consistent parameters
        styles = {
            'default': {
                'building_color': '#8B7355',
                'street_color': '#000000',
                'water_color': '#85C1E9',
                'park_color': '#90EE90',
                'background_color': '#F5F5F5',
                'edge_linewidth': 1,
                'node_size': 0
            },
            'minimal': {
                'building_color': '#A9A9A9',
                'street_color': '#696969',
                'water_color': '#B0E0E6',
                'park_color': '#98FB98',
                'background_color': '#FFFFFF',
                'edge_linewidth': 0.5,
                'node_size': 0
            },
            'detailed': {
                'building_color': '#8B4513',
                'street_color': '#000000',
                'water_color': '#87CEEB',
                'park_color': '#90EE90',
                'background_color': '#F5DEB3',
                'edge_linewidth': 1.5,
                'node_size': 0
            },
            'modern': {
                'building_color': '#455A64',
                'street_color': '#37474F',
                'water_color': '#B3E5FC',
                'park_color': '#C8E6C9',
                'background_color': '#FAFAFA',
                'edge_linewidth': 1,
                'node_size': 0
            },
            'nature': {
                'building_color': '#795548',
                'street_color': '#5D4037',
                'water_color': '#81D4FA',
                'park_color': '#81C784',
                'background_color': '#F1F8E9',
                'edge_linewidth': 1,
                'node_size': 0
            },
            'dark': {
                'background_color': '#1A1A1A',
                'water_color': '#0077BE',
                'park_color': '#2D5A27',
                'building_color': '#CD853F',
                'street_color': '#E8E8E8',
                'edge_linewidth': 1,
                'node_size': 0
            },
            'light': {
                'building_color': '#90A4AE',
                'street_color': '#78909C',
                'water_color': '#E1F5FE',
                'park_color': '#E8F5E9',
                'background_color': '#FFFFFF',
                'edge_linewidth': 1,
                'node_size': 0
            },
            'colorful': {
                'building_color': '#FF5722',
                'street_color': '#795548',
                'water_color': '#2196F3',
                'park_color': '#4CAF50',
                'background_color': '#FFECB3',
                'edge_linewidth': 1,
                'node_size': 0
            },
            'monochrome': {
                'building_color': '#424242',
                'street_color': '#212121',
                'water_color': '#9E9E9E',
                'park_color': '#757575',
                'background_color': '#FAFAFA',
                'edge_linewidth': 1,
                'node_size': 0
            }
        }

        # Use custom colors if provided, otherwise use predefined style
        style = styles[map_type].copy()
        if custom_colors:
            # Ensure we don't override the edge_linewidth and node_size
            edge_linewidth = style['edge_linewidth']
            node_size = style['node_size']
            style.update(custom_colors)
            style['edge_linewidth'] = edge_linewidth
            style['node_size'] = node_size

        # Get geometries (buildings, parks, water)
        geometries = get_geometries(lat, lon, dist)

        # Create the figure using context manager
        with figure_context() as fig:
            # Create the axis with equal aspect ratio
            ax = fig.add_subplot(111, aspect='equal')
            
            # Set figure and axis to be square
            fig.set_size_inches(10, 10)
            
            # Create a circle for masking
            circle = plt.Circle((0.5, 0.5), 0.48, transform=fig.transFigure, fc='none', ec='none')
            
            # Add the circle as a patch to the figure
            fig.patches.extend([circle])
            
            # Set the clip path for the axis
            ax.set_clip_path(circle)
            
            # Set background color
            ax.set_facecolor(style['background_color'])
            fig.patch.set_facecolor('none')  # Make figure background transparent

            # Plot features if available
            if 'water' in geometries and not geometries['water'].empty:
                geometries['water'].plot(ax=ax, fc=style['water_color'], ec='none', alpha=0.9)

            if 'parks' in geometries and not geometries['parks'].empty:
                geometries['parks'].plot(ax=ax, fc=style['park_color'], ec='none', alpha=0.9)

            if 'buildings' in geometries and not geometries['buildings'].empty:
                geometries['buildings'].plot(ax=ax, fc=style['building_color'], ec='none', alpha=0.9)

            # Plot the street network
            ox.plot_graph(
                G,
                ax=ax,
                node_size=style['node_size'],
                edge_color=style['street_color'],
                edge_alpha=0.5,
                edge_linewidth=style['edge_linewidth'],
                show=False
            )

            # Remove axes
            ax.set_axis_off()

            # Adjust the plot bounds
            margin_factor = 0.1
            if 'water' in geometries and not geometries['water'].empty:
                bounds = geometries['water'].total_bounds
            elif 'parks' in geometries and not geometries['parks'].empty:
                bounds = geometries['parks'].total_bounds
            elif 'buildings' in geometries and not geometries['buildings'].empty:
                bounds = geometries['buildings'].total_bounds
            else:
                nodes = ox.graph_to_gdfs(G, edges=False)
                bounds = nodes.total_bounds

            width = bounds[2] - bounds[0]
            height = bounds[3] - bounds[1]
            
            # Make sure the view is perfectly square
            center_x = (bounds[0] + bounds[2]) / 2
            center_y = (bounds[1] + bounds[3]) / 2
            max_dim = max(width, height)
            
            ax.set_xlim([
                center_x - max_dim/2 - max_dim * margin_factor,
                center_x + max_dim/2 + max_dim * margin_factor
            ])
            ax.set_ylim([
                center_y - max_dim/2 - max_dim * margin_factor,
                center_y + max_dim/2 + max_dim * margin_factor
            ])

            # Ensure the aspect ratio is exactly 1:1
            ax.set_aspect('equal', adjustable='box')

            return fig

    except Exception as e:
        logger.error(f"Error generating map: {str(e)}")
        raise

if __name__ == "__main__":
    try:
        # Read input from command line arguments
        if len(sys.argv) != 6:
            print(f"Usage: {sys.argv[0]} <address> <map_type> <scale_meters> <custom_colors_json> <output_path>")
            sys.exit(1)

        address = sys.argv[1]
        map_type = sys.argv[2]
        scale_meters = float(sys.argv[3])
        custom_colors = json.loads(sys.argv[4])
        output_path = sys.argv[5]

        # Generate the map
        fig = generate_map(
            address=address,
            map_type=map_type,
            scale_meters=scale_meters,
            custom_colors=custom_colors
        )

        # Save the figure
        fig.savefig(output_path, bbox_inches='tight', pad_inches=0.5)
        plt.close(fig)
        print(json.dumps({"success": True, "path": output_path}))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}), file=sys.stderr)
        sys.exit(1)
