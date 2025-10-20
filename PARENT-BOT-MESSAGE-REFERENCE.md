# 🤖 Parent Bot Message Quick Reference

## 📖 Standard Bot Info Message

### When to Use
Use `getParentBotInfoMessage()` for:
- ✅ Random/unknown text inputs
- ✅ Help command responses
- ✅ Help button callbacks
- ✅ Navigation back to main menu
- ✅ Any general info/help context

### Message Content (Khmer)
```
📖 ប្រព័ន្ធស្វ័យតាមដានការសិក្សាសិស្សសាលារ៉ដវែល

🤖 នេះគ្រាន់តែជាបត (Bot) ដែលផ្តល់ពត៌មានស្វ័យប្រវត្តិប៉ុណ្ណោះ មិនមែនជាមនុស្សទេ។ សូមចុចប៊ូតុងខាងក្រោមសម្រាប់ការតាមដាននានា។

💡 ប្រសិនបើបងត្រូវការជំនួយ សូមទាក់ទងមក
❤ - ក្រុមការងារ @RodwellLC096
❤ - គណៈគ្រប់គ្រង @RodwellLC076
☎️ - ទូរស័ព្ទ 096-763-9355 ឬ 076-763-9355
🏫 - អញ្ជើញមកសាលាផ្ទាល់ តាមអាស័យដ្ឋាន
📍 - https://maps.app.goo.gl/XqDs6RtHAM4yz4i16

👇 សូមចុចប៊ូតុងខាងក្រោម ដើម្បីរើសយកពត៌មានណាមួយ 👇
```

### English Translation
```
📖 Rodwell School Student Learning Tracking System

🤖 This is just a Bot that provides automated information only, not a human. Please click the buttons below for various tracking options.

💡 If you need help, please contact:
❤ - Staff Team: @RodwellLC096
❤ - Management: @RodwellLC076
☎️ - Phone: 096-763-9355 or 076-763-9355
🏫 - Visit the school directly at the address
📍 - https://maps.app.goo.gl/XqDs6RtHAM4yz4i16

👇 Please click the buttons below to select any information 👇
```

## 🎯 Menu Buttons (Always Included)

```javascript
getParentBotMenuKeyboard()
```

Returns:
- 📅 **ពិនិត្យវត្តមាន** (Check Attendance) → `check_attendance`
- 💰 **ពិនិត្យបង់ថ្លៃ** (Check Payment) → `check_payment`
- 📝 **លទ្ធផលប្រលង** (Exam Results) → `check_mock_exam`
- ❓ **ជំនួយ** (Help) → `show_help`

## 📝 Code Usage Examples

### 1. Send Message (New Conversation)
```javascript
await bot.sendMessage(chatId, getParentBotInfoMessage(), { 
    parse_mode: 'Markdown', 
    ...getParentBotMenuKeyboard() 
});
```

### 2. Edit Message (Callback Response)
```javascript
await bot.editMessageText(
    getParentBotInfoMessage(),
    {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        ...getParentBotMenuKeyboard()
    }
);
```

## 🔄 Current Implementation

### Text Message Handler
```javascript
if (text.startsWith('/start')) {
    // Registration flow
} else if (text === '/parent' || text === '/parentinfo') {
    // Parent info
} else if (text === '/help') {
    // Show info message
    await bot.sendMessage(chatId, getParentBotInfoMessage(), { 
        parse_mode: 'Markdown', 
        ...getParentBotMenuKeyboard() 
    });
} else {
    // Random text - show info message
    await bot.sendMessage(chatId, getParentBotInfoMessage(), { 
        parse_mode: 'Markdown', 
        ...getParentBotMenuKeyboard() 
    });
}
```

### Callback Query Handlers
```javascript
// Main help button
if (data === 'show_help') {
    await bot.editMessageText(getParentBotInfoMessage(), {...});
}

// Help menu help button
else if (data === 'help_help') {
    await bot.editMessageText(getParentBotInfoMessage(), {...});
}

// Calendar back button
else if (data === 'calendar_back') {
    await bot.editMessageText(getParentBotInfoMessage(), {...});
}
```

## 📊 User Flow

```
┌─────────────────────────────────────┐
│   User Sends Random Text            │
│   "hello", "hi", "ជំរាបសួរ", etc.   │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   Bot Responds with:                │
│   - Branded info message            │
│   - Contact information             │
│   - 4 interactive menu buttons      │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   User Clicks Button:               │
│   📅 Attendance / 💰 Payment        │
│   📝 Exam / ❓ Help                 │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   Bot Shows Requested Information   │
│   (with back/menu buttons)          │
└─────────────────────────────────────┘
```

## ✏️ Updating the Message

To update the message content, edit the `getParentBotInfoMessage()` function in `/functions/index.js`:

```javascript
const getParentBotInfoMessage = () => {
    return `📖 ប្រព័ន្ធស្វ័យតាមដានការសិក្សាសិស្សសាលារ៉ដវែល\n\n` +
           // ... rest of message
};
```

**Note:** Changes apply to ALL uses automatically:
- Random text responses
- Help command
- All help button callbacks
- Navigation back buttons

## 🧪 Testing Checklist

- [ ] Send random text → Receives info message with menu
- [ ] Send `/help` → Receives info message with menu
- [ ] Click ❓ help button → Shows info message with menu
- [ ] Navigate through calendar → Back button shows info message
- [ ] All contact links work (Telegram, phone, maps)
- [ ] Menu buttons function correctly
- [ ] Message displays correctly in Telegram
- [ ] Khmer text renders properly

## 📞 Contact Information Included

| Type | Contact | Purpose |
|------|---------|---------|
| 👥 Staff | @RodwellLC096 | General inquiries |
| 👨‍💼 Management | @RodwellLC076 | Administrative issues |
| ☎️ Phone 1 | 096-763-9355 | Direct call |
| ☎️ Phone 2 | 076-763-9355 | Alternate number |
| 📍 Location | Google Maps Link | School visit |

## 🎨 Message Structure

```
┌────────────────────────────────────────┐
│ 📖 Title/Header                        │
├────────────────────────────────────────┤
│ 🤖 Bot Disclaimer                      │
├────────────────────────────────────────┤
│ 💡 Contact Information Section:        │
│   - Staff contact                      │
│   - Management contact                 │
│   - Phone numbers                      │
│   - School address                     │
│   - Map link                           │
├────────────────────────────────────────┤
│ 👇 Call-to-Action                      │
└────────────────────────────────────────┘
         ⬇️ Menu Buttons ⬇️
┌──────────────┬──────────────┐
│ 📅 វត្តមាន   │ 💰 បង់ថ្លៃ   │
├──────────────┼──────────────┤
│ 📝 ប្រលង     │ ❓ ជំនួយ     │
└──────────────┴──────────────┘
```

---

**Last Updated:** October 20, 2025  
**Version:** 1.0  
**Status:** ✅ Active in Production
