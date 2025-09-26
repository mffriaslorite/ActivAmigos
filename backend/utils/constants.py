# Password hint animals list
ANIMAL_LIST = [
    "perro",      # dog
    "gato",       # cat
    "elefante",   # elephant
    "león",       # lion
    "tigre",      # tiger
    "oso",        # bear
    "conejo",     # rabbit
    "delfín",     # dolphin
    "mariposa",   # butterfly
    "pájaro"      # bird
]

# JWT Token settings
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 30

# Rate limiting
PASSWORD_HINT_RATE_LIMIT = "5 per minute"