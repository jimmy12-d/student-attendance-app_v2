# Contact Tasks Deployment Checklist

## Pre-Deployment

- [x] ContactTask interface added to `_interfaces/index.ts`
- [x] ContactTasksTable component created with all features
- [x] Page.tsx updated with task management functionality
- [x] Firestore security rules added for contactTasks
- [x] Firestore composite indexes added
- [x] Documentation created (setup guide, UI reference, summary)

## Deployment Steps

### 1. Code Deployment

```bash
# 1. Build the Next.js application
npm run build

# 2. Test the build locally (optional)
npm run start

# 3. Deploy to your hosting platform
# For Vercel:
vercel deploy --prod

# For Firebase Hosting:
firebase deploy --only hosting
```

### 2. Firebase Rules Deployment

```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules
```

**Expected Output:**
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project/overview
```

### 3. Firebase Indexes Deployment

```bash
# Deploy Firestore indexes
firebase deploy --only firestore:indexes
```

**Expected Output:**
```
✔ Deploy complete!

Index builds may take a few minutes to complete.
```

⏳ **Wait 5-10 minutes** for indexes to build before testing.

### 4. Verify Firebase Console

Visit Firebase Console → Firestore Database

**Check Security Rules:**
1. Go to "Rules" tab
2. Verify `contactTasks` rule exists:
```javascript
match /contactTasks/{taskId} {
  allow read, write: if isAuthorizedUser();
}
```

**Check Indexes:**
1. Go to "Indexes" tab
2. Verify 4 composite indexes for `contactTasks`:
   - `createdAt` (descending)
   - `status` + `createdAt`
   - `taskType` + `createdAt`
   - `assignedTo` + `createdAt`
3. All should show status: **Enabled** (green checkmark)

## Post-Deployment Testing

### Test Checklist

#### 1. Page Access
- [ ] Navigate to `/dashboard/to-do`
- [ ] Page loads without errors
- [ ] Info banner displays correctly
- [ ] "Generate New Tasks" button is visible

#### 2. Task Generation
- [ ] Click "Generate New Tasks"
- [ ] Button shows "Generating..." state
- [ ] Tasks appear in the table
- [ ] Check consecutive absence tasks are created
- [ ] Check warning student tasks are created
- [ ] Verify no duplicate tasks for same student

#### 3. Filtering
- [ ] Filter by status (contacted/waiting/done)
- [ ] Filter by task type (consecutive/warning)
- [ ] Filter by assignee (Jimmy/Jon/Jasper/Jason)
- [ ] Task count updates correctly
- [ ] Clear filters returns all tasks

#### 4. Sorting
- [ ] Click "Student Info" header - sorts by name
- [ ] Click "Created" header - sorts by date
- [ ] Toggle sort order (ascending/descending)
- [ ] Verify sort indicator appears

#### 5. Status Updates
- [ ] Click status dropdown in table row
- [ ] Select different status
- [ ] Status updates immediately
- [ ] Selecting "Done" records completion timestamp
- [ ] Verify in Firebase Console data is saved

#### 6. Task Editing
- [ ] Click Edit (pencil) icon
- [ ] Row switches to edit mode
- [ ] Edit reason field (textarea)
- [ ] Change assigned staff member
- [ ] Change status via dropdown
- [ ] Click Save - changes persist
- [ ] Click Cancel - reverts changes
- [ ] Check Firebase Console for updates

#### 7. Task Deletion
- [ ] Click Delete (trash) icon
- [ ] Confirmation dialog appears
- [ ] Click "Delete" - task removed
- [ ] Click "Cancel" - task remains
- [ ] Verify in Firebase Console task is deleted

#### 8. Student Details Integration
- [ ] Click student name (blue link)
- [ ] Student details modal opens
- [ ] Modal shows correct student info
- [ ] Close modal returns to tasks table
- [ ] Context is preserved (filters, etc.)

#### 9. Summary Statistics
- [ ] Statistics cards display at bottom
- [ ] Counts match filtered tasks
- [ ] All 4 cards show correct numbers:
  - Contacted count
  - Waiting count
  - Done count
  - Total count

#### 10. Responsive Design
- [ ] Test on desktop (>1024px width)
- [ ] Test on tablet (768-1024px)
- [ ] Test on mobile (<768px)
- [ ] Table scrolls horizontally on small screens
- [ ] All buttons remain accessible
- [ ] Text is readable at all sizes

#### 11. Dark Mode
- [ ] Toggle dark mode
- [ ] All elements visible in dark mode
- [ ] Colors remain distinguishable
- [ ] Badges maintain readability
- [ ] Hover states work correctly

#### 12. Performance
- [ ] Page loads in < 2 seconds
- [ ] Filtering is instant
- [ ] Sorting is instant
- [ ] Status updates < 500ms
- [ ] No lag when scrolling table
- [ ] Firebase listeners update in real-time

## Troubleshooting

### Issue: "Permission Denied" errors

**Solution:**
```bash
# Re-deploy Firestore rules
firebase deploy --only firestore:rules

# Verify user has admin role
# Check Firebase Console → Firestore → authorizedUsers collection
```

### Issue: "Index Required" errors

**Solution:**
```bash
# Re-deploy indexes
firebase deploy --only firestore:indexes

# Wait 10 minutes for indexes to build
# Check Firebase Console → Firestore → Indexes tab
```

### Issue: Tasks not generating

**Diagnostic Steps:**
1. Open browser console (F12)
2. Click "Generate New Tasks"
3. Check for JavaScript errors
4. Verify students collection has data
5. Verify attendance records exist
6. Check allClassConfigs is loaded

**Common Causes:**
- No students with consecutive absences
- No warning students currently absent
- Tasks already exist (no duplicates created)
- Missing attendance data
- Missing class configurations

### Issue: Real-time updates not working

**Solution:**
1. Check Firebase Console → Authentication (user is logged in)
2. Verify Firestore listeners are active (check Network tab)
3. Clear browser cache and reload
4. Check for console errors

### Issue: Filters not working

**Solution:**
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check that tasks have all required fields
4. Verify filter state in React DevTools

## Rollback Plan

If critical issues occur:

### Option 1: Revert Code
```bash
# If using Git
git revert HEAD
git push

# Redeploy previous version
npm run build
firebase deploy --only hosting
```

### Option 2: Keep Data, Revert UI
1. Leave `contactTasks` collection intact
2. Revert page.tsx to previous version
3. Users lose new UI but data is preserved
4. Can re-deploy when issues are fixed

### Option 3: Full Rollback
```bash
# Remove Firestore rules for contactTasks
# Remove indexes from firestore.indexes.json
firebase deploy --only firestore:rules,firestore:indexes

# Delete contactTasks collection from Firebase Console
# Revert all code changes
```

## Success Criteria

Deployment is successful when:

- ✅ Page loads without errors
- ✅ Tasks can be generated automatically
- ✅ All CRUD operations work (Create, Read, Update, Delete)
- ✅ Filtering and sorting function correctly
- ✅ Status updates save to Firebase
- ✅ Real-time updates work across tabs
- ✅ No console errors
- ✅ Responsive design works on all devices
- ✅ Dark mode displays correctly
- ✅ Performance is acceptable (<2s load time)

## Communication

### Notify Staff

After successful deployment, send message:

```
📢 New Feature: Student Contact Task Management

The To-Do page has been upgraded! You can now:
✅ Track students needing follow-up
✅ Assign tasks to staff members
✅ Update contact status (Waiting → Contacted → Done)
✅ Filter and sort tasks
✅ Add notes and edit details

Access: Dashboard → To-Do List (Ctrl+T)

Training session: [Schedule a time]
Questions: [Your contact]
```

### User Training Topics

1. How to generate new tasks
2. Understanding task types (consecutive vs warning)
3. Assigning tasks to team members
4. Updating task status workflow
5. Using filters to focus on specific tasks
6. Adding notes and editing task details
7. Best practices for task management

## Monitoring

### First Week

Monitor daily for:
- Number of tasks generated
- Task completion rate
- User adoption (who's using it)
- Error rates in logs
- User feedback

### Metrics to Track

- Tasks generated per day
- Average time to completion
- Most common assignees
- Task type distribution (consecutive vs warning)
- Status change frequency

## Support

### Resources
- **Setup Guide**: CONTACT-TASKS-SETUP.md
- **UI Reference**: CONTACT-TASKS-UI-REFERENCE.md
- **Summary**: TO-DO-TRANSFORMATION-SUMMARY.md
- **Firebase Console**: https://console.firebase.google.com

### Common Questions

**Q: How do I generate tasks?**
A: Click the "Generate New Tasks" button at the top right.

**Q: Can I delete tasks?**
A: Yes, click the trash icon on any task. This is permanent.

**Q: What happens when I mark a task as "Done"?**
A: The completion timestamp is recorded and the task stays in the list (filter by "Done" to see it).

**Q: Can I edit tasks after creating them?**
A: Yes, click the pencil icon to edit reason, notes, assignee, or status.

**Q: How do I see only my tasks?**
A: Use the assignee filter dropdown and select your name.

---

## Sign-off

- [ ] Code deployed successfully
- [ ] Firebase rules deployed
- [ ] Firebase indexes built and enabled
- [ ] All tests passed
- [ ] Staff notified
- [ ] Documentation provided
- [ ] Monitoring in place

**Deployed by:** _________________  
**Date:** _________________  
**Time:** _________________  
**Version:** 1.0.0  

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
