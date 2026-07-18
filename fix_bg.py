from PIL import Image
import sys

def main():
    img = Image.open('public/banner.png').convert('RGBA')
    data = img.getdata()
    
    # Yellow background color
    target = (247, 231, 182)
    tolerance = 50
    
    new_data = []
    for p in data:
        if p[3] > 0 and abs(p[0] - target[0]) < tolerance and abs(p[1] - target[1]) < tolerance and abs(p[2] - target[2]) < tolerance:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(p)
            
    img.putdata(new_data)
    img.save('public/banner.png', 'PNG')
    print("Done")

if __name__ == '__main__':
    main()
