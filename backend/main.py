
# uvicorn main:app 
# npm run dev 
from fastapi import FastAPI, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import credentials, firestore, initialize_app
from pydantic import BaseModel
from middleware import add_cors_middleware
from fastapi.responses import JSONResponse
from typing import Optional, Any, Dict, List
from ml_model import predict_risk
import traceback

app = FastAPI()
add_cors_middleware(app)

# Initialize Firebase
cred = credentials.Certificate("D:/FINAL_PROJECT/serviceAccounKey.json.txt")
initialize_app(cred)
db = firestore.client()
users_ref = db.collection("users")
profiles_ref = db.collection("profiles")
analyses_ref = db.collection("analyses")

@app.middleware("http")
async def log_exceptions(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        print("\n🔥 GLOBAL ERROR 🔥")
        traceback.print_exc()
        raise e

class User(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class Profile(BaseModel):
    age: Optional[int] = None
    phn: Optional[str] = None
    name: Optional[str] = None
    gender: Optional[str] = None
    email: str
    medCond: Optional[str] = None
    allergy: Optional[str] = None
    doc: Optional[str] = None
    
class Analysis(BaseModel):
    email: str
    input_data: Optional[Dict[str, Any]] = {}
    result: Optional[Dict[str, Any]] = {}
    pinned: Optional[bool] = False
    summary: Optional[str] = None

class PatientData(BaseModel):
    age: int
    weight: int
    height: int
    gender: str
    medicalHistory: List[str]
    currentMedications: List[str]
    has_chronic_pain: bool
    has_mental_health_dx: bool
    history_of_substance_abuse: bool
    liver_disease: bool
    kidney_disease: bool
    respiratory_disease: bool
    treatment_duration_months: int
    concurrent_benzos: bool
    concurrent_muscle_relaxants: bool
    concurrent_sleep_meds: bool
    concurrent_antidepressants: bool
    tobacco_use: bool
    previous_overdose: bool
    alcohol_use: str
    primary_opioid: str
    daily_dosage_mg: int
    daily_mme: float
    risk_factors_count: int

@app.post("/predict")
async def predict(patient_data: Dict[str, Any] = Body(...)):
    try:
        print("➡️ POST /predict")
        print("Incoming data:", patient_data)

        # --- 1. Basic numeric normalization ---
        # Prefer explicit *_kg / *_cm, fall back to weight/height strings
        patient_data["weight_kg"] = int(patient_data.get("weight_kg") or patient_data.get("weight") or 0)
        patient_data["height_cm"] = int(patient_data.get("height_cm") or patient_data.get("height") or 0)

        # daily dosage, mme, risk factors
        patient_data["daily_dosage_mg"] = float(patient_data.get("daily_dosage_mg") or 0)
        patient_data["daily_mme"] = float(patient_data.get("daily_mme") or 0)
        patient_data["risk_factors_count"] = int(patient_data.get("risk_factors_count") or 0)

        # treatment duration
        try:
            patient_data["treatment_duration_months"] = int(patient_data.get("treatment_duration_months") or 0)
        except Exception:
            patient_data["treatment_duration_months"] = 0

        # --- 2. Normalize booleans ---
        bool_fields = [
            "has_chronic_pain",
            "has_mental_health_dx",
            "history_of_substance_abuse",   # ✅ make sure this is spelled EXACTLY like in training
            "liver_disease",
            "kidney_disease",
            "respiratory_disease",
            "concurrent_benzos",
            "concurrent_muscle_relaxants",
            "concurrent_sleep_meds",
            "concurrent_antidepressants",
            "tobacco_use",
            "previous_overdose",
        ]

        for key in bool_fields:
            value = patient_data.get(key)
            if isinstance(value, str):
                value = value.lower().strip()
                patient_data[key] = value in ["1", "true", "yes", "y", "t"]
            else:
                patient_data[key] = bool(value)

        # --- 3. Compute risk_factors_count if not provided ---
        if "risk_factors_count" not in patient_data or patient_data["risk_factors_count"] == 0:
            patient_data["risk_factors_count"] = sum(
                1 for key in bool_fields if patient_data.get(key)
            )

        # --- 4. Normalize categorical fields to match training ---

        # gender: training used "Female", "Male"
        gender_raw = str(patient_data.get("gender", "")).strip().lower()
        if gender_raw == "male":
            patient_data["gender"] = "Male"
        elif gender_raw == "female":
            patient_data["gender"] = "Female"
        else:
            patient_data["gender"] = "Female"  # or some default / majority class

        # alcohol_use: training used Heavy / Light / Moderate / nan
        alcohol_raw = str(patient_data.get("alcohol_use", "")).strip().lower()
        if alcohol_raw in ["none", "no", "nil"]:
            # choose how you want to treat this;
            # here I'll map to 'nan' which existed in training
            patient_data["alcohol_use"] = "nan"
        elif alcohol_raw == "light":
            patient_data["alcohol_use"] = "Light"
        elif alcohol_raw == "moderate":
            patient_data["alcohol_use"] = "Moderate"
        elif alcohol_raw == "heavy":
            patient_data["alcohol_use"] = "Heavy"
        else:
            patient_data["alcohol_use"] = "nan"

        # --- 5. Derive primary_opioid from currentMedications ---
        # Your model was trained with a single primary_opioid like "Morphine", not "A|B|C".
        opioid_name = None
        if isinstance(patient_data.get("currentMedications"), list):
            # Simple rule: pick the medication with highest "potency" or first in list
            meds = patient_data["currentMedications"]
            if meds:
                # if you have a potency field, you can do smarter logic here
                opioid_name = meds[-1].get("name") or meds[0].get("name")

        if not opioid_name:
            opioid_name = "Morphine"  # some default opioid from training

        patient_data["primary_opioid"] = opioid_name
        
        # --- 6. (Optional) estimate daily_mme if it's still zero ---
        mme_factors = {
            "Morphine": 1.0,
            "Hydrocodone": 1.0,
            "Oxycodone": 1.5,
            "Hydromorphone": 4.0,
            "Fentanyl": 100.0,
            "Codeine": 0.15,
            "Tramadol": 0.1,
        }
        total_mme = 0.0
        if isinstance(patient_data.get("currentMedications"), list):

            for m in patient_data["currentMedications"]:
                try:
                    name = m.get("name")
                    dose_mg = float(m.get("dosage") or 0)
                    freq = m.get("frequency", "").lower()
                    if freq == "once":
                        times_per_day = 1
                    elif freq == "twice":
                        times_per_day = 2
                    elif freq == "thrice":
                        times_per_day = 3
                    else:
                        times_per_day = 1

                    factor = mme_factors.get(name, 1.0)
                    total_mme += dose_mg * factor * times_per_day
                except Exception:
                    continue
            patient_data["daily_mme"] = total_mme
            
        # --- 7. Clean up transient fields so predict_risk gets only model-relevant keys ---
        med_contrib = []
        if isinstance(patient_data.get("currentMedications"), list):
            total_mme = patient_data["daily_mme"]
            for m in patient_data.get("currentMedications", []):
                try:
                    name = m.get("name")
                    dose = float(m.get("dosage") or 0)
                    freq = m.get("frequency", "").lower()

                    if freq == "once":
                        f = 1
                    elif freq == "twice":
                        f = 2
                    elif freq == "thrice":
                        f = 3
                    else:
                        f = 1

                    factor = mme_factors.get(name, 1.0)
                    med_mme = dose * factor * f

                    pct = (med_mme / total_mme * 100) if total_mme > 0 else 0
                    med_contrib.append({"name": name, "value": round(pct, 2)})
                except:
                    continue

            patient_data["medicine_contribution"] = med_contrib


        model_input = patient_data.copy()
        model_input.pop("currentMedications", None)
        model_input.pop("medicalHistory", None)
        model_input.pop("weight", None)
        model_input.pop("height", None)

        print("➡️ Calling ML model with:", model_input)

        # --- Call ML model ---
        result = predict_risk(model_input)
        print("⬅️ ML returned:", result)

        if "error" in result:
            print("🔥 ML error:", result["error"])
            return JSONResponse(status_code=500, content={"detail": result["error"]})

        result["daily_mme"] = patient_data.get("daily_mme", 0)
        result["medicine_contribution"] = patient_data.get("medicine_contribution", [])
        return {"status": "success", "prediction": result}

    except Exception as e:
        print("🔥 ERROR IN /predict:", e)
        print(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"detail": str(e), "traceback": traceback.format_exc()},
        )
    
@app.get("/")
def read_root():
    return {"message": "API running!"}

@app.get("/")
def home():
    return {"message": "CORS works fine!"}

@app.post("/add_user")
async def add_user(user: User = Body(...)):
    try:
        user_dict = user.dict()
        # Check if user already exists
        if users_ref.document(user.email).get().exists:
            return JSONResponse(status_code=400, content={"detail": "User with this email already exists"})
        users_ref.document(user.email).set(user_dict)
        return {"status": "success", "user": user_dict}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})
        
@app.get("/get_users")
def get_users():
    docs = users_ref.stream()
    users = [doc.to_dict() for doc in docs]
    return {"users": users}

@app.post("/login")
async def login(credentials: LoginRequest = Body(...)):
    try:
        doc = users_ref.document(credentials.email).get()
        if not doc.exists:
            return JSONResponse(status_code=401, content={"detail": "Invalid credentials"})
        user = doc.to_dict()
        if user.get("password") != credentials.password:
            return JSONResponse(status_code=401, content={"detail": "Invalid credentials"})
        # Remove password before returning
        user.pop("password", None)
        return {"status": "success", "user": user}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.get("/profile/{email}")
async def get_profile(email: str):
    try:
        doc = profiles_ref.document(email).get()
        if not doc.exists:
            return JSONResponse(status_code=404, content={"detail": "Profile not found"})
        return {"status": "success", "profile": doc.to_dict()}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.put("/profile/{email}")
async def upsert_profile(email: str, profile: Profile = Body(...)):
    try:
        profile_dict = profile.dict()
        # Ensure email in body matches URL id (or override)
        profile_dict["email"] = email
        profiles_ref.document(email).set(profile_dict, merge=True)
        return {"status": "success", "profile": profile_dict}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.post("/analysis")
async def save_analysis(analysis: Analysis = Body(...)):
    try:
        data = analysis.dict()
        data["created_at"] = firestore.SERVER_TIMESTAMP

        # ✅ Validation
        if not data.get("email"):
            return JSONResponse(status_code=400, content={"detail": "Missing email"})
        if not data.get("input_data"):
            return JSONResponse(status_code=400, content={"detail": "Missing input data"})
        if not data.get("result"):
            return JSONResponse(status_code=400, content={"detail": "Missing analysis result"})

        # ✅ Firestore .add() returns (write_result, reference)
        _, doc_ref = analyses_ref.add(data)

        return {
            "status": "success",
            "id": doc_ref.id,
            "message": "Analysis saved successfully"
        }

    except Exception as e:
        print(f"🔥 Error in /analysis: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "detail": f"Error saving analysis: {str(e)}"
            }
        )


@app.get("/analysis/{email}")
async def get_user_analysis(email: str):
    try:
        # Simple query without ordering
        query = analyses_ref.where("email", "==", email)
        docs = query.stream()
        
        results = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            
            # Handle timestamp conversion safely
            if "created_at" in data and data["created_at"] is not None:
                try:
                    data["created_at"] = {"seconds": int(data["created_at"].timestamp())}
                except (AttributeError, TypeError):
                    from datetime import datetime
                    data["created_at"] = {"seconds": int(datetime.now().timestamp())}
            else:
                # If no timestamp, use current time
                from datetime import datetime
                data["created_at"] = {"seconds": int(datetime.now().timestamp())}
            
            results.append(data)
        
        # Sort in memory by timestamp (newest first)
        results.sort(key=lambda x: x["created_at"]["seconds"], reverse=True)
        
        return {"analyses": results}
    except Exception as e:
        print(f"Error in get_user_analysis: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Failed to fetch analyses",
                "error": str(e)
            }
        )

@app.put("/analysis/{analysis_id}/pin")
async def pin_analysis(analysis_id: str, payload: Dict[str, bool] = Body(...)):
    try:
        pin = bool(payload.get("pinned", True))
        analyses_ref.document(analysis_id).update({"pinned": pin})
        return {"status": "success", "pinned": pin}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.get("/analysis/pinned/{email}")
def get_pinned_analysis(email: str):
    try:
        # no order_by → avoid Firestore index requirement
        query = analyses_ref.where("email", "==", email).where("pinned", "==", True)
        docs = query.stream()

        results = []
        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id

            # timestamp normalization
            if "created_at" in data and hasattr(data["created_at"], "timestamp"):
                data["created_at"] = {"seconds": int(data["created_at"].timestamp())}

            results.append(data)

        # sort manually in Python
        results.sort(key=lambda x: x["created_at"]["seconds"], reverse=True)

        return {"analyses": results}

    except Exception as e:
        print("🔥 ERROR in /analysis/pinned:", str(e))
        return JSONResponse(status_code=500, content={"detail": str(e)})


@app.middleware("http")
async def log_requests(request, call_next):
    print("➡️", request.method, request.url)
    response = await call_next(request)
    print("⬅️", response.status_code)
    return response
