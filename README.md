# 🌟 MedSafety — Opioid Medication Overdose Risk Prediction  
### 🧠 AI-powered Clinical Decision Support System  
### 🔥 FastAPI + Machine Learning + React + Firebase

MedSafety is an intelligent medication-safety assistant that evaluates **opioid overdose risk** based on a patient’s medications, lifestyle factors, and clinical history.  
It uses a trained **Machine Learning model**, calculates **Daily MME**, visualizes risks, and provides **safety recommendations and monitoring guidelines**.

This full-stack project includes:

- ⚡ FastAPI backend with an ML model  
- 🧠 Python Logistic Regression model  
- 🎨 Beautiful React + TypeScript UI  
- ⛅ Firebase Authentication + Firestore database  
- 🎛️ Dynamic charts (Recharts)  
- 🌙 Full dark/light mode  
- 📌 Pinned analyses, history system, delete records  
- 💾 Save analysis directly from results page  

---

<br>

<div align="center">

## 🎥 **UI Preview**  
📊 Dashboard • 📈 Risk Charts • 💊 Form • 🗂️ History • ⚙️ Settings

</div>

---

# 🚀 Features

## 🧠 **Machine Learning-Based Risk Prediction**
- Logistic Regression model trained on clinical opioid risk indicators  
- Predicts overdose probability (0–100%)  
- Calculates **total daily MME** using opioid potency factors  
- Handles multiple medications  
- Dynamic contribution charts

## 💊 **Smart Medication Entry & MME Calculator**
- Add/remove medications  
- Prevents duplicates  
- Computes MME instantly  
- Auto-fills patient age & gender from profile  
- Back-button restores previous values  

## 🧾 **Professional Analysis Results**
- Combined “Risk & Medication Analysis” card  
- Side-by-side layout: risk score + charts  
- Pie chart (Safe vs Risk %)  
- Medication-specific MME contribution bar-chart  
- Risk interpretation alert  
- Clinical monitoring guidance  
- Practical safety tips + recommendations (dual-card layout)  
- **Clean Save button** (stores analysis to Firestore)

## 📚 **History Page (Fully Interactive)**
- Displays all saved analyses  
- Pinned analyses with dedicated toggle  
- Delete record (Trash-2 icon + confirmation popover)  
- **Right-side details panel stays fixed** (only left list scrolls)  
- Click any record to view risk charts, medications & total MME  

## 👤 **User Profile**
- Stores patient age, gender, height, weight  
- Auto-fills required form fields  
- Editable anytime  

## ⚙️ **Settings**
- Dark mode toggle (stored in localStorage)  
- Real-time toast message (“Dark mode activated”)  
- Notification toggle  
- Quick view of pinned analyses  

## 🌑 **Theme System**
- Fully synced dark/light UI  
- LocalStorage persistence  
- Smooth transition  
- Clean gradient & soft color system  

## 🔐 **Secure Data Handling**
- Firebase Authentication  
- Firestore database with user-specific data  
- Document IDs used for delete/update operations  
- CORS-protected FastAPI backend  

---

# 🏗️ System Architecture

                 ┌───────────────────────────┐
                 │     React Frontend        │
                 │  (TS + Tailwind + UI)     │
                 └───────────┬───────────────┘
                             │  Axios (JSON)
                             ▼
                  ┌────────────────────────┐
                  │     FastAPI Backend    │
                  │ • Predict overdose     │
                  │ • Calculate MME        │
                  │ • Save/Delete history  │
                  └───────────┬────────────┘
                              │
                 ┌────────────────────────────┐
                 │      Firebase Firestore    │
                 │  users / analyses records  │
                 └────────────────────────────┘


---

# 🤖 Machine Learning Model

### 📌 Model Used
- Logistic Regression (scikit-learn)  
- StandardScaler for feature normalization  
- Trained on 20+ opioid-related clinical features  

### 📥 Input Features
- Age, gender  
- Medical conditions (respiratory, liver, mental health…)  
- Concurrency (benzos, sedatives, antidepressants)  
- Daily opioid dosage  
- Daily MME  
- Primary opioid & potency factor  

### 📤 Output
```json
{
  "prediction": 1,
  "risk_probability": 0.78
}

