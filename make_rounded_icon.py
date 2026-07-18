from PIL import Image, ImageDraw

def make_circle_icon(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    
    mask = Image.new("L", img.size, 0)
    draw = ImageDraw.Draw(mask)
    
    width, height = img.size
    min_dim = min(width, height)
    left = (width - min_dim) / 2
    top = (height - min_dim) / 2
    right = (width + min_dim) / 2
    bottom = (height + min_dim) / 2
    
    draw.ellipse((left, top, right, bottom), fill=255)
    
    result = Image.new("RGBA", img.size, (0, 0, 0, 0))
    result.paste(img, (0, 0), mask=mask)
    
    result.save(output_path, "PNG")

if __name__ == "__main__":
    make_circle_icon("public/logo.png", "public/logo_rounded.png")
    print("Rounded logo created successfully!")
