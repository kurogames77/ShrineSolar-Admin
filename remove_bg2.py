from PIL import Image

def remove_background(input_path, output_path, tolerance=30):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    width, height = img.size

    # Get the background color from a pixel that is definitely in the background
    # Let's use coordinate (10, height//2) to avoid any white border
    bg_pixel_index = (height // 2) * width + 10
    bg_color = data[bg_pixel_index]
    print("Detected background color:", bg_color)
    
    new_data = []
    for item in data:
        # Check if the pixel is close to the background color
        if (abs(item[0] - bg_color[0]) <= tolerance and
            abs(item[1] - bg_color[1]) <= tolerance and
            abs(item[2] - bg_color[2]) <= tolerance):
            # Change to transparent
            new_data.append((255, 255, 255, 0))
        # Also remove white if it's part of the border
        elif (abs(item[0] - 255) <= 10 and abs(item[1] - 255) <= 10 and abs(item[2] - 255) <= 10):
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)

    img.putdata(new_data)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    remove_background("public/banner.jpg", "public/banner.png", tolerance=45)
    print("Background removed successfully!")
