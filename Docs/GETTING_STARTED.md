# StudySync - Developer Setup Guide

This guide will walk you through setting up the project on your local machine so you can start developing. Follow these steps in order.

**Step 1: Install Prerequisite Software**

Before you begin, make sure you have the following tools installed on your computer.

1. **Node.js (LTS Version):** This is the runtime for our JavaScript backend. It automatically includes npm, the package manager we need.

    * **Download Link:** https://nodejs.org/

2. **Git:** This is the version control system we use to manage and share our code.

    * **Download Link:** https://git-scm.com/download/win

* *Note for Windows users:* During installation, you can safely accept all the default settings by clicking "Next" on every screen.

3. **Visual Studio Code:** This is our team's official code editor.

    * **Download Link:** https://code.visualstudio.com/

**Step 2: Fix for Windows PowerShell (Windows Users Only)**

By default, Windows security blocks some of the scripts `npm` needs to run. This command fixes that.

1. Open **PowerShell as an Administrator.** To do this, click the Start Menu, type `PowerShell`, right-click on "Windows PowerShell," and select "Run as administrator."

2. Run the following command in the Administrator PowerShell window and press `Y` to confirm if prompted:

```PowerShell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Step 3: Clone the Repository**

This will download the project from our shared GitHub to your computer.

1. Open a new, regular PowerShell terminal.

Navigate to the directory where you want to store the project (e.g., `cd C:\Users\YourUsername`).

3. Run the clone command:

```Bash
git clone https://github.com/CS196Illinois/FA25-Group8.git
```
4. Open the new FA25-Group8 folder in Visual Studio Code **(File > Open Folder...).**

**Step 4: Configure the Backend**

Our backend needs a secret key file to connect to our Firebase project. **This file must never be committed to GitHub.**

1. **Get the Key:** Ask Elias for the `serviceAccountKey.json` file. He will send it to you directly (e.g., via Discord DM).

2. **Place the Key:** Place the `serviceAccountKey.json` file you receive inside the `Project/studysync-backend` folder.

3. **Install Dependencies:** Open a terminal inside VS Code (`Ctrl+Shift+`\`). Make sure you are in the backend directory, then run `npm install`:

```PowerShell
cd Project/studysync-backend
npm install
```

**Step 5: Run the Server**

This will start the backend on your local machine.

1. While still in the `Project/studysync-backend` directory in your terminal, run the following command:

```PowerShell
node index.js
```

2. If everything is set up correctly, you will see the message: `Server is running on http://localhost:3000`.

You are now ready to start developing!