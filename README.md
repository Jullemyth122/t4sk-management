# T4SK Management - Modern Task Management Platform

T4SK Management is a powerful, real-time task management application built with **React**, **Vite**, and **Firebase**. It provides a sleek, responsive interface for teams to collaborate, track projects, and manage workflows efficiently.

## 🚀 Key Features

### 📋 Task Management
-   **Boards & Lists**: Create and organize tasks with drag-and-drop functionality.
-   **Task Details**: Add descriptions, due dates, checklists, and attachments.
-   **Real-time Updates**: Changes are synced instantly across all users.

### 👥 Team Collaboration
-   **Member Presence**: Real-time online/offline status indicators.
-   **Team Management**: Invite members, assign roles (Admin/Member), and manage permissions.
-   **Business Profiles**: Centralized business information and settings.
-   **Pagination**: Efficiently manage large teams with paginated member lists.

### 🎨 Modern UI/UX
-   **Themes**: Toggle between Light and Dark modes.
-   **Responsive Design**: Optimized for desktop and mobile devices.
-   **Custom Styling**: Built with SCSS for a unique, premium look.

### 🔔 Notifications
-   **Activity Feed**: Get notified about task updates, mentions, and assignments.
-   **Smart Alerts**: Context-aware notifications for critical actions.

## 🛠️ Tech Stack

-   **Frontend**: React 19, Vite 6
-   **Language**: JavaScript (ES6+), SCSS
-   **Backend / Database**: Firebase (Authentication, Firestore, Realtime Database)
-   **Deployment**: Docker, GitHub Actions (CI/CD)
-   **State Management**: React Context & Hooks

## 📦 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Jullemyth122/t4sk-management.git
    cd t4sk-management
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root directory and add your Firebase configuration:
    ```env
    VITE_API_KEY=your_api_key
    VITE_AUTH_DOMAIN=your_auth_domain
    VITE_PROJECT_ID=your_project_id
    VITE_STORAGE_BUCKET=your_storage_bucket
    VITE_MESSAGING_SENDER_ID=your_messaging_sender_id
    VITE_APP_ID=your_app_id
    VITE_MEASUREMENT_ID=your_measurement_id
    VITE_DATABASE_URL=your_realtime_database_url
    ```

4.  **Run Locally**
    ```bash
    npm run dev
    ```

## 🐳 Docker Setup

Build and run the application containerized:

```bash
# Build the image
docker build -t t4sk-management .

# Run the container
docker run -p 5173:5173 t4sk-management
```

## 🛡️ Git Workflow (Protected Branches)

Direct pushes to `main` are restricted. Follow this workflow:

1.  Create a feature branch: `git checkout -b feature/new-feature`
2.  Commit changes: `git commit -m "Add feature"`
3.  Push branch: `git push origin feature/new-feature`
4.  Create a **Pull Request (PR)** on GitHub.
5.  Wait for CI checks to pass and merge.

See [git_workflow.md](./git_workflow.md) for details.

## 📄 License

This project is proprietary. All rights reserved.
