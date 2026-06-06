"""
Utility Functions and Static Content for Crop Prediction System Backend.
"""

# Static data for supported crops
CROP_DATA = [
    {
        "name": "Wheat",
        "emoji": "🌾",
        "ideal_conditions": "Prefers well-drained loamy soils, moderate rainfall (300-600mm), and cool to moderate temperatures (15-25°C)."
    },
    {
        "name": "Rice",
        "emoji": "🌾",
        "ideal_conditions": "Thrives in high rainfall (600-1000mm), clayey or loamy soils, and hot, humid climates (20-35°C)."
    },
    {
        "name": "Soybean",
        "emoji": "🌿",
        "ideal_conditions": "Requires warm temperatures (20-30°C), moist silt/loam/peaty soils, and moderate rainfall (400-800mm)."
    },
    {
        "name": "Barley",
        "emoji": "🌾",
        "ideal_conditions": "Thrives in cool climates (10-20°C) with sandy/loamy/chalky soils and low to moderate rainfall (200-500mm)."
    },
    {
        "name": "Maize",
        "emoji": "🌽",
        "ideal_conditions": "Thrives in rich, well-drained silty/loamy soils, warm temperatures (20-35°C), and moderate rainfall (500-800mm)."
    },
    {
        "name": "Cotton",
        "emoji": "🌿",
        "ideal_conditions": "Requires warm temperatures (25-35°C), moderate rainfall (400-800mm), sandy/loamy soil, and plenty of sunshine."
    }
]

# Helper map to quickly get crop emoji
CROP_EMOJI_MAP = {crop["name"]: crop["emoji"] for crop in CROP_DATA}

def get_yield_category(yield_tons):
    """
    Returns yield category based on value:
    Poor < 3, Moderate 3-6, Good 6-8, Excellent > 8
    """
    if yield_tons < 3.0:
        return "Poor"
    elif yield_tons < 6.0:
        return "Moderate"
    elif yield_tons <= 8.0:
        return "Good"
    else:
        return "Excellent"
