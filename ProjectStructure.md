# Isla del Café 2025 — Project Structure Documentation

This document provides a detailed overview of the folder and file structure for the `Isla del Café 2025` project, including both **frontend** and **backend** applications.

---

## Root Directory

Isladelcafe2025/
├── backend/
└── frontend/

yaml
Copy code

---

## Frontend Folder Structure

The frontend is a modern React application, built with Vite.

frontend/
├── public/
│ └── index.html
├── src/
│ ├── assets/ # Images, fonts, icons, and other static assets
│ ├── components/ # Reusable UI components (e.g., Button, Header, Card)
│ ├── pages/ # Page-level components (e.g., HomePage, LoginPage)
│ ├── services/ # API service modules for backend communication
│ ├── store/ # State management (e.g., Zustand, Redux)
│ ├── style/ # Global styles, CSS, and theming
│ ├── utils/ # Utility functions/helpers
│ ├── layouts/ # Layout components (e.g., DashboardLayout)
│ ├── App.jsx # Root React component
│ ├── index.css # Global CSS
│ └── main.jsx # React application entry point
├── .gitignore
├── index.html # HTML template for SPA
├── package.json # Project dependencies and scripts
└── vite.config.js # Vite build configuration

markdown
Copy code

### Folder & File Descriptions

* **`public/`**: Contains static assets that are publicly accessible and not processed by Vite. The SPA mounts to `index.html`.
* **`src/`**: Main source code directory.
  * **`assets/`**: Images, fonts, and other static resources imported into components.
  * **`components/`**: Reusable UI components.
  * **`pages/`**: Page-level React components representing full views.
  * **`services/`**: Modules for handling API calls.
  * **`store/`**: Application state management (e.g., user authentication, global states).
  * **`style/`**: Global CSS, themes, and style configurations.
  * **`utils/`**: Helper functions and utility scripts.
  * **`layouts/`**: Layout templates shared across multiple pages.
  * **`App.jsx`**: Main React component that defines routing and app structure.
  * **`main.jsx`**: Entry point that renders `<App />` into the DOM.

---

## Backend Folder Structure

The backend is a PHP application using a custom MVC-like architecture, with Firebase integration for authentication.

backend/
├── app/
│ ├── Auth/ # Authentication & Firebase verification
│ │ └── FirebaseAuth.php # Verifies Firebase ID tokens, syncs users
│ ├── Controller/ # Handles HTTP requests & responses
│ │ ├── AccountController.php
│ │ ├── AuthController.php
│ │ ├── OrderController.php
│ │ ├── ProductController.php
│ │ └── UserController.php
│ ├── Database/ # Database connection
│ │ └── Database.php # PDO connection class
│ ├── Model/ # Database models
│ │ └── UserModel.php
│ └── Utils/ # Helper functions
│ └── Helpers.php
├── config/ # Configuration files
│ └── firebase-service-account.json # Optional Firebase Admin credentials
├── public/ # Document root for web server
│ ├── index.php # Entry point for all HTTP requests / API
│ └── .htaccess # Apache URL rewrite rules
├── bootstrap.php # Bootstraps the application (autoloading, environment)
├── composer.json # PHP dependencies (managed by Composer)
├── .env # Environment variables (DB credentials, Firebase project ID)
└── vendor/ # Composer-managed packages

markdown
Copy code

### Folder & File Descriptions

* **`app/Auth/`**: Manages authentication, including Firebase OAuth2 token verification.
* **`app/Controller/`**: Handles business logic for accounts, authentication, orders, products, and users.
* **`app/Database/`**: Database connection logic using PDO.
* **`app/Model/`**: Represents database tables and provides CRUD operations.
* **`app/Utils/`**: Helper functions such as input sanitization, API response formatting, etc.
* **`config/`**: Stores configuration files, including Firebase credentials.
* **`public/`**: Web server document root. Only this folder should be publicly accessible.
* **`bootstrap.php`**: Initializes the application environment and autoloading.
* **`.env`**: Contains environment variables for local configuration.
* **`vendor/`**: PHP dependencies installed via Composer.

---

## Summary

This project separates concerns clearly:

* **Frontend**: Handles UI, user interaction, and communicates with the backend via API.
* **Backend**: Handles business logic, database operations, and authentication (including Firebase OAuth2).
* **Shared Goals**: Secure authentication, structured MVC-like backend, and modular, reusable frontend components.
