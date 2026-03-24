#!/bin/bash

echo "================================"
echo "RippleBoards - Complete Setup"
echo "================================"

# Setup Python backend
echo ""
echo "Setting up Python backend..."
cd backend
python -m venv venv
source venv/Scripts/activate || . venv/bin/activate
pip install -r requirements.txt

# Train ML model
echo ""
echo "Training ML model..."
cd ../ml
python model.py
cd ..

echo ""
echo "✓ Python backend ready on port 5000"
echo "✓ ML model trained and saved"

# Setup Node frontend
echo ""
echo "Setting up Node.js frontend..."
cd frontend
npm install

echo ""
echo "✓ Frontend dependencies installed, ready on port 4200"

echo ""
echo "================================"
echo "To start the application:"
echo "================================"
echo "1. Backend (Python):     cd backend && python app.py"
echo "2. Frontend (Angular):   cd frontend && npm run serve"
echo ""
echo "Then visit: http://localhost:4200"
