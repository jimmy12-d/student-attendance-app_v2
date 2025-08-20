# Absent Student Follow-up System

This system provides comprehensive tracking and management of absent students with a step-by-step follow-up process.

## Features

### 🔄 Four-Step Follow-up Process
1. **Absent** - Initial status when student is marked absent
2. **Need to Contact** - Admin needs to contact parent/student  
3. **Waiting for Response** - Contact made, waiting for reply
4. **Resolved** - Issue resolved, student will return

### 🚨 Priority-Based Management
- **Urgent (Red)**: 3+ days absent with no follow-up
- **High Priority (Orange)**: 2+ days requiring contact
- **Medium Priority (Yellow)**: Following up, waiting for response  
- **Low Priority (Green)**: Recently resolved or new absences

### 📊 Admin Dashboard
- View all absent students organized by priority
- Filter by status and priority level
- Add notes for each follow-up step
- Real-time updates across admin accounts

## How It Works

### For Admins - Student List View

When viewing the student list, absent students will show an interactive status badge instead of the simple "Absent" label:

```
[Absent ▼] → Click to see dropdown with options:
├── Absent
├── Need to Contact  
├── Waiting for Response
└── Resolved
```

### For Admins - Follow-up Dashboard

Access via the "Absent Follow-ups" button in the Students page:

1. **Dashboard Overview**
   - See all follow-ups organized by priority
   - Urgent cases highlighted in red with animation
   - Filter by status or priority level

2. **Quick Actions**
   - Update status with single click
   - Add notes for important details
   - Track days since absence

3. **Priority Indicators**
   - 🚨 **Urgent**: 3+ days absent (red, animated)
   - ⚠️ **High**: Needs immediate attention (orange)
   - 📞 **Medium**: Follow-up in progress (yellow)
   - ✅ **Low**: Resolved or recent (green)

## Database Structure

### Collection: `absentFollowUps`

```javascript
{
  id: "auto-generated",
  studentId: "student_document_id",
  studentName: "Student Full Name", 
  date: "2025-08-18", // YYYY-MM-DD format
  status: "Absent" | "Need to Contact" | "Waiting for Response" | "Resolved",
  notes: "Optional notes about the follow-up",
  updatedAt: Timestamp,
  updatedBy: "Admin identifier"
}
```

## Workflow Example

### Day 1: Student is Absent
1. Student shows as "Absent" in student list
2. Admin clicks the status badge
3. System automatically creates follow-up record

### Day 2: Need to Contact
1. System shows as "High Priority" in dashboard
2. Admin calls parent, updates status to "Need to Contact"  
3. Adds note: "Called mother at 2pm, no answer"

### Day 3: Following Up
1. Admin tries again, reaches parent
2. Updates to "Waiting for Response"
3. Adds note: "Spoke with father, will call back tonight"

### Day 4: Resolution
1. Parent calls back with explanation
2. Admin updates to "Resolved"
3. Adds note: "Student was sick, returning tomorrow"

## Setup Instructions

### 1. Firestore Security Rules

Add to your `firestore.rules`:

```javascript
// Absent follow-ups collection
match /absentFollowUps/{document} {
  allow read, write: if request.auth != null && 
    exists(/databases/$(database)/documents/authorizedUsers/$(request.auth.uid));
}
```

### 2. Test Data (Optional)

To create sample data for testing:

```bash
# Run the sample data script
node scripts/create-sample-absent-followups.js
```

### 3. Admin Access

Only authorized admins can:
- View the follow-up dashboard
- Update absent statuses  
- Add notes to follow-ups

## Best Practices

### 📞 Contact Protocol
1. **Day 1**: Note absence, no immediate action needed
2. **Day 2**: First contact attempt via phone
3. **Day 3**: Second contact attempt, try different number
4. **Day 4+**: Urgent status, may require in-person visit

### 📝 Note Guidelines
- Include date/time of contact attempts
- Record who was contacted (mother/father/guardian)
- Note any explanations or commitments
- Track expected return dates

### 🚨 Escalation Process
- **3+ days absent**: Mark as urgent, involve senior staff
- **1 week absent**: Contact school administration
- **Extended absence**: May require home visit or formal intervention

## Technical Notes

### Real-time Updates
- Dashboard updates automatically when statuses change
- Multiple admins can work simultaneously
- Changes are immediately visible to all users

### Data Retention
- Follow-up records are kept for academic year
- Resolved cases remain visible for reference
- Historical patterns help identify chronic absence

### Integration
- Seamlessly integrates with existing attendance system
- Works with current permission and student management
- No disruption to existing workflows

## Troubleshooting

### Status Not Updating
1. Check internet connection
2. Refresh the page
3. Verify admin permissions

### Missing Students
1. Ensure student has "Absent" status today
2. Check if student is dropped or on waitlist
3. Verify date filters in dashboard

### Dashboard Not Loading
1. Check Firestore connection
2. Verify security rules are correct
3. Ensure user has admin permissions

## Support

For technical issues or feature requests:
- Check browser console for error messages
- Verify Firestore permissions and rules
- Test with sample data first
- Contact system administrator for database issues

---

This system helps schools maintain better communication with families and ensures no absent student falls through the cracks. The priority-based approach focuses attention on the most critical cases while providing comprehensive tracking for all absences.
