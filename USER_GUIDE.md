# Wedding Danmu System - Venue User Guide

This guide explains how to set up and run the Photo Wall & Danmu system at the wedding venue.

## 📋 Prerequisites
1.  **Host Computer**: A laptop/PC to run the software.
2.  **Wi-Fi Network**: A local Wi-Fi network (or router) that all devices can connect to.
    *   *Note: Internet access is needed ONLY if you haven't downloaded the Socket.IO library to the local folder. If you are offline, ensure `static/js/socket.io.min.js` exists.*
3.  **Projector/Screen**: Connected to the Host Computer (or a separate computer on the same network).

## 🚀 Step 1: Start the Server

1.  Open the folder containing the project files on the Host Computer.
2.  Open a terminal (Command Prompt or PowerShell) in this folder.
3.  Run the following command:
    ```bash
    uvicorn main:socket_app --host 0.0.0.0 --port 8000
    ```
4.  You should see output indicating the server has started (e.g., `Uvicorn running on http://0.0.0.0:8000`).

## 🔗 Step 2: Connect Devices

### **A. Find the Host IP Address**
To allow other devices to connect, you need the Host Computer's local IP address.
1.  Open a new terminal window.
2.  Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux).
3.  Look for "IPv4 Address" under your Wi-Fi adapter (e.g., `192.168.1.105`).

### **B. The Projector Display**
*This is the screen everyone sees.*
1.  Open a browser (Chrome/Edge/Firefox) on the computer connected to the projector.
2.  Go to: `http://<HOST_IP_ADDRESS>:8000/display`
    *   *Example: http://192.168.1.105:8000/display*
3.  Press **F11** to go Full Screen.

### **C. The Admin Dashboard**
*This is for the moderator to approve photos.*
1.  On the Host Computer (or a trusted tablet), go to: `http://localhost:8000/admin`
2.  **Settings**:
    *   **Guest URL**: Enter your Ngrok URL (e.g., `https://my-wedding.ngrok-free.app`) to generate the correct QR code.
    *   **Auto-Approve**: Toggle this ON to let photos and messages go to screen immediately without review.
    *   **Show QR on Screen**: Toggle this ON to display the join QR code in the bottom-left of the projector screen.
3.  **Approve** photos/messages manually if Auto-Approve is OFF.
4.  **Delete** inappropriate content.
5.  **EMERGENCY STOP**: Click "Clear Danmu" to instantly wipe flying text from the screen.

### **D. Guest Access**
*Guests use this to send messages and photos.*
1.  Guests must connect to the **same Wi-Fi network**.
2.  They should open their phone browser and go to: `http://<HOST_IP_ADDRESS>:8000/guest`
    *   *Tip: You can generate a QR Code for this URL and print it on table cards!*

## ⚠️ Troubleshooting

**Q: Guests cannot connect to the page.**
*   **Check Wi-Fi**: Are they on the same network?
*   **Firewall**: Windows Firewall might block the connection. Allow "Python" or port 8000 if prompted, or temporarily disable the firewall for the event.
*   **Correct IP**: Double-check the IP address from `ipconfig`. It can change if the router restarts.

**Q: Photos are not appearing on the display.**
*   Did you click **Approve** in the Admin Dashboard? Only approved photos appear.
*   The slideshow loops. Wait a few seconds for the new photo to cycle in.

**Q: "Socket.IO" error or nothing happens.**
*   Check if you are completely offline. If so, you need to ensure `https://cdn.socket.io/...` in the HTML files is replaced with a local copy of the JS file.
