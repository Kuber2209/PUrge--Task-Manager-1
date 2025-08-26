# PUrge BPHC - Development & Deployment Guide

This guide contains four main sections:
1.  **Local Testing:** How to run the app on your computer for testing before deployment.
2.  **Version Control with Git:** How to track changes to your code locally and push them to GitHub.
3.  **Public Deployment:** How to make your app live on the internet.

---

### ✅ Section 1: Run and Test Locally on Your Network (Pre-Deployment)

Follow these steps to run the application on your computer. This is perfect for testing on your phone, tablet, or other computers without making the site public.

**1. Download Your Project Code:**
*   Click the "Download code" button in Firebase Studio to get the project as a ZIP file.
*   Unzip the file on your computer.

**2. Install Prerequisites:**
*   **Node.js:** If you don't have it, [download and install it from the official website](https://nodejs.org/). This also installs `npm`.

**3. Install Project Dependencies:**
*   Open a terminal (Command Prompt, PowerShell, or Terminal on Mac).
*   Navigate into the project folder you unzipped using the `cd` command. For example:
    ```bash
    # Replace 'your-project-folder-name' with the actual folder name
    cd C:\Users\YourName\Desktop\your-project-folder-name
    ```
*   Once inside the folder, run this command to install all the necessary packages:
    ```bash
    npm install
    ```

**4. Start the Local Development Server:**
*   In the same terminal, run the following command:
    ```bash
    npm run dev
    ```
*   The terminal will show you that the server is running. It will look something like this:
    ```
    ✓ Ready in 1.2s
    - Local:        http://localhost:9002
    - Network:      http://192.168.1.10:9002
    ```

**5. Access From Other Devices:**
*   Ensure your computer and your other devices (phone, tablet) are connected to the **SAME Wi-Fi network**.
*   On your phone or tablet, open a web browser and type in the **Network URL** provided by the terminal (e.g., `http://192.168.1.10:9002`).
*   The web app will now load on your device, and you can test it directly! Any changes you make in the code editor and apply will update live.

---

### 📚 Section 2: Track Your Code with Git (Version Control)

Git is a tool that tracks the history of your code, like having a "save" button for your entire project.

#### 2.1: Saving Changes Locally

**1. Navigate to your project folder:**
*   Open your terminal and use the `cd` command to go into your project's main folder.

**2. Initialize Git (only do this once per project):**
*   Run this command to start tracking your project:
    ```bash
    git init
    ```

**3. Save your first version:**
*   To save the current state of all your files, run these two commands:
    ```bash
    # Step 1: Add all files to the "staging area" (the '.' means all files)
    git add .

    # Step 2: Save the staged files with a descriptive message
    git commit -m "Initial commit for PUrge BPHC"
    ```
*   You've now saved your first version! As you make more changes, you can run `git add .` and `git commit -m "Your new message"` again to save new versions.

#### 2.2: Pushing to GitHub

This sends your saved local code to a central repository on GitHub for backup and collaboration.

**1. Create a Repository on GitHub:**
*   Go to [GitHub.com](https://github.com) and create a new, **empty** repository (do not initialize it with a README or license file).
*   After creating it, GitHub will show you a page with a URL. Copy the HTTPS URL, which looks like this: `https://github.com/YourUsername/Your-Repo-Name.git`.

**2. Link Your Local Project to GitHub:**
*   In your terminal (inside your project folder), run this command, replacing the URL with the one you copied:
    ```bash
    git remote add origin https://github.com/YourUsername/Your-Repo-Name.git
    ```

**3. Push Your Code:**
*   Finally, push your committed code to GitHub with this command:
    ```bash
    git push -u origin main
    ```
*   From now on, after you commit new changes locally, you can simply run `git push` to update your GitHub repository.

---

### 🚀 Section 3: Deploy Your Application to the Web (Go Live)

This is the final step to make your application live on a public URL.

**1. Install Firebase CLI:**
*   If you haven't already, install the Firebase command-line tool by running this in your terminal:
    ```bash
    npm install -g firebase-tools
    ```

**2. Log in and Initialize Firebase:**
*   Log in to your Google account:
    ```bash
    firebase login
    ```
*   Make sure you are in your project folder in the terminal.

**3. Build and Deploy:**
*   First, create an optimized production build of your app:
    ```bash
    npm run build
    ```
*   Now, deploy the app to Firebase Hosting:
    ```bash
    firebase deploy --only hosting
    ```

After the command finishes, the terminal will display your **Public URL** (it will look something like `https://your-project-id.web.app`). Congratulations, your app is live!
