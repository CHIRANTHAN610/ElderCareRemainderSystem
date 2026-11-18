# Elder Care Reminder System — Frontend

React + Vite + Tailwind CSS frontend built to work with your Spring Boot backend (`com.mycem.elderCareRemainderSystem`).

## Quick Start

1. Make sure your Spring Boot backend is running on `http://localhost:8080` (with `@CrossOrigin(origins = "http://localhost:5173")`).
2. Install dependencies and start the Vite dev server:

```bash
npm install
npm run dev
```

3. Open `http://localhost:5173` in your browser.

> If your backend runs on a different host or port, create a `.env` file with:
> `VITE_API_BASE_URL=http://localhost:8080`

## Connected Backend Endpoints

- **Elders (`/api/elders`)**: `GET`, `GET /{id}`, `POST`, `DELETE /{id}`
- **Appointments (`/api/appointments`)**: `GET`, `GET /{id}`, `POST`, `PUT /{id}`, `DELETE /{id}`
- **Medicines (`/api/medicines`)**: `GET`, `GET /{id}`, `POST`, `DELETE /{id}`
