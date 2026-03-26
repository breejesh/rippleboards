# RippleBoards

Prerequisites
- Python 3.8 or newer
- Node.js 16+ and npm

Quick start

1) Backend (API)

	```powershell
	cd backend
	python -m venv .venv
	# Windows
	.venv\Scripts\activate
	pip install -r requirements.txt
	python app.py
	```

	The backend serves a small Flask API and listens on port 5000 by default.

2) Frontend (UI)

	```bash
	cd frontend
	npm install
	npm run serve
	```

	The frontend is an Angular app (dev server usually runs on http://localhost:4200).

Data
- The project expects the dataset at `data/Non-Medical_Factor_Measures_for_Place__ACS_2017-2021.csv`.
