from PIL import Image

def analyze(input_path):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    print("Top left pixel:", data[0])
    print("Center pixel:", data[img.width * (img.height // 2) + img.width // 2])
    
    # Check frequency of top left pixel
    count = sum(1 for p in data if p == data[0])
    print("Exact matches for top-left pixel:", count)
    
    # Check frequency with tolerance
    tol = 50
    count_tol = sum(1 for p in data if abs(p[0]-data[0][0]) < tol and abs(p[1]-data[0][1]) < tol and abs(p[2]-data[0][2]) < tol)
    print("Matches with tolerance 50:", count_tol)
    print("Total pixels:", len(data))

if __name__ == "__main__":
    analyze("public/banner.jpg")
