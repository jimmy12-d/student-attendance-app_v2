# Distance-Based Face Recognition

## Overview

The system now includes **distance-based filtering** that only recognizes faces within an optimal range, approximately **1 meter** from the camera. This significantly improves recognition accuracy by filtering out faces that are too far away or too close.

## How It Works

### Face Size = Distance Approximation
- **Larger face bounding box** = Person is **closer** to camera
- **Smaller face bounding box** = Person is **farther** from camera
- **Optimal size range** = Best recognition accuracy

### Default Settings
- **Minimum Face Size**: 80px (maximum distance ~1.5 meters)
- **Maximum Face Size**: 300px (minimum distance ~0.5 meters)
- **Optimal Range**: 80-300px (approximately 0.5-1.5 meters)

## Visual Indicators

### Bounding Box Colors
| Color | Status | Meaning |
|-------|--------|---------|
| 🟢 **Green** | Recognized | Valid distance + successful recognition |
| 🔵 **Blue** | Recognizing | Valid distance + processing recognition |
| 🔴 **Red** | Unknown | Valid distance + no match found |
| 🟡 **Orange** | Distance Issue | Face too close or too far |
| ⚪ **Gray** | Detecting | Stabilizing detection |

### Distance Messages
- **"Too far (45px)"** - Move closer to camera
- **"Too close (350px)"** - Move back from camera
- **"Move closer"** - Guidance text below face
- **"Move back"** - Guidance text below face

## Configuration

### In System Settings Panel:

#### Distance Range Controls:
1. **Min Size (Far)**: 40-150px
   - Lower value = allows more distant faces
   - Higher value = requires closer faces

2. **Max Size (Near)**: 200-500px
   - Lower value = requires more distant faces
   - Higher value = allows closer faces

### Recommended Settings by Use Case:

#### **Doorway/Entrance** (Default):
- Min: 80px, Max: 300px
- Distance: ~0.5-1.5 meters
- Best for controlled entry points

#### **Classroom/Large Area**:
- Min: 60px, Max: 250px
- Distance: ~0.7-2 meters
- Allows slightly more distant recognition

#### **Close-up/Kiosk**:
- Min: 100px, Max: 400px
- Distance: ~0.3-1 meter
- For close interaction scenarios

#### **Security/Strict**:
- Min: 120px, Max: 250px
- Distance: ~0.7-1 meter
- Narrow range for highest accuracy

## Benefits

### 1. **Improved Accuracy**
- Eliminates low-quality distant faces
- Prevents oversized close-up faces
- Focuses on optimal recognition zone

### 2. **Reduced False Positives**
- Filters out unclear distant faces
- Prevents partial face recognition
- Better quality input = better matching

### 3. **User Guidance**
- Visual feedback for positioning
- Clear distance indicators
- Real-time guidance messages

### 4. **Performance Optimization**
- Fewer faces to process
- Focus computational resources on quality detections
- Faster overall recognition

## Technical Details

### Face Size Calculation:
```javascript
const faceSize = Math.max(width, height); // Use largest dimension
const isValidDistance = faceSize >= minFaceSize && faceSize <= maxFaceSize;
```

### Distance Estimation:
- **Approximate relationship**: Face size ∝ 1/distance
- **80px face** ≈ 1.5 meters away
- **150px face** ≈ 1 meter away
- **300px face** ≈ 0.5 meters away

### Camera Considerations:
- Values depend on camera resolution and field of view
- Higher resolution = larger face sizes at same distance
- Wide-angle lens = smaller face sizes at same distance

## Troubleshooting

### Common Issues:

#### **"All faces showing as too far"**:
- Lower the minimum face size
- Move camera closer to expected position
- Check camera resolution settings

#### **"All faces showing as too close"**:
- Increase the maximum face size
- Move camera further back
- Check for wide-angle lens distortion

#### **"Inconsistent distance detection"**:
- Ensure stable lighting conditions
- Check for camera auto-focus issues
- Verify consistent user positioning

### Calibration Steps:

1. **Position test person at optimal distance** (~1 meter)
2. **Note the face bounding box size** in console logs
3. **Set min/max around that size** (±50px range)
4. **Test with closer/farther positions**
5. **Adjust range based on results**

## Console Debugging

The system logs distance filtering information:
```
👁️ Face filtered out: size=45px (range: 80-300px)
📊 Face detection: 3 total, 2 within size range
✅ Valid distance: size=120px
⚠️ Invalid distance: size=350px (too close)
```

## Best Practices

### For Setup:
1. **Start with default settings** (80-300px)
2. **Test with actual users** in real conditions
3. **Adjust based on feedback** and accuracy
4. **Document final settings** for consistency

### For Users:
1. **Stand approximately 1 meter** from camera
2. **Watch for orange bounding boxes** (distance issues)
3. **Follow guidance messages** (move closer/back)
4. **Wait for green box** before expecting recognition

### For Administrators:
1. **Monitor distance filter logs** for patterns
2. **Adjust settings seasonally** (clothing thickness changes)
3. **Consider lighting conditions** in settings
4. **Train users on optimal positioning**

This distance-based filtering ensures that only faces within the optimal recognition range are processed, significantly improving both accuracy and user experience!
