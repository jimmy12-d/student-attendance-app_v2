# PrintNode Setup Guide

This guide will help you set up PrintNode for reliable remote printing with your Ricoh MP 3352 printer.

## 🚀 What is PrintNode?

PrintNode is a commercial service that enables reliable remote printing through API calls. Instead of relying on browser printing (which has many limitations), PrintNode provides:

- ✅ **Direct API printing** - No browser limitations
- ✅ **Cross-platform support** - Works on Windows, Mac, Linux
- ✅ **Reliable delivery** - Print jobs are queued and tracked
- ✅ **Real-time status** - Know if printers are online/offline
- ✅ **Print job tracking** - Monitor success/failure

## 📋 Setup Steps

### 1. Create PrintNode Account

1. Go to [https://app.printnode.com/register](https://app.printnode.com/register)
2. Sign up for a free account (includes 1,000 free prints/month)
3. Verify your email address

### 2. Get Your API Key

1. Login to PrintNode dashboard
2. Go to **Account** → **API Keys**
3. Copy your API key (format: `12345-67890-abcdef`)

### 3. Configure Environment Variables

Add your PrintNode API key to your environment file:

```bash
# In .env.local file:
PRINTNODE_API_KEY=your_printnode_api_key_here
```

**⚠️ Important:** Never commit your API key to version control!

### 4. Install PrintNode Client Software

Download and install the PrintNode client on the computer connected to your Ricoh MP 3352:

#### Windows
1. Download: [https://app.printnode.com/account/download](https://app.printnode.com/account/download)
2. Run the installer as Administrator
3. Login with your PrintNode credentials
4. The client will run in the system tray

#### Mac
1. Download the Mac client from PrintNode dashboard
2. Install and run the application
3. Login with your credentials
4. Grant necessary permissions for printer access

#### Linux
1. Download the Linux client
2. Install using package manager
3. Run as a service or daemon
4. Login with credentials

### 5. Verify Printer Connection

1. Make sure your Ricoh MP 3352 is:
   - ✅ Connected to the same network as the PrintNode client computer
   - ✅ Powered on and ready
   - ✅ Drivers installed on the client computer
   - ✅ Test print working locally

2. In PrintNode dashboard, go to **Printers**
3. You should see your Ricoh MP 3352 listed
4. Status should show as "Connected"

### 6. Test the Integration

1. Restart your web application to load the new environment variable
2. Go to the admin approvals page
3. The printer dropdown should now show PrintNode printers
4. Select your Ricoh MP 3352
5. Try approving a print request

## 🔧 Troubleshooting

### Printer Not Appearing
- Check PrintNode client is running
- Verify printer is connected and working locally
- Restart PrintNode client
- Check firewall settings

### Print Jobs Failing
- Verify printer is online in PrintNode dashboard
- Check PDF URLs are accessible
- Test with simple documents first
- Check PrintNode client logs

### API Key Issues
- Verify API key is correct in environment file
- Check for extra spaces or quotes
- Restart the web application after adding the key
- Test API key in PrintNode dashboard

### Connection Problems
- Check internet connection on client computer
- Verify PrintNode client can reach api.printnode.com
- Check corporate firewall settings
- Ensure PrintNode client is logged in

## 💰 Pricing

- **Free Tier:** 1,000 prints/month
- **Paid Plans:** Start at $9/month for more prints
- **Enterprise:** Custom pricing for high volume

See current pricing: [https://www.printnode.com/pricing](https://www.printnode.com/pricing)

## 📚 Additional Resources

- [PrintNode Documentation](https://www.printnode.com/docs)
- [API Reference](https://www.printnode.com/docs/api)
- [Support Center](https://support.printnode.com)
- [Community Forum](https://community.printnode.com)

## 🆘 Support

If you need help with PrintNode setup:

1. Check this guide first
2. Review PrintNode's support documentation
3. Contact PrintNode support (they're very responsive)
4. Check the application logs for error details

## ✅ Benefits Over Browser Printing

| Feature | Browser Printing | PrintNode |
|---------|------------------|-----------|
| Reliability | ❌ Inconsistent | ✅ Very reliable |
| User Interaction | ❌ Requires user action | ✅ Fully automatic |
| Cross-browser | ❌ Varies by browser | ✅ Browser independent |
| Print Settings | ❌ Manual configuration | ✅ API controlled |
| Error Handling | ❌ Limited feedback | ✅ Detailed status |
| Enterprise Ready | ❌ Not suitable | ✅ Production ready |

---

**Note:** This setup replaces the previous browser-based printing system with a more reliable, professional solution. 