from PIL import Image
import os
import shutil

src = r'C:\Users\hp\.gemini\antigravity\brain\2c362c6b-99a8-4b24-9fe2-4e9a28fa865e\media__1785373163223.jpg'
dest_logo = r'frontend\images\logo.jpg'
dest_fav_png = r'frontend\images\favicon.png'
dest_fav_ico = r'frontend\favicon.ico'
dest_fav_ico_images = r'frontend\images\favicon.ico'

if os.path.exists(src):
    shutil.copy(src, dest_logo)
    print("Copied logo to frontend/images/logo.jpg")

    img = Image.open(dest_logo)
    w, h = img.size
    print(f"Image size: {w}x{h}")

    # Crop tightly around the gold diamond icon mark
    left = int(w * 0.40)
    top = int(h * 0.27)
    right = int(w * 0.60)
    bottom = int(h * 0.45)

    diamond = img.crop((left, top, right, bottom))
    diamond.save(dest_fav_png, "PNG")
    diamond.save(dest_fav_ico, "ICO")
    shutil.copy(dest_fav_ico, dest_fav_ico_images)
    print("Favicon PNG and ICO generated successfully.")
else:
    print(f"Source file not found at {src}")
