import os
import time
import tempfile
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from PIL import Image
import numpy as np
import base64
import io
from datetime import datetime, timedelta, timezone, date

from deepface import DeepFace
from google.cloud import storage
import firebase_admin
from firebase_admin import credentials, firestore, auth
from deepface.modules.verification import find_cosine_distance

# --- Configuration ---
# BUCKET_NAME is no longer needed for cache refresh, but might be useful elsewhere.
BUCKET_NAME = 'rodwell-attendance.firebasestorage.app'
# IMPORTANT: Replace with your actual Firebase Storage bucket name.
# You can find it in the Firebase console -> Storage.

# --- Firebase Initialization ---
try:
    # In Cloud Run, the service account is automatically available.
    # For local development, set the GOOGLE_APPLICATION_CREDENTIALS env var.
    cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred, {
        'storageBucket': BUCKET_NAME
    })
    db = firestore.client()
    print("Firebase Admin initialized successfully.")
except Exception as e:
    print(f"Error initializing Firebase Admin: {e}")
    db = None

storage_client = storage.Client()

app = Flask(__name__)
# Enable CORS with simplified configuration to avoid duplicate headers
CORS(app, 
     origins=['*'],
     methods=['GET', 'POST', 'OPTIONS'],
     allow_headers=['*'],
     supports_credentials=False)

# Remove the manual CORS handlers since Flask-CORS handles everything
# No need for @app.before_request and @app.after_request CORS handlers

# --- In-memory Cache for Enrolled Faces ---
# This will be a list of dicts: {'uid': student_uid, 'embedding': embedding_vector}
enrolled_embeddings_list = []
# Timestamp of the last cache refresh
last_cache_refresh = 0
CACHE_REFRESH_INTERVAL = 3600 # Refresh every hour (in seconds)


def refresh_enrolled_faces_cache():
    """
    Loads pre-computed facial embeddings directly from the 'facialEmbeddings'
    field in each student's Firestore document.
    """
    global enrolled_embeddings_list, last_cache_refresh
    print("\n" + "="*50)
    print("🔄 REFRESHING FACE EMBEDDINGS CACHE")
    print("="*50)

    if not db:
        print("❌ Firestore client not available. Skipping cache refresh.")
        return

    try:
        temp_embeddings_list = []
        # Query for all students that have the 'facialEmbeddings' field.
        students_ref = db.collection('students').where("facialEmbeddings", "!=", [])
        students = students_ref.stream()

        for student in students:
            student_uid = student.id
            student_data = student.to_dict()
            stored_embeddings = student_data.get("facialEmbeddings", [])
            auth_uid = student_data.get("authUid") # <-- Get the authUid

            # We must have an authUid to perform the final lookup
            if not auth_uid:
                print(f"DEBUG: Skipping student {student_uid} because they are missing an authUid.")
                continue
            
            # A student can have multiple embeddings. We need to cache all of them.
            for embedding_obj in stored_embeddings:
                if isinstance(embedding_obj, dict) and 'embedding' in embedding_obj:
                    embedding_vector = embedding_obj['embedding']
                    # The 'identity' key is what DeepFace.find returns, so we use 'uid' for that.
                    temp_embeddings_list.append({
                        "uid": auth_uid, # <-- Store the auth_uid in the cache
                        "embedding": embedding_vector
                    })
                    print(f"Cached embedding for student doc {student_uid} with authUid {auth_uid}")

        # DeepFace.find requires a specific format for its database path.
        # It expects a list of lists, where each inner list is [identity_path, embedding_vector].
        enrolled_embeddings_list = temp_embeddings_list
        last_cache_refresh = time.time()
        
        print(f"✅ Cache refresh completed!")
        print(f"📊 Total students cached: {len(enrolled_embeddings_list)}")
        print("="*50 + "\n")

    except Exception as e:
        print(f"❌ Error during cache refresh: {e}")
        traceback.print_exc()

# --- Utility Functions ---
def verify_firebase_token(request):
    """Verify Firebase ID token from the Authorization header."""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    id_token = auth_header.split('Bearer ')[1]
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"Token verification failed: {e}")
        return None

# --- Populate cache on startup ---
with app.app_context():
    refresh_enrolled_faces_cache()

# --- API Routes ---
@app.route('/recognize', methods=['POST'])
@cross_origin()
def recognize_face():
    """
    Receives a base64 encoded image, recognizes the face,
    and returns student information.
    """
    # 1. Authorize the request
    decoded_token = verify_firebase_token(request)
    if not decoded_token:
        return jsonify({'error': 'Unauthorized request. Invalid or missing token.'}), 403

    # 2. Check and refresh cache if needed
    if time.time() - last_cache_refresh > CACHE_REFRESH_INTERVAL:
        refresh_enrolled_faces_cache()

    if not enrolled_embeddings_list:
        return jsonify({'error': 'No enrolled faces found in Firestore. Please enroll students first.'}), 500

    # 3. Process the incoming image
    data = request.get_json()
    if 'image' not in data:
        return jsonify({'error': 'Missing image data in request.'}), 400

    try:
        image_data = base64.b64decode(data['image'])
        img_array = np.array(Image.open(io.BytesIO(image_data)))

        # 4. Generate embedding for the incoming face using SFace with more efficient detection
        live_embedding_obj = None
        # Prioritize faster detectors first, then fall back to more robust ones
        detection_backends = ['opencv', 'ssd', 'mtcnn', 'retinaface']
        
        for backend in detection_backends:
            try:
                print(f"DEBUG: Trying face detection with {backend}...")
                live_embedding_obj = DeepFace.represent(
                    img_path=img_array,
                    model_name='SFace',
                    enforce_detection=True,
                    detector_backend=backend
                )
                print(f"DEBUG: ✅ Face detection succeeded with {backend}")
                break
            except Exception as detection_error:
                print(f"DEBUG: ❌ Face detection failed with {backend}: {detection_error}")
                continue
        
        # If all detectors with enforcement failed, try without enforcement using fastest detector
        if not live_embedding_obj:
            try:
                print("DEBUG: Trying face detection without enforcement using opencv...")
                live_embedding_obj = DeepFace.represent(
                    img_path=img_array,
                    model_name='SFace',
                    enforce_detection=False,
                    detector_backend='opencv'
                )
                print("DEBUG: ✅ Face detection succeeded without enforcement")
            except Exception as fallback_error:
                print(f"DEBUG: ❌ All face detection methods failed: {fallback_error}")
                return jsonify({'status': 'no_face_detected', 'message': 'No clear face detected. Please face the camera directly with good lighting.'}), 200

        if not live_embedding_obj or 'embedding' not in live_embedding_obj[0]:
            return jsonify({'status': 'no_face_detected', 'message': 'Could not create an embedding for the detected face.'}), 200

        live_embedding = live_embedding_obj[0]['embedding']
        
        # 4.5. Enhanced quality check - if ALL distances are very high, suggest retry
        quick_distances = []
        # Sample more faces for better quality assessment, but limit to 5 for speed
        sample_size = min(5, len(enrolled_embeddings_list))
        for enrolled_face in enrolled_embeddings_list[:sample_size]:
            enrolled_embedding = enrolled_face['embedding']
            distance = find_cosine_distance(live_embedding, enrolled_embedding)
            quick_distances.append(distance)
        
        avg_distance = sum(quick_distances) / len(quick_distances) if quick_distances else 1.0
        print(f"DEBUG: Enhanced quality check - Average distance from {sample_size} samples: {avg_distance:.4f}")
        
        # More lenient quality check - only reject very poor quality images
        if avg_distance > 0.90:
            return jsonify({
                'status': 'poor_quality', 
                'message': f'Image quality too poor (avg: {avg_distance:.2f}). Please ensure good lighting and face camera directly.'
            }), 200

        # 5. Manually find the best match from our cached embeddings
        best_match_uid = None
        # The threshold for SFace - slightly more lenient for better recognition
        # while still maintaining security. Updated to 0.68 for better matching.
        # Updated: 2025-08-18 - Changed from 0.65 to 0.68 for better recognition accuracy
        smallest_distance = 0.68
        print("DEBUG: ===== FACE RECOGNITION v2.2 - 2025-08-18 OPTIMIZED =====")
        print("DEBUG: Starting face comparison against cache...")
        print(f"DEBUG: Using threshold: {smallest_distance:.4f}")
        print(f"DEBUG: Total enrolled faces in cache: {len(enrolled_embeddings_list)}")
        
        # Store all comparisons for detailed logging
        all_comparisons = []

        for enrolled_face in enrolled_embeddings_list:
            enrolled_embedding = enrolled_face['embedding']
            distance = find_cosine_distance(live_embedding, enrolled_embedding)
            
            # Store comparison details
            comparison_info = {
                'uid': enrolled_face['uid'],
                'distance': distance,
                'is_best_so_far': distance < smallest_distance
            }
            all_comparisons.append(comparison_info)
            
            print(f"DEBUG: Comparing with UID {enrolled_face['uid']}. Distance: {distance:.4f}")

            if distance < smallest_distance:
                print(f"DEBUG: ⭐ NEW BEST MATCH! UID: {enrolled_face['uid']}, Distance: {distance:.4f} (Previous best: {smallest_distance:.4f})")
                smallest_distance = distance
                best_match_uid = enrolled_face['uid']
        
        # Enhanced debugging output
        print("\n" + "="*60)
        print("🔍 FACE RECOGNITION COMPARISON SUMMARY - v2.2 OPTIMIZED")
        print("="*60)
        print(f"📊 Total students compared: {len(all_comparisons)}")
        print(f"🎯 Recognition threshold: {0.68:.4f}")
        print(f"🏆 Best match distance: {smallest_distance:.4f}")
        print(f"✅ Match found: {'YES' if best_match_uid else 'NO'}")
        print(f"🕐 Timestamp: {datetime.now().isoformat()}")
        print("🚀 OPTIMIZED VERSION - Improved Quality & Reduced API Calls")
        
        if best_match_uid:
            print(f"👤 Best match UID: {best_match_uid}")
        
        # Show top 3 closest matches for debugging
        all_comparisons.sort(key=lambda x: x['distance'])
        print(f"\n🥇 TOP 3 CLOSEST MATCHES:")
        for i, comp in enumerate(all_comparisons[:3]):
            status = "✅ RECOGNIZED" if comp['distance'] < 0.68 else "❌ TOO FAR"
            print(f"   {i+1}. UID: {comp['uid'][:8]}... | Distance: {comp['distance']:.4f} | {status}")
        
        print("="*60 + "\n")
        
        if not best_match_uid:
            # Show why no match was found
            closest_distance = all_comparisons[0]['distance'] if all_comparisons else 'N/A'
            closest_uid = all_comparisons[0]['uid'][:8] + '...' if all_comparisons else 'N/A'
            return jsonify({
                'status': 'unknown', 
                'message': f'No confident match found. Closest: {closest_distance:.4f} (UID: {closest_uid}), Threshold: 0.68'
            }), 200

        # 6. Fetch student data from Firestore using the authUid
        print(f"🔍 DEBUG: Found best match! Fetching student data for authUid: {best_match_uid}")
        student_query = db.collection('students').where("authUid", "==", best_match_uid).limit(1)
        student_snapshot = student_query.get()

        if not student_snapshot:
             print(f"❌ DEBUG: Firestore lookup FAILED. No document found for authUid: {best_match_uid}")
             return jsonify({'status': 'unknown', 'message': f'Matching face found but no student record for authUid {best_match_uid}.'}), 200
        
        student_doc = student_snapshot[0]
        student_data = student_doc.to_dict()
        student_name = student_data.get('fullName', 'Unknown Student')
        student_class = student_data.get('class', 'Unknown Class')
        student_phone = student_data.get('phone', 'No Phone')
        
        print(f"✅ DEBUG: Firestore lookup SUCCEEDED!______@s")
        print(f"   📋 Document ID: {student_doc.id}")
        print(f"   👤 Student Name: {student_name}")
        print(f"   📚 Class: {student_class}")
        print(f"   📱 Phone: {student_phone}")
        print(f"   🎯 Recognition Distance: {smallest_distance:.4f}")
        print(f"   🆔 Auth UID: {best_match_uid}")
        student_doc_id = student_doc.id # Get the actual document ID for the response

        # --- New Attendance Logic with Firestore Read/Write ---
        attendance_status = "present" # Default
        try:
            today_str = date.today().isoformat()
            
            # 1. Check if attendance for today already exists
            attendance_ref = db.collection("attendance")
            query = attendance_ref.where("authUid", "==", best_match_uid).where("date", "==", today_str).limit(1)
            existing_attendance_docs = list(query.stream())

            if existing_attendance_docs:
                # Record exists, use its status and don't write a new one
                existing_data = existing_attendance_docs[0].to_dict()
                attendance_status = existing_data.get("status", "present")
                print(f"DEBUG: Found existing attendance for {student_name}. Status: {attendance_status}")
            else:
                # No record exists, so calculate status and then create a new record
                print(f"DEBUG: No existing attendance for {student_name}. Calculating and writing new record...")
                
                # 2. Load class configurations from Firestore
                print(f"DEBUG: Loading class configurations from Firestore...")
                classes_ref = db.collection("classes")
                classes_snapshot = classes_ref.stream()
                class_configs = {}
                for class_doc in classes_snapshot:
                    class_configs[class_doc.id] = class_doc.to_dict()
                print(f"DEBUG: Loaded {len(class_configs)} class configurations")
                
                # 3. Determine student's class and shift
                student_class_str = student_data.get("class")
                student_shift_str = student_data.get("shift")
                print(f"DEBUG: Student {student_name} - Class: {student_class_str}, Shift: {student_shift_str}")

                if student_class_str and student_shift_str:
                    student_class_key = student_class_str.replace("Class ", "")
                    class_config = class_configs.get(student_class_key)
                    print(f"DEBUG: Looking for class config with key: {student_class_key}")
                    print(f"DEBUG: Available class keys: {list(class_configs.keys())}")
                    print(f"DEBUG: Found class config: {class_config is not None}")
                    
                    shift_config = class_config.get("shifts", {}).get(student_shift_str) if class_config else None
                    print(f"DEBUG: Found shift config: {shift_config is not None}")
                    if shift_config:
                        print(f"DEBUG: Shift config: {shift_config}")

                    # 4. Calculate late status
                    if shift_config and "startTime" in shift_config:
                        start_hour, start_minute = map(int, shift_config["startTime"].split(':'))
                        
                        phnom_penh_tz = timezone(timedelta(hours=7))
                        now_phnom_penh = datetime.now(phnom_penh_tz)
                        
                        shift_start_time = now_phnom_penh.replace(hour=start_hour, minute=start_minute, second=0, microsecond=0)

                        # 5. Handle grace period (more robustly)
                        grace_minutes = 15 # Default
                        # Check for both 'gracePeriodMinutes' and a common typo 'gradePeriodMinutes'
                        student_grace_period = student_data.get("gracePeriodMinutes") or student_data.get("gradePeriodMinutes")

                        if student_grace_period is not None:
                            try:
                                # This handles both numbers (int, float) and strings like "30"
                                grace_minutes = int(float(student_grace_period))
                            except (ValueError, TypeError):
                                print(f"WARN: Could not parse grace period '{student_grace_period}' for {student_name}. Using default.")

                        on_time_deadline = shift_start_time + timedelta(minutes=grace_minutes)

                        if now_phnom_penh > on_time_deadline:
                            attendance_status = "late"
                            
                        print(f"DEBUG: Attendance calculation for {student_name}:")
                        print(f"DEBUG: - Current time (Phnom Penh): {now_phnom_penh}")
                        print(f"DEBUG: - Shift start time: {shift_start_time}")
                        print(f"DEBUG: - Grace period: {grace_minutes} minutes")
                        print(f"DEBUG: - On-time deadline: {on_time_deadline}")
                        print(f"DEBUG: - Final status: {attendance_status}")
                    else:
                        print(f"DEBUG: Cannot calculate late status - missing shift start time")
                        if not shift_config:
                            print(f"DEBUG: No shift config found for shift '{student_shift_str}'")
                        else:
                            print(f"DEBUG: Shift config exists but missing startTime: {shift_config}")
                else:
                    print(f"DEBUG: Student {student_name} is missing class or shift information.")

                # Write the new attendance record to Firestore
                admin_email = decoded_token.get("email", "unknown_admin")
                new_record = {
                    "studentId": student_doc_id, "authUid": best_match_uid,
                    "studentName": student_name, "class": student_data.get("class"),
                    "shift": student_data.get("shift"), "status": attendance_status,
                    "date": today_str, "timestamp": firestore.SERVER_TIMESTAMP,
                    "scannedBy": f"Face Recognition by {admin_email}"
                }
                db.collection("attendance").add(new_record)
                print(f"DEBUG: Successfully wrote new attendance record for {student_name} with status: {attendance_status}")

        except Exception as e:
            print(f"ERROR: Could not calculate or write attendance status: {e}")
            traceback.print_exc()
        # --- End of New Attendance Logic ---

        # This is where you would add your attendance marking logic.
        # For now, we just return the recognized student's info.
        
        return jsonify({
            'status': 'recognized',
            'message': f'Welcome, {student_name}!',
            'studentName': student_name,
            'studentUid': student_doc_id, # Return the document ID
            'attendanceStatus': attendance_status
        }), 200

    except ValueError as ve:
        # This error is often thrown by DeepFace if no face is detected in the input image.
        print(f"Face detection error: {ve}")
        return jsonify({'status': 'no_face_detected', 'message': 'Could not detect a face in the provided image.'}), 200
    except Exception as e:
        print(f"An error occurred during recognition: {e}")
        traceback.print_exc()
        return jsonify({'error': 'An internal server error occurred.'}), 500


@app.route('/generate-embedding', methods=['POST'])
@cross_origin()
def generate_embedding():
    """
    Receives an image (as base64 string), calculates its FaceNet embedding,
    and returns it. This is used by the enrollment Cloud Function.
    """
    # Security: In a production environment, you would want to secure this
    # endpoint, for example, by checking for a secret header or an
    # service-to-service authentication token.
    data = request.get_json()
    if 'image' not in data:
        return jsonify({'error': 'Missing image data in request.'}), 400

    try:
        image_data = base64.b64decode(data['image'])
        img_array = np.array(Image.open(io.BytesIO(image_data)))

        # Use enforce_detection=False because we trust the enrollment photos
        # are cropped and contain a face.
        embedding_obj = DeepFace.represent(
            img_path=img_array,
            model_name='SFace',
            enforce_detection=False
        )
        
        if not embedding_obj or 'embedding' not in embedding_obj[0]:
            return jsonify({'error': 'Could not generate embedding.'}), 500

        # Return just the vector
        return jsonify({'embedding': embedding_obj[0]['embedding']}), 200

    except Exception as e:
        print(f"An error occurred during embedding generation: {e}")
        traceback.print_exc()
        return jsonify({'error': 'An internal server error occurred during embedding generation.'}), 500


@app.route('/health', methods=['GET'])
@cross_origin()
def health_check():
    """A simple health check endpoint."""
    return "OK", 200

if __name__ == '__main__':
    # This is used for local development.
    # Gunicorn will be used in production on Cloud Run.
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080))) 