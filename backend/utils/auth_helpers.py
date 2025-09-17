"""Authentication helper functions and constants"""

# Animal list for password hints
ANIMAL_LIST = [
    "cat", "dog", "elephant", "lion", "tiger", 
    "bear", "rabbit", "horse", "bird", "fish"
]

def get_animal_list():
    """Get the list of animals for password hints"""
    return ANIMAL_LIST

def is_valid_animal(animal):
    """Check if the provided animal is in the valid list"""
    return animal.lower() in [a.lower() for a in ANIMAL_LIST]