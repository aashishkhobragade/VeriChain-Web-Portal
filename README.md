# All Code — Manufacturer Registration Module

All source files from the `manufacturer-registration` project are collected here in a **single flat folder**, prefixed by layer for easy identification.

## File Map

| File | Original Path | Description |
|------|--------------|-------------|
| `backend_app.js` | `backend/src/app.js` | Express server — all API routes |
| `backend_package.json` | `backend/package.json` | Backend dependencies |
| `backend_errorHandler.js` | `backend/src/middleware/errorHandler.js` | Global error middleware |
| `backend_seed.js` | `backend/src/seed.js` | MongoDB seed script (optional) |
| `frontend_App.jsx` | `frontend/src/App.jsx` | Root React component |
| `frontend_main.jsx` | `frontend/src/main.jsx` | React entry point |
| `frontend_RegisterEventForm.jsx` | `frontend/src/components/RegisterEventForm.jsx` | Main registration form |
| `frontend_api.js` | `frontend/src/services/api.js` | Axios API service layer |
| `frontend_index.css` | `frontend/src/index.css` | All styles |
| `frontend_index.html` | `frontend/index.html` | HTML shell |
| `frontend_vite.config.js` | `frontend/vite.config.js` | Vite + proxy config |
| `frontend_package.json` | `frontend/package.json` | Frontend dependencies |

## How to Run

### Backend
```bash
cd all-code
# Install backend deps
npm install --prefix . cors dotenv express uuid
node backend_app.js
# Runs on http://localhost:5000
```

### Frontend
```bash
# In a separate terminal, from the all-code folder:
npm install --prefix . axios react react-dom vite @vitejs/plugin-react
npx vite --config frontend_vite.config.js
# Runs on http://localhost:5173
```

> **Note:** The backend reads CSV files from `C:\Users\Samruddhi\Downloads\`. Make sure `packaged_food.csv`, `baby_products.csv`, `watches.csv`, and `shoes.csv` are present there.
