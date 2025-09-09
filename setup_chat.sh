#!/bin/bash

echo "🚀 Setting up ActivAmigos Real-Time Chat System"
echo "================================================"

# Backend Setup
echo "📦 Setting up Backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOL
DATABASE_URL=postgresql://user:password@localhost:5432/activamigos
SECRET_KEY=dev-secret-key-change-in-production
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_SECURE=false
MINIO_BUCKET_NAME=activamigos
EOL
    echo "⚠️  Please update the DATABASE_URL in .env with your PostgreSQL credentials"
fi

# Frontend Setup
echo "📱 Setting up Frontend..."
cd ../frontend/activamigos-frontend

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Create environment files if they don't exist
if [ ! -f "src/environments/environment.ts" ]; then
    echo "Creating environment.ts..."
    mkdir -p src/environments
    cat > src/environments/environment.ts << EOL
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000'
};
EOL
fi

if [ ! -f "src/environments/environment.prod.ts" ]; then
    echo "Creating environment.prod.ts..."
    cat > src/environments/environment.prod.ts << EOL
export const environment = {
  production: true,
  apiUrl: 'http://localhost:5000'  // Update this for production
};
EOL
fi

echo "✅ Setup complete!"
echo ""
echo "🎯 Next Steps:"
echo "1. Set up PostgreSQL database"
echo "2. Update DATABASE_URL in backend/.env"
echo "3. Run database migrations:"
echo "   cd backend && source venv/bin/activate && export FLASK_APP=app.py && flask db upgrade"
echo "4. Start backend: cd backend && python app.py"
echo "5. Start frontend: cd frontend/activamigos-frontend && npm start"
echo ""
echo "📚 See CHAT_IMPLEMENTATION.md for detailed documentation"