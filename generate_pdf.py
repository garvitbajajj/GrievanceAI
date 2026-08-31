import os
import sys
import subprocess

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    from reportlab.lib import colors
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "reportlab"])
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    from reportlab.lib import colors

def create_handbook(output_path):
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter
    
    # Title
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(colors.HexColor("#1a237e"))
    c.drawString(50, height - 80, "BhashaFlow User Handbook")
    
    # Subtitle
    c.setFont("Helvetica", 14)
    c.setFillColor(colors.HexColor("#ff9933"))
    c.drawString(50, height - 110, "Empowering Multilingual Civic Engagement")
    
    # Content
    c.setFont("Helvetica", 12)
    c.setFillColor(colors.black)
    text = c.beginText(50, height - 160)
    
    lines = [
        "Welcome to BhashaFlow!",
        "",
        "This platform is designed to bridge the gap between citizens and government by",
        "allowing you to submit grievances in your preferred language.",
        "",
        "Step 1: Submit a Grievance",
        "Navigate to 'Submit New' on your dashboard. Type your grievance in any of our",
        "22+ supported languages, or use the audio recording feature.",
        "",
        "Step 2: AI Verification",
        "Our AI engine will instantly translate your grievance into English for official",
        "processing, summarize it, and predict the correct government department.",
        "",
        "Step 3: Review and Track",
        "You can review the AI-assigned department and track the status of your",
        "grievance directly from your dashboard.",
        "",
        "For any technical issues, please contact bhashaflow@technicalsupport.com"
    ]
    
    for line in lines:
        text.textLine(line)
        
    c.drawText(text)
    
    # Footer
    c.setFont("Helvetica-Oblique", 10)
    c.setFillColor(colors.gray)
    c.drawString(50, 50, "BhashaFlow Platform - Official Documentation")
    
    c.save()
    print(f"Generated PDF at {output_path}")

if __name__ == "__main__":
    out_path = os.path.join("frontend", "public", "BhashaFlow_User_Handbook.pdf")
    create_handbook(out_path)
